import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils';
import { prisma } from '../database';
import { createError } from './error.middleware';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    phone: string;
  };
}

// 认证中间件 - 必须登录
export async function authMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw createError('No token provided', 401, 1001);
    }
    
    const token = authHeader.substring(7);
    const payload = verifyToken(token);
    
    if (!payload || payload.type !== 'access') {
      throw createError('Invalid token', 401, 1008);
    }
    
    // 验证用户是否存在
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
    });
    
    if (!user) {
      throw createError('User not found', 401, 1006);
    }
    
    if (user.status === 'BANNED') {
      throw createError('Account has been banned', 403, 1002);
    }
    
    req.user = {
      id: user.id,
      phone: user.phone,
    };
    
    next();
  } catch (err) {
    next(err);
  }
}

// 可选认证中间件 - 有 token 就解析，没有也能通过
export async function optionalAuthMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const payload = verifyToken(token);
      
      if (payload && payload.type === 'access') {
        const user = await prisma.user.findUnique({
          where: { id: payload.userId },
        });
        
        if (user && user.status === 'ACTIVE') {
          req.user = {
            id: user.id,
            phone: user.phone,
          };
        }
      }
    }
    
    next();
  } catch {
    next();
  }
}
