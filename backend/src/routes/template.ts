import { Router, Request, Response } from 'express'
import { z } from 'zod'
import prisma from '../prisma'
import { authMiddleware } from '../middleware/auth'

const router = Router()

// 模板验证 schema
const templateSchema = z.object({
  name: z.string().min(1, '模板名称不能为空'),
  description: z.string().optional(),
  content: z.string().optional(),
  fileUrl: z.string().url('文件URL格式不正确').optional(),
  fileKey: z.string().optional(),
  category: z.string().optional(),
  fields: z.array(z.object({
    key: z.string(),
    label: z.string(),
    type: z.string(),
    required: z.boolean().optional(),
    placeholder: z.string().optional(),
    options: z.array(z.string()).optional(),
    suffix: z.string().optional()
  })).optional(),
  tags: z.array(z.string()).optional(),
  isPublic: z.boolean().optional(),
  isActive: z.boolean().optional()
})

// 获取模板列表
router.get('/', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { category, isPublic, isSystem, includeSystem, page = 1, limit = 10 } = req.query
    const authReq = req as any

    const where: any = {
      isActive: true  // 默认只显示启用的模板
    }

    // 如果需要显示系统模板
    if (includeSystem === 'true') {
      delete where.isActive
      where.OR = [
        { userId: authReq.userId },
        { isPublic: true },
        { isSystem: true }
      ]
    } else {
      where.OR = [
        { userId: authReq.userId },  // 自己的模板
        { isPublic: true },          // 公开的模板
        { isSystem: true }           // 系统预设模板
      ]
    }

    if (category) {
      where.category = category
    }

    if (isPublic !== undefined) {
      where.isPublic = isPublic === 'true'
    }

    if (isSystem !== undefined) {
      where.isSystem = isSystem === 'true'
    }

    const [templates, total] = await Promise.all([
      prisma.template.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              phone: true
            }
          }
        },
        orderBy: [
          { isSystem: 'desc' },  // 系统模板优先
          { sort: 'asc' },
          { createdAt: 'desc' }
        ],
        skip: (Number(page) - 1) * Number(limit),
        take: Number(limit)
      }),
      prisma.template.count({ where })
    ])

    res.json({
      success: true,
      data: {
        list: templates,
        pagination: {
          page: Number(page),
          pageSize: Number(limit),
          total,
          totalPages: Math.ceil(total / Number(limit))
        }
      }
    })
  } catch (error) {
    console.error('Get templates error:', error)
    res.status(500).json({
      success: false,
      message: '获取模板列表失败'
    })
  }
})

// 获取模板详情
router.get('/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const authReq = req as any

    const template = await prisma.template.findFirst({
      where: {
        id,
        OR: [
          { userId: authReq.userId },
          { isPublic: true },
          { isSystem: true }
        ]
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            phone: true
          }
        },
        contracts: {
          select: {
            id: true,
            title: true,
            status: true,
            createdAt: true
          },
          take: 10,
          orderBy: { createdAt: 'desc' }
        }
      }
    })

    if (!template) {
      return res.status(404).json({
        success: false,
        message: '模板不存在'
      })
    }

    res.json({
      success: true,
      data: template
    })
  } catch (error) {
    console.error('Get template error:', error)
    res.status(500).json({
      success: false,
      message: '获取模板详情失败'
    })
  }
})

// 创建模板
router.post('/', authMiddleware, async (req: Request, res: Response) => {
  try {
    const data = templateSchema.parse(req.body)
    const authReq = req as any

    const template = await prisma.template.create({
      data: {
        name: data.name,
        description: data.description,
        content: data.content,
        fileUrl: data.fileUrl,
        fileKey: data.fileKey,
        category: data.category,
        fields: JSON.stringify(data.fields || []),
        tags: JSON.stringify(data.tags || []),
        isPublic: data.isPublic || false,
        isActive: data.isActive !== undefined ? data.isActive : true,
        isSystem: false,  // 用户创建的默认为非系统模板
        userId: authReq.userId
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            phone: true
          }
        }
      }
    })

    res.status(201).json({
      success: true,
      data: template,
      message: '模板创建成功'
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: error.errors[0].message
      })
    }
    console.error('Create template error:', error)
    res.status(500).json({
      success: false,
      message: '创建模板失败'
    })
  }
})

// 更新模板
router.patch('/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const authReq = req as any

    // 验证归属（系统模板不可修改）
    const existing = await prisma.template.findFirst({
      where: { id, userId: authReq.userId, isSystem: false }
    })

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: '模板不存在或不可修改'
      })
    }

    const updateData: any = {}
    const { name, description, content, fileUrl, fileKey, category, fields, tags, isPublic, isActive } = req.body

    if (name !== undefined) updateData.name = name
    if (description !== undefined) updateData.description = description
    if (content !== undefined) updateData.content = content
    if (fileUrl !== undefined) updateData.fileUrl = fileUrl
    if (fileKey !== undefined) updateData.fileKey = fileKey
    if (category !== undefined) updateData.category = category
    if (fields !== undefined) updateData.fields = JSON.stringify(fields)
    if (tags !== undefined) updateData.tags = JSON.stringify(tags)
    if (isPublic !== undefined) updateData.isPublic = isPublic
    if (isActive !== undefined) updateData.isActive = isActive

    const template = await prisma.template.update({
      where: { id },
      data: updateData,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            phone: true
          }
        }
      }
    })

    res.json({
      success: true,
      data: template,
      message: '模板更新成功'
    })
  } catch (error) {
    console.error('Update template error:', error)
    res.status(500).json({
      success: false,
      message: '更新模板失败'
    })
  }
})

// 删除模板
router.delete('/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const authReq = req as any

    // 验证归属
    const existing = await prisma.template.findFirst({
      where: { id, userId: authReq.userId }
    })

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: '模板不存在'
      })
    }

    await prisma.template.delete({
      where: { id }
    })

    res.json({
      success: true,
      message: '模板删除成功'
    })
  } catch (error) {
    console.error('Delete template error:', error)
    res.status(500).json({
      success: false,
      message: '删除模板失败'
    })
  }
})

export default router
