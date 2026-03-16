import { Router } from 'express';
import { templateController } from './template.controller';
import { authMiddleware } from '../../shared/middleware';

const router = Router();

// 所有接口都需要认证
router.use(authMiddleware);

// CRUD
router.post('/', templateController.create);
router.get('/', templateController.list);
router.get('/:id', templateController.getById);
router.patch('/:id', templateController.update);
router.delete('/:id', templateController.delete);

// 使用模板创建合同
router.post('/:id/use', templateController.useTemplate);

export default router;
