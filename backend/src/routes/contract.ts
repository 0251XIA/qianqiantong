import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate } from '../middleware/auth';
import { v4 as uuidv4 } from 'uuid';

const router = Router();
const prisma = new PrismaClient();

// 获取合同列表
router.get('/', authenticate, async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;
    
    const where: any = { userId: req.user!.id };
    if (status) {
      where.status = status;
    }
    
    const [contracts, total] = await Promise.all([
      prisma.contract.findMany({
        where,
        include: {
          platform: true,
          signers: true
        },
        orderBy: { createdAt: 'desc' },
        skip: (Number(page) - 1) * Number(limit),
        take: Number(limit)
      }),
      prisma.contract.count({ where })
    ]);
    
    res.json({
      list: contracts,
      total,
      page: Number(page),
      limit: Number(limit)
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch contracts' });
  }
});

// 获取合同详情
router.get('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    
    const contract = await prisma.contract.findFirst({
      where: { id, userId: req.user!.id },
      include: {
        platform: true,
        signers: true,
        signatures: true,
        logs: {
          orderBy: { createdAt: 'desc' }
        }
      }
    });
    
    if (!contract) {
      return res.status(404).json({ error: 'Contract not found' });
    }
    
    res.json(contract);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch contract' });
  }
});

// 创建合同
router.post('/', authenticate, async (req, res) => {
  try {
    const { title, templateId, platformId, signers, signDeadline } = req.body;
    
    // 验证平台归属
    if (platformId) {
      const platform = await prisma.platformConfig.findFirst({
        where: { id: platformId, userId: req.user!.id }
      });
      if (!platform) {
        return res.status(400).json({ error: 'Invalid platform' });
      }
    }
    
    // 创建合同
    const contract = await prisma.contract.create({
      data: {
        title,
        templateId,
        platformId,
        signDeadline: signDeadline ? new Date(signDeadline) : null,
        status: 'PENDING',
        userId: req.user!.id,
        // 模拟生成第三方平台流程ID
        platformFlowId: `FLOW_${uuidv4().slice(0, 8)}`
      }
    });
    
    // 添加签署方
    if (signers && signers.length > 0) {
      await prisma.contractSigner.createMany({
        data: signers.map((signer: any, index: number) => ({
          contractId: contract.id,
          signerType: signer.signerType || 'person', // person | company
          name: signer.name,
          companyName: signer.companyName || null, // 企业名称
          handlerName: signer.handlerName || null, // 经办人姓名
          phone: signer.phone,
          email: signer.email,
          identityType: signer.identityType || (signer.signerType === 'ENTERPRISE' ? 'ENTERPRISE' : 'PHONE'),
          signOrder: index + 1,
          status: 'PENDING'
        }))
      });
    }
    
    // 添加操作日志
    await prisma.contractLog.create({
      data: {
        contractId: contract.id,
        action: 'CREATE',
        operator: req.user!.id,
        content: '创建合同'
      }
    });
    
    res.json(contract);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create contract' });
  }
});

// 更新合同
router.put('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, status } = req.body;
    
    const contract = await prisma.contract.findFirst({
      where: { id, userId: req.user!.id }
    });
    
    if (!contract) {
      return res.status(404).json({ error: 'Contract not found' });
    }
    
    const updated = await prisma.contract.update({
      where: { id },
      data: { title, status }
    });
    
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update contract' });
  }
});

// 删除合同
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    
    await prisma.contract.delete({
      where: { id }
    });
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete contract' });
  }
});

// 发起签署（模拟调用第三方平台）
router.post('/:id/sign', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    
    const contract = await prisma.contract.findFirst({
      where: { id, userId: req.user!.id },
      include: { signers: true }
    });
    
    if (!contract) {
      return res.status(404).json({ error: 'Contract not found' });
    }
    
    // 更新合同状态
    await prisma.contract.update({
      where: { id },
      data: { status: 'PENDING' }
    });
    
    // 添加操作日志
    await prisma.contractLog.create({
      data: {
        contractId: contract.id,
        action: 'SIGN',
        operator: req.user!.id,
        content: `发起签署，等待 ${contract.signers.length} 方签署`
      }
    });
    
    res.json({ 
      success: true, 
      message: '签署请求已发送',
      platformFlowId: contract.platformFlowId
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to initiate signing' });
  }
});

export default router;
