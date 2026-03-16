import { Router, Request, Response } from 'express'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import prisma from '../prisma'
import { generateToken } from '../utils/jwt'
import { authMiddleware } from '../middleware/auth'

const router = Router()

// 注册验证 schema
const registerSchema = z.object({
  phone: z.string().min(11).max(11, '手机号格式不正确'),
  password: z.string().min(6, '密码至少6位'),
  name: z.string().optional(),
  email: z.string().email('邮箱格式不正确').optional().or(z.literal('')),
  accountType: z.enum(['PERSONAL', 'ENTERPRISE']).optional()
})

// 登录验证 schema
const loginSchema = z.object({
  phone: z.string().min(11).max(11),
  password: z.string().min(1, '密码不能为空')
})

// 注册
router.post('/register', async (req: Request, res: Response) => {
  try {
    const data = registerSchema.parse(req.body)

    // 检查手机号是否已注册
    const existingUser = await prisma.user.findUnique({
      where: { phone: data.phone }
    })

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: '手机号已注册'
      })
    }

    // 加密密码
    const hashedPassword = await bcrypt.hash(data.password, 10)

    // 创建用户
    const user = await prisma.user.create({
      data: {
        phone: data.phone,
        password: hashedPassword,
        name: data.name,
        email: data.email || null,
        accountType: data.accountType || 'PERSONAL'
      },
      select: {
        id: true,
        phone: true,
        name: true,
        email: true,
        accountType: true,
        createdAt: true
      }
    })

    // 生成 token
    const token = generateToken({
      userId: user.id,
      phone: user.phone
    })

    res.status(201).json({
      success: true,
      data: {
        user,
        token
      },
      message: '注册成功'
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: error.errors[0].message
      })
    }
    console.error('Register error:', error)
    res.status(500).json({
      success: false,
      message: '注册失败'
    })
  }
})

// 登录
router.post('/login', async (req: Request, res: Response) => {
  try {
    const data = loginSchema.parse(req.body)

    // 查找用户
    const user = await prisma.user.findUnique({
      where: { phone: data.phone }
    })

    if (!user || !user.password) {
      return res.status(401).json({
        success: false,
        message: '手机号或密码错误'
      })
    }

    // 验证密码
    const isValid = await bcrypt.compare(data.password, user.password)
    if (!isValid) {
      return res.status(401).json({
        success: false,
        message: '手机号或密码错误'
      })
    }

    if (user.status === 'BANNED') {
      return res.status(403).json({
        success: false,
        message: '账户已被禁用'
      })
    }

    // 生成 token
    const token = generateToken({
      userId: user.id,
      phone: user.phone
    })

    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          phone: user.phone,
          name: user.name,
          email: user.email,
          accountType: user.accountType,
          status: user.status
        },
        token
      },
      message: '登录成功'
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: error.errors[0].message
      })
    }
    console.error('Login error:', error)
    res.status(500).json({
      success: false,
      message: '登录失败'
    })
  }
})

// 获取当前用户信息
router.get('/me', authMiddleware, async (req: Request, res: Response) => {
  try {
    const authReq = req as any
    
    const user = await prisma.user.findUnique({
      where: { id: authReq.userId },
      select: {
        id: true,
        phone: true,
        name: true,
        email: true,
        avatar: true,
        accountType: true,
        status: true,
        realNameVerified: true,
        enterpriseName: true,
        enterpriseCode: true,
        createdAt: true,
        updatedAt: true
      }
    })

    res.json({
      success: true,
      data: user
    })
  } catch (error) {
    console.error('Get user error:', error)
    res.status(500).json({
      success: false,
      message: '获取用户信息失败'
    })
  }
})

export default router
