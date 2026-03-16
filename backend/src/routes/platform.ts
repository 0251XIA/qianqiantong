import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

// 获取用户的所有平台配置
router.get('/', authenticate, async (req, res) => {
  try {
    const platforms = await prisma.platformConfig.findMany({
      where: { userId: req.user!.id },
      orderBy: { createdAt: 'desc' }
    });
    res.json(platforms);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch platforms' });
  }
});

// 添加平台配置
router.post('/', authenticate, async (req, res) => {
  try {
    const { name, platform, apiUrl, appId, appSecret, isDefault } = req.body;
    
    // 如果设为默认，先取消其他默认
    if (isDefault) {
      await prisma.platformConfig.updateMany({
        where: { userId: req.user!.id, isDefault: true },
        data: { isDefault: false }
      });
    }
    
    const config = await prisma.platformConfig.create({
      data: {
        name,
        platform,
        apiUrl,
        appId,
        appSecret,
        isDefault: isDefault || false,
        userId: req.user!.id
      }
    });
    
    res.json(config);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create platform config' });
  }
});

// 更新平台配置
router.put('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, apiUrl, appId, appSecret, enabled, isDefault } = req.body;
    
    // 验证归属
    const existing = await prisma.platformConfig.findFirst({
      where: { id, userId: req.user!.id }
    });
    
    if (!existing) {
      return res.status(404).json({ error: 'Platform not found' });
    }
    
    // 如果设为默认，先取消其他默认
    if (isDefault) {
      await prisma.platformConfig.updateMany({
        where: { userId: req.user!.id, isDefault: true, id: { not: id } },
        data: { isDefault: false }
      });
    }
    
    const config = await prisma.platformConfig.update({
      where: { id },
      data: { name, apiUrl, appId, appSecret, enabled, isDefault }
    });
    
    res.json(config);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update platform config' });
  }
});

// 删除平台配置
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    
    await prisma.platformConfig.delete({
      where: { id }
    });
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete platform config' });
  }
});

// 测试平台连接（模拟）
router.post('/:id/test', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    
    const config = await prisma.platformConfig.findFirst({
      where: { id, userId: req.user!.id }
    });
    
    if (!config) {
      return res.status(404).json({ error: 'Platform not found' });
    }
    
    // 模拟测试连接（实际应调用各平台API）
    res.json({ 
      success: true, 
      message: `连接 ${config.name} 成功`,
      platform: config.platform 
    });
  } catch (error) {
    res.status(500).json({ error: 'Connection test failed' });
  }
});

export default router;
