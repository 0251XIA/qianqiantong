import { prisma } from '../../shared/database';
import { createError } from '../../shared/middleware';

export class TemplateService {
  // 创建模板
  async create(userId: string, data: {
    name: string;
    description?: string;
    content?: string;
    fileUrl?: string;
    fileKey?: string;
    category?: string;
    fields?: string;
    tags?: string[];
    isPublic?: boolean;
  }) {
    const template = await prisma.template.create({
      data: {
        name: data.name,
        description: data.description,
        content: data.content,
        fileUrl: data.fileUrl,
        fileKey: data.fileKey,
        category: data.category,
        fields: data.fields || '[]',
        tags: JSON.stringify(data.tags || []),
        isPublic: data.isPublic || false,
        userId,
      },
      include: {
        user: {
          select: { id: true, name: true, phone: true },
        },
      },
    });
    
    return template;
  }
  
  // 模板列表
  async list(userId: string, query: {
    page?: number;
    pageSize?: number;
    category?: string;
    keyword?: string;
  }) {
    const page = query.page || 1;
    const pageSize = query.pageSize || 10;
    
    // 查询自己创建的 + 公开的
    const where: any = {
      OR: [
        { userId },
        { isPublic: true },
      ],
    };
    
    if (query.category) {
      where.category = query.category;
    }
    
    if (query.keyword) {
      where.name = { contains: query.keyword };
    }
    
    const [templates, total] = await Promise.all([
      prisma.template.findMany({
        where,
        include: {
          user: {
            select: { id: true, name: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.template.count({ where }),
    ]);
    
    return { templates, total, page, pageSize };
  }
  
  // 获取模板详情
  async getById(userId: string, templateId: string) {
    const template = await prisma.template.findFirst({
      where: {
        id: templateId,
        OR: [
          { userId },
          { isPublic: true },
        ],
      },
      include: {
        user: {
          select: { id: true, name: true, phone: true },
        },
      },
    });
    
    if (!template) {
      throw createError('Template not found', 404, 3002);
    }
    
    return template;
  }
  
  // 更新模板
  async update(userId: string, templateId: string, data: {
    name?: string;
    description?: string;
    content?: string;
    fileUrl?: string;
    category?: string;
    fields?: string;
    tags?: string[];
    isPublic?: boolean;
  }) {
    const existing = await prisma.template.findFirst({
      where: { id: templateId, userId },
    });
    
    if (!existing) {
      throw createError('Template not found', 404, 3002);
    }
    
    const template = await prisma.template.update({
      where: { id: templateId },
      data: {
        name: data.name,
        description: data.description,
        content: data.content,
        fileUrl: data.fileUrl,
        category: data.category,
        fields: data.fields,
        tags: data.tags ? JSON.stringify(data.tags) : undefined,
        isPublic: data.isPublic,
      },
      include: {
        user: {
          select: { id: true, name: true },
        },
      },
    });
    
    return template;
  }
  
  // 删除模板
  async delete(userId: string, templateId: string) {
    const template = await prisma.template.findFirst({
      where: { id: templateId, userId },
    });
    
    if (!template) {
      throw createError('Template not found', 404, 3002);
    }
    
    // 检查是否有合同使用此模板
    const usedCount = await prisma.contract.count({
      where: { templateId },
    });
    
    if (usedCount > 0) {
      throw createError('Template is in use and cannot be deleted', 400, 3001);
    }
    
    await prisma.template.delete({
      where: { id: templateId },
    });
    
    return { message: 'Template deleted' };
  }
  
  // 使用模板创建合同
  async useTemplate(userId: string, templateId: string, data: {
    title: string;
    // 模板字段数据
    partyA?: string;
    partyAAddress?: string;
    partyB?: string;
    partyBIdCard?: string;
    partyBPhone?: string;
    position?: string;
    salary?: string;
    startDate?: string;
    endDate?: string;
    // 其他字段
    signers: {
      name: string;
      phone?: string;
      email?: string;
      signOrder: number;
    }[];
  }) {
    const template = await this.getById(userId, templateId);
    
    // 解析模板字段配置
    let fields: any[] = [];
    try {
      fields = JSON.parse(template.fields || '[]');
    } catch {}
    
    // 构建合同数据 - 只保存用户填写的字段
    const contractData: any = {
      title: data.title,
      fileUrl: template.fileUrl,
      fileKey: template.fileKey,
      templateId: template.id,
      userId,
      status: 'DRAFT',
    };
    
    // 如果有模板内容，将用户填写的字段数据保存到 description
    if (template.content) {
      // 保存用户填写的字段到 description (JSON 格式)
      const fieldData: Record<string, string> = {};
      for (const key of ['partyA', 'partyAAddress', 'partyB', 'partyBIdCard', 'partyBPhone', 'position', 'salary', 'startDate', 'endDate']) {
        if ((data as any)[key]) {
          fieldData[key] = (data as any)[key];
        }
      }
      contractData.description = JSON.stringify(fieldData);
    }
    
    // 使用 Contract 模块的逻辑
    const { prisma } = await import('../../shared/database');
    
    const contract = await prisma.contract.create({
      data: {
        ...contractData,
        signers: {
          create: data.signers.map(s => ({
            name: s.name,
            phone: s.phone,
            email: s.email,
            signOrder: s.signOrder,
            status: 'PENDING',
          })),
        },
      },
      include: {
        signers: true,
        template: true,
      },
    });
    
    return contract;
  }
}

export const templateService = new TemplateService();
