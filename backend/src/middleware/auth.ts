import { Response, NextFunction } from 'express'
import { AuthRequest } from '../types'
import { verifyToken } from '../utils/jwt'
import prisma from '../prisma'

export async function authMiddleware(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: '未提供认证令牌'
      })
    }

    const token = authHeader.substring(7)
    const payload = verifyToken(token)

    if (!payload) {
      return res.status(401).json({
        success: false,
        message: '令牌无效或已过期'
      })
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: {
        id: true,
        phone: true,
        name: true,
        email: true,
        status: true
      }
    })

    if (!user) {
      return res.status(401).json({
        success: false,
        message: '用户不存在'
      })
    }

    if (user.status === 'BANNED') {
      return res.status(403).json({
        success: false,
        message: '账户已被禁用'
      })
    }

    req.userId = user.id
    req.user = user
    next()
  } catch (error) {
    console.error('Auth middleware error:', error)
    return res.status(500).json({
      success: false,
      message: '认证过程出错'
    })
  }
}

export const authenticate = authMiddleware;
