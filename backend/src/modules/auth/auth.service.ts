import bcrypt from 'bcryptjs';
import { prisma } from '../../shared/database';
import { generateAccessToken, generateRefreshToken, verifyToken } from '../../shared/utils';
import { createError } from '../../shared/middleware';

export class AuthService {
  // 手机号注册
  async register(phone: string, password: string, name?: string) {
    // 检查手机号是否已存在
    const existingUser = await prisma.user.findUnique({
      where: { phone },
    });
    
    if (existingUser) {
      throw createError('Phone number already registered', 400, 2004);
    }
    
    // 加密密码
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // 创建用户
    const user = await prisma.user.create({
      data: {
        phone,
        password: hashedPassword,
        name,
        accountType: 'PERSONAL',
        status: 'ACTIVE',
      },
    });
    
    // 生成 Token
    const accessToken = generateAccessToken(user.id, user.phone);
    const refreshToken = generateRefreshToken(user.id, user.phone);
    
    return {
      user: {
        id: user.id,
        phone: user.phone,
        name: user.name,
        email: user.email,
        accountType: user.accountType,
      },
      accessToken,
      refreshToken,
    };
  }
  
  // 账号密码登录
  async login(phone: string, password: string) {
    const user = await prisma.user.findUnique({
      where: { phone },
    });
    
    if (!user) {
      throw createError('Invalid phone or password', 401, 2005);
    }
    
    if (!user.password) {
      throw createError('Please use phone verification code to login', 400, 2005);
    }
    
    const isPasswordValid = await bcrypt.compare(password, user.password);
    
    if (!isPasswordValid) {
      throw createError('Invalid phone or password', 401, 2005);
    }
    
    if (user.status === 'BANNED') {
      throw createError('Account has been banned', 403, 1002);
    }
    
    // 生成 Token
    const accessToken = generateAccessToken(user.id, user.phone);
    const refreshToken = generateRefreshToken(user.id, user.phone);
    
    return {
      user: {
        id: user.id,
        phone: user.phone,
        name: user.name,
        email: user.email,
        accountType: user.accountType,
      },
      accessToken,
      refreshToken,
    };
  }
  
  // 刷新 Token
  async refreshToken(refreshToken: string) {
    const payload = verifyToken(refreshToken);
    
    if (!payload || payload.type !== 'refresh') {
      throw createError('Invalid refresh token', 401, 1008);
    }
    
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
    });
    
    if (!user || user.status === 'BANNED') {
      throw createError('User not found or banned', 401, 1006);
    }
    
    const newAccessToken = generateAccessToken(user.id, user.phone);
    const newRefreshToken = generateRefreshToken(user.id, user.phone);
    
    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    };
  }
  
  // 获取当前用户信息
  async getProfile(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        phone: true,
        email: true,
        name: true,
        avatar: true,
        accountType: true,
        status: true,
        createdAt: true,
      },
    });
    
    if (!user) {
      throw createError('User not found', 404, 2006);
    }
    
    return user;
  }
  
  // 更新用户信息
  async updateProfile(userId: string, data: { name?: string; email?: string; avatar?: string }) {
    const user = await prisma.user.update({
      where: { id: userId },
      data,
      select: {
        id: true,
        phone: true,
        email: true,
        name: true,
        avatar: true,
        accountType: true,
        status: true,
      },
    });
    
    return user;
  }
  
  // 修改密码
  async changePassword(userId: string, oldPassword: string, newPassword: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });
    
    if (!user || !user.password) {
      throw createError('User not found or no password set', 400, 2006);
    }
    
    const isPasswordValid = await bcrypt.compare(oldPassword, user.password);
    
    if (!isPasswordValid) {
      throw createError('Old password is incorrect', 400, 2005);
    }
    
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });
    
    return { message: 'Password changed successfully' };
  }
}

export const authService = new AuthService();
