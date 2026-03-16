import { Request, Response, NextFunction } from 'express';
import { signService } from './sign.service';
import { success, error, ErrorCode } from '../../shared/utils';
import { AuthRequest } from '../../shared/middleware';

export class SignController {
  // 发起签署
  async initiateSign(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const { contractId } = req.body;
      
      if (!contractId) {
        return res.json(error(ErrorCode.BAD_REQUEST, 'Contract ID is required'));
      }
      
      const contract = await signService.initiateSign(userId, contractId);
      res.json(success(contract, 'Sign initiated'));
    } catch (err) {
      next(err);
    }
  }
  
  // 获取签署 URL
  async getSignUrl(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { contractId, signerId } = req.params;
      
      if (!signerId) {
        return res.json(error(ErrorCode.BAD_REQUEST, 'Signer ID is required'));
      }
      
      const { url } = await signService.getSignUrl(contractId, signerId);
      res.json(success({ url }));
    } catch (err) {
      next(err);
    }
  }
  
  // 签署回调（无需认证，契约锁回调）
  async callback(req: Request, res: Response, next: NextFunction) {
    try {
      console.log('Sign callback received:', req.body);
      
      const result = await signService.handleCallback(req.body);
      res.json(success(result, 'Callback processed'));
    } catch (err) {
      next(err);
    }
  }
  
  // 查询签署状态
  async getSignStatus(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const { contractId } = req.params;
      
      const result = await signService.getSignStatus(userId, contractId);
      res.json(success(result));
    } catch (err) {
      next(err);
    }
  }
}

export const signController = new SignController();
