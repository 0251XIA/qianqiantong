import { Request, Response, NextFunction } from 'express';
import { userService } from './user.service';
import { success, error, ErrorCode } from '../../shared/utils';
import { AuthRequest } from '../../shared/middleware';

export class UserController {
  // 获取当前用户详情
  async getCurrentUser(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const user = await userService.getUserById(userId);
      res.json(success(user));
    } catch (err) {
      next(err);
    }
  }
  
  // 创建企业账户
  async createEnterprise(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const { name, licenseCode, legalPerson } = req.body;
      
      if (!name) {
        return res.json(error(ErrorCode.BAD_REQUEST, 'Enterprise name is required'));
      }
      
      const enterprise = await userService.createEnterprise(userId, { name, licenseCode, legalPerson });
      res.json(success(enterprise, 'Enterprise created'));
    } catch (err) {
      next(err);
    }
  }
  
  // 获取企业信息
  async getEnterprise(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const enterprise = await userService.getEnterprise(userId);
      res.json(success(enterprise));
    } catch (err) {
      next(err);
    }
  }
  
  // 邀请企业成员
  async inviteMember(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const ownerId = req.user!.id;
      const { phone, name, role } = req.body;
      
      if (!phone || !name) {
        return res.json(error(ErrorCode.BAD_REQUEST, 'Phone and name are required'));
      }
      
      const member = await userService.inviteMember(ownerId, { phone, name, role });
      res.json(success(member, 'Member invited'));
    } catch (err) {
      next(err);
    }
  }
  
  // 获取企业成员列表
  async getMembers(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const ownerId = req.user!.id;
      const members = await userService.getMembers(ownerId);
      res.json(success(members));
    } catch (err) {
      next(err);
    }
  }
  
  // 移除企业成员
  async removeMember(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const ownerId = req.user!.id;
      const { memberId } = req.params;
      
      const result = await userService.removeMember(ownerId, memberId);
      res.json(success(result, 'Member removed'));
    } catch (err) {
      next(err);
    }
  }
  
  // 更新成员角色
  async updateMemberRole(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const ownerId = req.user!.id;
      const { memberId } = req.params;
      const { role } = req.body;
      
      if (!role || !['ADMIN', 'MEMBER'].includes(role)) {
        return res.json(error(ErrorCode.BAD_REQUEST, 'Invalid role'));
      }
      
      const result = await userService.updateMemberRole(ownerId, memberId, role);
      res.json(success(result, 'Role updated'));
    } catch (err) {
      next(err);
    }
  }
}

export const userController = new UserController();
