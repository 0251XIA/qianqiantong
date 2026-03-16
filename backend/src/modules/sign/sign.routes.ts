import { Router } from 'express';
import { signController } from './sign.controller';
import { authMiddleware } from '../../shared/middleware';

const router = Router();

// 发起签署（需要认证）
router.post('/initiate', authMiddleware, signController.initiateSign);

// 获取签署 URL（需要认证）
router.get('/:contractId/signers/:signerId/url', authMiddleware, signController.getSignUrl);

// 签署回调（无需认证，契约锁回调）
router.post('/callback', signController.callback);

// 查询签署状态（需要认证）
router.get('/:contractId/status', authMiddleware, signController.getSignStatus);

export default router;
