import { Router } from 'express';
import { contractController } from './contract.controller';
import { authMiddleware } from '../../shared/middleware';

const router = Router();

// 所有接口都需要认证
router.use(authMiddleware);

// CRUD
router.post('/', contractController.create);
router.get('/', contractController.list);
router.get('/:id', contractController.getById);
router.patch('/:id', contractController.update);
router.delete('/:id', contractController.delete);

// 签署方管理
router.post('/:id/signers', contractController.addSigner);
router.delete('/:id/signers/:signerId', contractController.removeSigner);

// 合同操作
router.post('/:id/send', contractController.sendContract);
router.post('/:id/cancel', contractController.cancelContract);

export default router;
