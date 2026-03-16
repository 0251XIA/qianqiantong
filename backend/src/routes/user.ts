import { Router, Request, Response } from 'express'
import { z } from 'zod'
import prisma from '../prisma'
import { authMiddleware } from '../middleware/auth'

const router = Router()

// 更新用户信息
router.put('/me', authMiddleware, async (req: Request, res: Response) => {
  try {
    const authReq = req as any
    const { name, email, avatar, enterpriseName, enterpriseCode, idCard } = req.body

    const user = await prisma.user.update({
      where: { id: authReq.userId },
      data: {
        name,
        email,
        avatar,
        enterpriseName,
        enterpriseCode,
        idCard
      },
      select: {
        id: true,
        phone: true,
        name: true,
        email: true,
        avatar: true,
        accountType: true,
        status: true,
        realNameVerified: true,
        enterpriseName: true,
        enterpriseCode: true,
        createdAt: true
      }
    })

    res.json({
      success: true,
      data: user,
      message: '更新成功'
    })
  } catch (error) {
    console.error('Update user error:', error)
    res.status(500).json({
      success: false,
      message: '更新失败'
    })
  }
})

// 获取用户统计信息
router.get('/stats', authMiddleware, async (req: Request, res: Response) => {
  try {
    const authReq = req as any
    
    const [contractCount, templateCount, platformCount] = await Promise.all([
      prisma.contract.count({ where: { userId: authReq.userId } }),
      prisma.template.count({ where: { userId: authReq.userId } }),
      prisma.platformConfig.count({ where: { userId: authReq.userId } })
    ])

    // 合同状态统计
    const statusStats = await prisma.contract.groupBy({
      by: ['status'],
      where: { userId: authReq.userId },
      _count: true
    })

    const statusMap: Record<string, number> = {}
    statusStats.forEach(stat => {
      statusMap[stat.status] = stat._count
    })

    res.json({
      success: true,
      data: {
        contractCount,
        templateCount,
        platformCount,
        contractStatus: statusMap
      }
    })
  } catch (error) {
    console.error('Get stats error:', error)
    res.status(500).json({
      success: false,
      message: '获取统计信息失败'
    })
  }
})

// 修改密码
router.post('/change-password', authMiddleware, async (req: Request, res: Response) => {
  try {
    const authReq = req as any
    const { oldPassword, newPassword } = req.body

    if (!oldPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: '请提供旧密码和新密码'
      })
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: '新密码至少6位'
      })
    }

    const user = await prisma.user.findUnique({
      where: { id: authReq.userId }
    })

    if (!user || !user.password) {
      return res.status(400).json({
        success: false,
        message: '用户不存在或未设置密码'
      })
    }

    // 验证旧密码
    const bcrypt = require('bcryptjs')
    const isValid = await bcrypt.compare(oldPassword, user.password)
    if (!isValid) {
      return res.status(400).json({
        success: false,
        message: '旧密码错误'
      })
    }

    // 更新密码
    const hashedPassword = await bcrypt.hash(newPassword, 10)
    await prisma.user.update({
      where: { id: authReq.userId },
      data: { password: hashedPassword }
    })

    res.json({
      success: true,
      message: '密码修改成功'
    })
  } catch (error) {
    console.error('Change password error:', error)
    res.status(500).json({
      success: false,
      message: '修改密码失败'
    })
  }
})

export default router
