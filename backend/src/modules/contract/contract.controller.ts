import { Request, Response, NextFunction } from 'express';
import { contractService } from './contract.service';
import { success, error, ErrorCode, paginatedSuccess } from '../../shared/utils';
import { AuthRequest } from '../../shared/middleware';

export class ContractController {
  // 创建合同
  async create(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const { title, fileUrl, fileKey, templateId, signDeadline, signers } = req.body;
      
      if (!title) {
        return res.json(error(ErrorCode.BAD_REQUEST, 'Title is required'));
      }
      
      const contract = await contractService.create(userId, {
        title,
        fileUrl,
        fileKey,
        templateId,
        signDeadline: signDeadline ? new Date(signDeadline) : undefined,
        signers,
      });
      
      res.json(success(contract, 'Contract created'));
    } catch (err) {
      next(err);
    }
  }
  
  // 合同列表
  async list(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const { page, pageSize, status, keyword } = req.query;
      
      const result = await contractService.list(userId, {
        page: parseInt(page as string) || 1,
        pageSize: parseInt(pageSize as string) || 10,
        status: status as string,
        keyword: keyword as string,
      });
      
      res.json(paginatedSuccess(result.contracts, result.total, result.page, result.pageSize));
    } catch (err) {
      next(err);
    }
  }
  
  // 合同详情
  async getById(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const { id } = req.params;
      
      const contract = await contractService.getById(userId, id);
      res.json(success(contract));
    } catch (err) {
      next(err);
    }
  }
  
  // 更新合同
  async update(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const { id } = req.params;
      const { title, fileUrl, signDeadline } = req.body;
      
      const contract = await contractService.update(userId, id, {
        title,
        fileUrl,
        signDeadline: signDeadline ? new Date(signDeadline) : undefined,
      });
      
      res.json(success(contract, 'Contract updated'));
    } catch (err) {
      next(err);
    }
  }
  
  // 删除合同
  async delete(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const { id } = req.params;
      
      const result = await contractService.delete(userId, id);
      res.json(success(result, 'Contract deleted'));
    } catch (err) {
      next(err);
    }
  }
  
  // 添加签署方
  async addSigner(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const { id } = req.params;
      const { name, phone, email, signOrder } = req.body;
      
      if (!name || !signOrder) {
        return res.json(error(ErrorCode.BAD_REQUEST, 'Name and signOrder are required'));
      }
      
      const signer = await contractService.addSigner(userId, id, {
        name,
        phone,
        email,
        signOrder,
      });
      
      res.json(success(signer, 'Signer added'));
    } catch (err) {
      next(err);
    }
  }
  
  // 移除签署方
  async removeSigner(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const { id, signerId } = req.params;
      
      const result = await contractService.removeSigner(userId, id, signerId);
      res.json(success(result, 'Signer removed'));
    } catch (err) {
      next(err);
    }
  }
  
  // 发起签署
  async sendContract(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const { id } = req.params;
      
      const contract = await contractService.sendContract(id, userId);
      res.json(success(contract, 'Contract sent for signing'));
    } catch (err) {
      next(err);
    }
  }
  
  // 取消合同
  async cancelContract(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const { id } = req.params;
      
      const contract = await contractService.cancelContract(userId, id);
      res.json(success(contract, 'Contract cancelled'));
    } catch (err) {
      next(err);
    }
  }
}

export const contractController = new ContractController();
