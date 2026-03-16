import { Router } from 'express';
import { userController } from './user.controller';
import { authMiddleware } from '../../shared/middleware';

const router = Router();

// 所有接口都需要认证
router.use(authMiddleware);

// 获取当前用户信息
router.get('/me', userController.getCurrentUser);

// 企业相关
router.post('/enterprise', userController.createEnterprise);
router.get('/enterprise', userController.getEnterprise);
router.get('/enterprise/members', userController.getMembers);
router.post('/enterprise/members/invite', userController.inviteMember);
router.delete('/enterprise/members/:memberId', userController.removeMember);
router.patch('/enterprise/members/:memberId/role', userController.updateMemberRole);

export default router;
