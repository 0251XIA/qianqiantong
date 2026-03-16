import { Router } from 'express';
import { paymentController } from './payment.controller';
import { authMiddleware, optionalAuthMiddleware } from '../../shared/middleware';

const router = Router();

// 套餐列表（公开）
router.get('/packages', paymentController.getPackages);
router.get('/packages/:id', paymentController.getPackage);

// 订单相关（需要认证）
router.use(authMiddleware);

// 创建订单
router.post('/orders', paymentController.createOrder);

// 订单列表
router.get('/orders', paymentController.getOrders);

// 订单详情
router.get('/orders/:id', paymentController.getOrder);

// 模拟支付（演示用）
router.post('/orders/:id/pay', paymentController.simulatePay);

// 当前套餐
router.get('/my/package', paymentController.getUserPackage);

export default router;
