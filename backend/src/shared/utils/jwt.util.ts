import jwt from 'jsonwebtoken';
import { config } from '../config';

export interface JwtPayload {
  userId: string;
  phone: string;
  type: 'access' | 'refresh';
}

// 生成 Token
export function generateToken(payload: Omit<JwtPayload, 'type'>, type: 'access' | 'refresh'): string {
  const expiresIn = type === 'access' ? config.jwt.accessTokenExpire : config.jwt.refreshTokenExpire;
  
  return jwt.sign(
    { ...payload, type },
    config.jwt.secret,
    { expiresIn }
  );
}

// 生成 Access Token
export function generateAccessToken(userId: string, phone: string): string {
  return generateToken({ userId, phone }, 'access');
}

// 生成 Refresh Token
export function generateRefreshToken(userId: string, phone: string): string {
  return generateToken({ userId, phone }, 'refresh');
}

// 验证 Token
export function verifyToken(token: string): JwtPayload | null {
  try {
    const decoded = jwt.verify(token, config.jwt.secret) as JwtPayload;
    return decoded;
  } catch {
    return null;
  }
}

// 从 Token 获取用户 ID
export function getUserIdFromToken(token: string): string | null {
  const payload = verifyToken(token);
  return payload?.userId || null;
}
