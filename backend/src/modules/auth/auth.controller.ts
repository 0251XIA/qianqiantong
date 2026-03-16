import { Request, Response, NextFunction } from 'express';
import { authService } from './auth.service';
import { success, error, ErrorCode } from '../../shared/utils';
import { AuthRequest } from '../../shared/middleware';

export class AuthController {
  // 手机号注册
  async register(req: Request, res: Response, next: NextFunction) {
    try {
      const { phone, password, name } = req.body;
      
      if (!phone || !password) {
        return res.json(error(ErrorCode.BAD_REQUEST, 'Phone and password are required'));
      }
      
      // 简单手机号验证
      if (!/^1[3-9]\d{9}$/.test(phone)) {
        return res.json(error(ErrorCode.INVALID_PHONE, 'Invalid phone number'));
      }
      
      // 密码长度验证
      if (password.length < 6) {
        return res.json(error(ErrorCode.BAD_REQUEST, 'Password must be at least 6 characters'));
      }
      
      const result = await authService.register(phone, password, name);
      
      res.json(success(result, 'Registration successful'));
    } catch (err) {
      next(err);
    }
  }
  
  // 账号密码登录
  async login(req: Request, res: Response, next: NextFunction) {
    try {
      const { phone, password } = req.body;
      
      if (!phone || !password) {
        return res.json(error(ErrorCode.BAD_REQUEST, 'Phone and password are required'));
      }
      
      const result = await authService.login(phone, password);
      
      res.json(success(result, 'Login successful'));
    } catch (err) {
      next(err);
    }
  }
  
  // 刷新 Token
  async refreshToken(req: Request, res: Response, next: NextFunction) {
    try {
      const { refreshToken } = req.body;
      
      if (!refreshToken) {
        return res.json(error(ErrorCode.BAD_REQUEST, 'Refresh token is required'));
      }
      
      const result = await authService.refreshToken(refreshToken);
      
      res.json(success(result, 'Token refreshed'));
    } catch (err) {
      next(err);
    }
  }
  
  // 获取当前用户信息
  async getProfile(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      
      const user = await authService.getProfile(userId);
      
      res.json(success(user));
    } catch (err) {
      next(err);
    }
  }
  
  // 更新当前用户信息
  async updateProfile(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const { name, email, avatar } = req.body;
      
      const user = await authService.updateProfile(userId, { name, email, avatar });
      
      res.json(success(user, 'Profile updated'));
    } catch (err) {
      next(err);
    }
  }
  
  // 修改密码
  async changePassword(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const { oldPassword, newPassword } = req.body;
      
      if (!oldPassword || !newPassword) {
        return res.json(error(ErrorCode.BAD_REQUEST, 'Old password and new password are required'));
      }
      
      if (newPassword.length < 6) {
        return res.json(error(ErrorCode.BAD_REQUEST, 'Password must be at least 6 characters'));
      }
      
      const result = await authService.changePassword(userId, oldPassword, newPassword);
      
      res.json(success(result, 'Password changed'));
    } catch (err) {
      next(err);
    }
  }
}

export const authController = new AuthController();
