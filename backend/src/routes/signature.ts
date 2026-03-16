import { Router, Response } from 'express'
import { z } from 'zod'
import prisma from '../prisma'
import { authMiddleware } from '../middleware/auth'
import { QiyueSuoAdapter, qiyuesuoAdapter } from '../adapters/qiyuesuo'
import { v4 as uuidv4 } from 'uuid'

const router = Router()

// 获取平台适配器
function getPlatformAdapter(platformConfig: any): QiyueSuoAdapter | null {
  if (!platformConfig) return null
  
  // 目前只支持契约锁
  if (platformConfig.platform === 'qiyuesuo') {
    return new QiyueSuoAdapter({
      token: platformConfig.appId,
      secret: platformConfig.appSecret,
      baseUrl: platformConfig.apiUrl,
      tenantId: platformConfig.appId
    })
  }
  
  return null
}

// 发起签署验证 schema
const initiateSignSchema = z.object({
  contractId: z.string().min(1, '合同ID不能为空'),
  signers: z.array(z.object({
    signerId: z.string().min(1, '签署方ID不能为空'),
    signType: z.enum(['HANDWRITTEN', 'UPLOAD', 'AUTO_SIGN', 'FACE_SIGN']),
    signImageUrl: z.string().optional(),
    signPosition: z.string().optional() // JSON string {page, x, y}
  })).min(1, '至少需要一个签署方')
})

// 上传合同文件并创建流程
router.post('/upload-and-initiate', authMiddleware, async (req: any, res: Response) => {
  try {
    const { contractId, fileUrl, fileName } = req.body

    if (!contractId || !fileUrl || !fileName) {
      return res.status(400).json({
        success: false,
        message: '缺少必要参数：contractId, fileUrl, fileName'
      })
    }

    // 验证合同
    const contract = await prisma.contract.findFirst({
      where: { id: contractId, userId: req.userId },
      include: {
        platform: true,
        signers: true
      }
    })

    if (!contract) {
      return res.status(404).json({
        success: false,
        message: '合同不存在'
      })
    }

    // 只能对草稿的合同发起签署
    if (contract.status !== 'DRAFT') {
      return res.status(400).json({
        success: false,
        message: '当前状态不允许发起签署'
      })
    }

    let platformFileKey = contract.fileKey
    let platformFlowId = contract.platformFlowId
    let adapter: QiyueSuoAdapter | null = null

    // 如果有平台配置，调用第三方API
    if (contract.platformId && contract.platform) {
      adapter = getPlatformAdapter(contract.platform)
      
      if (adapter) {
        try {
          // 1. 上传文件到契约锁
          console.log('[Signature] Uploading file to QiyueSuo...')
          const uploadResult = await adapter.uploadFile(fileUrl, fileName)
          platformFileKey = uploadResult.fileKey
          console.log('[Signature] File uploaded, key:', platformFileKey)

          // 2. 创建签署流程
          console.log('[Signature] Creating flow on QiyueSuo...')
          const flowResult = await adapter.createFlow(
            contractId,
            contract.title,
            platformFileKey,
            contract.signers.map(s => ({
              name: s.name,
              phone: s.phone || undefined,
              email: s.email || undefined,
              identityType: s.identityType as any,
              signOrder: s.signOrder
            }))
          )
          platformFlowId = flowResult.flowId
          console.log('[Signature] Flow created, id:', platformFlowId)

          // 3. 发起签署
          console.log('[Signature] Sending sign request...')
          await adapter.sendSign(platformFlowId)
          console.log('[Signature] Sign request sent')
        } catch (apiError: any) {
          console.error('[Signature] QiyueSuo API error:', apiError)
          return res.status(500).json({
            success: false,
            message: `契约锁签署失败: ${apiError.message}`
          })
        }
      }
    }

    // 更新合同状态
    await prisma.contract.update({
      where: { id: contractId },
      data: {
        status: 'PENDING',
        fileUrl,
        fileKey: platformFileKey,
        platformFlowId
      }
    })

    // 记录日志
    await prisma.contractLog.create({
      data: {
        contractId,
        action: 'INITIATE',
        operator: req.userId,
        content: `发起签署，共 ${contract.signers.length} 个签署方${adapter ? '（契约锁）' : '（本地）'}`
      }
    })

    res.json({
      success: true,
      data: {
        contractId,
        signerCount: contract.signers.length,
        status: 'PENDING',
        platformFlowId,
        platform: contract.platform?.platform || 'local'
      },
      message: adapter ? '已发起契约锁签署请求' : '发起签署成功'
    })
  } catch (error) {
    console.error('Upload and initiate error:', error)
    res.status(500).json({
      success: false,
      message: '发起签署失败'
    })
  }
})

// 发起签署（批量）- 仅本地处理
router.post('/initiate', authMiddleware, async (req: any, res: Response) => {
  try {
    const data = initiateSignSchema.parse(req.body)

    // 验证合同
    const contract = await prisma.contract.findFirst({
      where: { id: data.contractId, userId: req.userId },
      include: {
        platform: true,
        signers: true
      }
    })

    if (!contract) {
      return res.status(404).json({
        success: false,
        message: '合同不存在'
      })
    }

    // 只能对草稿或待签署的合同发起签署
    if (!['DRAFT', 'PENDING'].includes(contract.status)) {
      return res.status(400).json({
        success: false,
        message: '当前状态不允许发起签署'
      })
    }

    // 验证所有签署方
    const signerIds = data.signers.map(s => s.signerId)
    const signers = await prisma.contractSigner.findMany({
      where: {
        id: { in: signerIds },
        contractId: data.contractId
      }
    })

    if (signers.length !== signerIds.length) {
      return res.status(400).json({
        success: false,
        message: '部分签署方不存在'
      })
    }

    let platformFlowId = contract.platformFlowId

    // 如果有契约锁平台配置，调用契约锁API
    const adapter = getPlatformAdapter(contract.platform)
    if (adapter && contract.fileKey) {
      try {
        // 发起签署
        await adapter.sendSign(platformFlowId!)
        console.log('[Signature] QiyueSuo sign request sent')
      } catch (apiError: any) {
        console.error('[Signature] QiyueSuo API error:', apiError)
        return res.status(500).json({
          success: false,
          message: `契约锁签署失败: ${apiError.message}`
        })
      }
    }

    // 更新合同状态为待签署
    await prisma.contract.update({
      where: { id: data.contractId },
      data: { status: 'PENDING' }
    })

    // 记录日志
    await prisma.contractLog.create({
      data: {
        contractId: data.contractId,
        action: 'INITIATE',
        operator: req.userId,
        content: `发起签署，共 ${data.signers.length} 个签署方`
      }
    })

    res.json({
      success: true,
      data: {
        contractId: data.contractId,
        signerCount: data.signers.length,
        status: 'PENDING'
      },
      message: '发起签署成功'
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: error.errors[0].message
      })
    }
    console.error('Initiate sign error:', error)
    res.status(500).json({
      success: false,
      message: '发起签署失败'
    })
  }
})

// 签署验证 schema
router.post('/sign', authMiddleware, async (req: any, res: Response) => {
  try {
    const { contractId, signerId, signType, signImageUrl, signPosition } = req.body

    // 验证合同
    const contract = await prisma.contract.findFirst({
      where: { id: contractId, userId: req.userId },
      include: {
        platform: true,
        signers: {
          where: { id: signerId }
        }
      }
    }) as any

    if (!contract) {
      return res.status(404).json({
        success: false,
        message: '合同不存在'
      })
    }

    const signer = contract.signers[0]
    if (!signer) {
      return res.status(404).json({
        success: false,
        message: '签署方不存在'
      })
    }

    // 检查签署方状态
    if (signer.status === 'SIGNED') {
      return res.status(400).json({
        success: false,
        message: '该签署方已完成签署'
      })
    }

    // 如果有契约锁平台配置，调用契约锁API
    let platformSignId: string | null = null
    const adapter = getPlatformAdapter(contract.platform)
    
    if (adapter && contract.platformFlowId) {
      try {
        // 获取签署状态
        const status = await adapter.getStatus(contract.platformFlowId)
        console.log('[Signature] QiyueSuo status:', status)
        
        // 注意：实际的签署需要在契约锁H5页面完成
        // 这里只是标记本地状态
        platformSignId = `${contract.platformFlowId}_${signerId}`
      } catch (apiError: any) {
        console.error('[Signature] QiyueSuo getStatus error:', apiError)
      }
    }

    // 创建签署记录
    const signature = await prisma.$transaction(async (tx) => {
      // 创建签署记录
      const newSignature = await tx.signature.create({
        data: {
          contractId,
          signerId,
          userId: req.userId,
          signType: signType || 'HANDWRITTEN',
          signImageUrl: signImageUrl || null,
          signPosition: signPosition || null,
          platformSignId,
          ipAddress: req.ip || null,
          deviceInfo: req.headers['user-agent'] || null
        }
      })

      // 更新签署方状态
      await tx.contractSigner.update({
        where: { id: signerId },
        data: {
          status: 'SIGNED',
          signedAt: new Date()
        }
      })

      // 检查是否所有签署方都签署完成
      const allSigners = await tx.contractSigner.findMany({
        where: { contractId }
      })

      const allSigned = allSigners.every(s => s.status === 'SIGNED')
      const anyRejected = allSigners.some(s => s.status === 'REJECTED')

      // 更新合同状态
      let contractStatus = 'PARTIAL_SIGNED'
      if (allSigned) {
        contractStatus = 'COMPLETED'
        await tx.contract.update({
          where: { id: contractId },
          data: { status: 'COMPLETED', completedAt: new Date() }
        })
      } else if (anyRejected) {
        contractStatus = 'REJECTED'
        await tx.contract.update({
          where: { id: contractId },
          data: { status: 'REJECTED' }
        })
      }

      // 记录日志
      await tx.contractLog.create({
        data: {
          contractId,
          action: 'SIGN',
          operator: req.userId,
          content: `${signer.name} 完成签署`
        }
      })

      return newSignature
    })

    // 返回完整信息
    const fullSignature = await prisma.signature.findUnique({
      where: { id: signature.id },
      include: {
        contract: {
          select: { id: true, title: true, status: true }
        }
      }
    })

    res.json({
      success: true,
      data: fullSignature,
      message: '签署成功'
    })
  } catch (error) {
    console.error('Sign error:', error)
    res.status(500).json({
      success: false,
      message: '签署失败'
    })
  }
})

// 查询签署状态
router.get('/status/:contractId', authMiddleware, async (req: any, res: Response) => {
  try {
    const { contractId } = req.params

    const contract = await prisma.contract.findFirst({
      where: { id: contractId, userId: req.userId },
      include: {
        platform: true,
        signers: {
          orderBy: { signOrder: 'asc' }
        }
      }
    }) as any

    if (!contract) {
      return res.status(404).json({
        success: false,
        message: '合同不存在'
      })
    }

    // 如果有契约锁平台，同步查询平台状态
    let platformStatus: any = null
    const adapter = getPlatformAdapter(contract.platform)
    if (adapter && contract.platformFlowId) {
      try {
        platformStatus = await adapter.getStatus(contract.platformFlowId)
        console.log('[Signature] Platform status:', platformStatus)
        
        // 如果平台状态已签署但本地未同步，更新本地状态
        if (platformStatus.status === 'COMPLETED' && contract.status !== 'COMPLETED') {
          await prisma.contract.update({
            where: { id: contractId },
            data: { status: 'COMPLETED', completedAt: new Date() }
          })
        }
      } catch (apiError: any) {
        console.error('[Signature] Get platform status error:', apiError)
      }
    }

    // 计算签署进度
    const totalSigners = contract.signers.length
    const signedSigners = contract.signers.filter((s: any) => s.status === 'SIGNED').length
    const progress = totalSigners > 0 ? Math.round((signedSigners / totalSigners) * 100) : 0

    res.json({
      success: true,
      data: {
        contractId: contract.id,
        title: contract.title,
        status: contract.status,
        progress,
        totalSigners,
        signedSigners,
        platformFlowId: contract.platformFlowId,
        platformStatus,
        signers: contract.signers.map((s: any) => ({
          id: s.id,
          name: s.name,
          phone: s.phone,
          status: s.status,
          signedAt: s.signedAt,
          latestSignature: s.signatures[0] || null
        })),
        allSignatures: contract.signatures
      }
    })
  } catch (error) {
    console.error('Get sign status error:', error)
    res.status(500).json({
      success: false,
      message: '查询失败'
    })
  }
})

// 下载签署文件
router.get('/download/:contractId', authMiddleware, async (req: any, res: Response) => {
  try {
    const { contractId } = req.params
    const { type = 'pdf' } = req.query

    const contract = await prisma.contract.findFirst({
      where: { id: contractId, userId: req.userId },
      include: { platform: true }
    })

    if (!contract) {
      return res.status(404).json({
        success: false,
        message: '合同不存在'
      })
    }

    // 如果有契约锁平台，下载平台文件
    const adapter = getPlatformAdapter(contract.platform)
    if (adapter && contract.platformFlowId) {
      try {
        const buffer = await adapter.downloadFile(contract.platformFlowId, type as 'pdf' | 'zip')
        
        res.setHeader('Content-Type', type === 'zip' ? 'application/zip' : 'application/pdf')
        res.setHeader('Content-Disposition', `attachment; filename="${contract.title}_signed.${type}"`)
        res.send(buffer)
        return
      } catch (apiError: any) {
        console.error('[Signature] Download error:', apiError)
        return res.status(500).json({
          success: false,
          message: `下载失败: ${apiError.message}`
        })
      }
    }

    // 本地文件直接返回
    if (contract.fileUrl) {
      return res.redirect(contract.fileUrl)
    }

    res.status(404).json({
      success: false,
      message: '文件不存在'
    })
  } catch (error) {
    console.error('Download error:', error)
    res.status(500).json({
      success: false,
      message: '下载失败'
    })
  }
})

// 签署方拒绝
router.post('/reject', authMiddleware, async (req: any, res: Response) => {
  try {
    const { contractId, signerId, reason } = req.body

    // 验证合同和签署方
    const contract = await prisma.contract.findFirst({
      where: { id: contractId, userId: req.userId },
      include: { platform: true }
    })

    if (!contract) {
      return res.status(404).json({
        success: false,
        message: '合同不存在'
      })
    }

    const signer = await prisma.contractSigner.findFirst({
      where: { id: signerId, contractId }
    })

    if (!signer) {
      return res.status(404).json({
        success: false,
        message: '签署方不存在'
      })
    }

    // 更新签署方状态
    await prisma.contractSigner.update({
      where: { id: signerId },
      data: { status: 'REJECTED' }
    })

    // 更新合同状态
    await prisma.contract.update({
      where: { id: contractId },
      data: { status: 'REJECTED' }
    })

    // 记录日志
    await prisma.contractLog.create({
      data: {
        contractId,
        action: 'REJECT',
        operator: req.userId,
        content: reason || `${signer.name} 拒绝签署`
      }
    })

    res.json({
      success: true,
      message: '已拒绝签署'
    })
  } catch (error) {
    console.error('Reject sign error:', error)
    res.status(500).json({
      success: false,
      message: '操作失败'
    })
  }
})

// 契约锁回调接口（用于接收签署结果通知）
router.post('/callback/qiyuesuo', async (req: any, res: Response) => {
  try {
    const { flowId, businessId, status, signatories } = req.body
    
    console.log('[Signature] QiyueSuo callback:', req.body)

    if (!businessId) {
      return res.status(400).json({
        success: false,
        message: '缺少业务ID'
      })
    }

    // 查找对应的合同
    const contract = await prisma.contract.findFirst({
      where: { platformFlowId: flowId }
    })

    if (!contract) {
      console.log('[Signature] Contract not found for flowId:', flowId)
      return res.json({ success: true, message: 'Contract not found' })
    }

    // 处理签署方状态更新
    if (signatories && Array.isArray(signatories)) {
      for (const s of signatories) {
        const signer = await prisma.contractSigner.findFirst({
          where: { 
            contractId: contract.id,
            name: s.name
          }
        })

        if (signer) {
          const signerStatus = s.status === 'SIGNED' || s.status === 'COMPLETE' ? 'SIGNED' : 
                               s.status === 'REJECTED' || s.status === 'DECLINED' ? 'REJECTED' : 'PENDING'
          
          if (signerStatus === 'SIGNED' && signer.status !== 'SIGNED') {
            await prisma.contractSigner.update({
              where: { id: signer.id },
              data: { 
                status: 'SIGNED',
                signedAt: s.signTime ? new Date(s.signTime) : new Date(),
                platformSignerId: s.signatoryId
              }
            })
          }
        }
      }
    }

    // 更新合同状态
    const allSigners = await prisma.contractSigner.findMany({
      where: { contractId: contract.id }
    })

    const allSigned = allSigners.every(s => s.status === 'SIGNED')
    const anyRejected = allSigners.some(s => s.status === 'REJECTED')

    if (allSigned) {
      await prisma.contract.update({
        where: { id: contract.id },
        data: { status: 'COMPLETED', completedAt: new Date() }
      })
      
      await prisma.contractLog.create({
        data: {
          contractId: contract.id,
          action: 'COMPLETE',
          operator: 'SYSTEM',
          content: '所有签署方已完成签署（契约锁回调）'
        }
      })
    } else if (anyRejected) {
      await prisma.contract.update({
        where: { id: contract.id },
        data: { status: 'REJECTED' }
      })
    } else {
      await prisma.contract.update({
        where: { id: contract.id },
        data: { status: 'PARTIAL_SIGNED' }
      })
    }

    res.json({ success: true, message: 'Callback processed' })
  } catch (error) {
    console.error('Callback error:', error)
    res.status(500).json({
      success: false,
      message: 'Callback processing failed'
    })
  }
})

export default router
