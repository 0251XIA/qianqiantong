import { Router } from 'express';
import { authController } from './auth.controller';
import { authMiddleware } from '../../shared/middleware';

const router = Router();

// 注册
router.post('/register', authController.register);

// 登录
router.post('/login', authController.login);

// 刷新 Token
router.post('/refresh-token', authController.refreshToken);

// 获取当前用户信息（需要认证）
router.get('/profile', authMiddleware, authController.getProfile);

// 更新当前用户信息（需要认证）
router.patch('/profile', authMiddleware, authController.updateProfile);

// 修改密码（需要认证）
router.post('/change-password', authMiddleware, authController.changePassword);

export default router;
