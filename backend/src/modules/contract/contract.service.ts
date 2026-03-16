import { prisma } from '../../shared/database';
import { createError } from '../../shared/middleware';

export class ContractService {
  // 创建合同
  async create(userId: string, data: {
    title: string;
    fileUrl?: string;
    fileKey?: string;
    templateId?: string;
    signDeadline?: Date;
    // 扩展字段：合同详细内容
    partyA?: string;
    partyAAddress?: string;
    partyB?: string;
    partyBPhone?: string;
    partyBIdCard?: string;
    position?: string;
    salary?: string;
    startDate?: string;
    endDate?: string;
    content?: string;
    signers?: {
      name: string;
      phone?: string;
      email?: string;
      signOrder: number;
    }[];
  }) {
    let fileUrl = data.fileUrl;
    
    if (data.templateId && !fileUrl) {
      const template = await prisma.template.findUnique({
        where: { id: data.templateId },
      });
      if (template?.fileUrl) {
        fileUrl = template.fileUrl;
      }
    }
    
    const needGeneratePdf = !fileUrl && data.content;
    
    // 构建合同描述（包含完整信息用于生成PDF）
    let description = data.content;
    if (!description) {
      const info = {
        partyA: data.partyA,
        partyAAddress: data.partyAAddress,
        partyB: data.partyB,
        partyBPhone: data.partyBPhone,
        partyBIdCard: data.partyBIdCard,
        position: data.position,
        salary: data.salary,
        startDate: data.startDate,
        endDate: data.endDate,
      };
      description = JSON.stringify(info);
    }
    
    const contract = await prisma.contract.create({
      data: {
        title: data.title,
        fileUrl: fileUrl,
        fileKey: data.fileKey,
        templateId: data.templateId,
        signDeadline: data.signDeadline,
        description: description,
        userId,
        status: needGeneratePdf ? 'PENDING' : 'DRAFT',
        signers: data.signers ? {
          create: data.signers.map(s => ({
            name: s.name,
            phone: s.phone,
            email: s.email,
            signOrder: s.signOrder,
            status: 'PENDING',
          })),
        } : undefined,
      },
      include: {
        signers: true,
        user: {
          select: { id: true, phone: true, name: true },
        },
      },
    });
    
    return contract;
  }
  
  // 合同列表
  async list(userId: string, query: {
    page?: number;
    pageSize?: number;
    status?: string;
    keyword?: string;
  }) {
    const page = query.page || 1;
    const pageSize = query.pageSize || 10;
    const where: any = { userId };
    
    if (query.status) {
      where.status = query.status;
    }
    
    if (query.keyword) {
      where.OR = [
        { title: { contains: query.keyword } },
        { description: { contains: query.keyword } },
      ];
    }
    
    const [items, total] = await Promise.all([
      prisma.contract.findMany({
        where,
        include: {
          signers: { orderBy: { signOrder: 'asc' } },
          template: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.contract.count({ where }),
    ]);
    
    return {
      items,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }
  
  // 获取合同详情
  async get(contractId: string, userId: string) {
    const contract = await prisma.contract.findFirst({
      where: { id: contractId, userId },
      include: {
        signers: { orderBy: { signOrder: 'asc' } },
        template: true,
        user: { select: { id: true, phone: true, name: true } },
        logs: {
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
      },
    });
    
    if (!contract) {
      throw createError('Contract not found', 404, 3002);
    }
    
    return contract;
  }
  
  // 更新合同
  async update(contractId: string, userId: string, data: {
    title?: string;
    fileUrl?: string;
    signDeadline?: Date;
  }) {
    const existing = await prisma.contract.findFirst({
      where: { id: contractId, userId },
    });
    
    if (!existing) {
      throw createError('Contract not found', 404, 3002);
    }
    
    if (existing.status !== 'DRAFT') {
      throw createError('Only draft contracts can be updated', 400, 3004);
    }
    
    const contract = await prisma.contract.update({
      where: { id: contractId },
      data: {
        title: data.title,
        fileUrl: data.fileUrl,
        signDeadline: data.signDeadline,
      },
      include: {
        signers: true,
        user: { select: { id: true, phone: true, name: true } },
      },
    });
    
    return contract;
  }
  
  // 删除合同
  async delete(contractId: string, userId: string) {
    const existing = await prisma.contract.findFirst({
      where: { id: contractId, userId },
    });
    
    if (!existing) {
      throw createError('Contract not found', 404, 3002);
    }
    
    if (existing.status !== 'DRAFT') {
      throw createError('Only draft contracts can be deleted', 400, 3004);
    }
    
    await prisma.contract.delete({
      where: { id: contractId },
    });
    
    return { success: true };
  }
  
  // 添加签署方
  async addSigner(contractId: string, userId: string, data: {
    name: string;
    phone?: string;
    email?: string;
    companyName?: string;
    signOrder: number;
  }) {
    const contract = await prisma.contract.findFirst({
      where: { id: contractId, userId },
    });
    
    if (!contract) {
      throw createError('Contract not found', 404, 3002);
    }
    
    if (contract.status !== 'DRAFT') {
      throw createError('Only draft contracts can add signers', 400, 3001);
    }
    
    const signer = await prisma.contractSigner.create({
      data: {
        contractId,
        name: data.name,
        phone: data.phone,
        email: data.email,
        companyName: data.companyName,
        signOrder: data.signOrder,
        status: 'PENDING',
      },
    });
    
    return signer;
  }
  
  // 移除签署方
  async removeSigner(contractId: string, userId: string, signerId: string) {
    const contract = await prisma.contract.findFirst({
      where: { id: contractId, userId },
    });
    
    if (!contract) {
      throw createError('Contract not found', 404, 3002);
    }
    
    if (contract.status !== 'DRAFT') {
      throw createError('Only draft contracts can remove signers', 400, 3001);
    }
    
    await prisma.contractSigner.delete({
      where: { id: signerId },
    });
    
    return { success: true };
  }
  
  // 发送合同
  async sendContract(contractId: string, userId: string) {
    console.log('【sendContract】contractId:', contractId, 'userId:', userId);
    
    const contract = await prisma.contract.findFirst({
      where: { id: contractId, userId },
      include: { signers: true },
    });
    
    console.log('【sendContract】找到合同:', contract?.id, 'status:', contract?.status);
    
    if (!contract) {
      throw createError('Contract not found', 404, 3002);
    }
    
    if (contract.status !== 'DRAFT') {
      throw createError('Contract already sent', 400, 3001);
    }
    
    if (contract.signers.length === 0) {
      throw createError('No signers', 400, 3003);
    }
    
    const updated = await prisma.contract.update({
      where: { id: contractId },
      data: { status: 'PENDING' },
      include: { signers: true },
    });
    
    // 记录日志
    await prisma.contractLog.create({
      data: {
        contractId,
        action: 'SEND',
        operator: userId,
        content: 'Contract sent for signing',
      },
    });
    
    return updated;
  }
  
  // 取消合同
  async cancelContract(contractId: string, userId: string) {
    const contract = await prisma.contract.findFirst({
      where: { id: contractId, userId },
    });
    
    if (!contract) {
      throw createError('Contract not found', 404, 3002);
    }
    
    if (contract.status !== 'PENDING' && contract.status !== 'PARTIAL_SIGNED') {
      throw createError('Contract cannot be cancelled', 400, 3001);
    }
    
    const updated = await prisma.contract.update({
      where: { id: contractId },
      data: { status: 'CANCELLED' },
      include: { signers: true },
    });
    
    // 记录日志
    await prisma.contractLog.create({
      data: {
        contractId,
        action: 'CANCEL',
        operator: userId,
        content: 'Contract cancelled',
      },
    });
    
    return updated;
  }
}

export const contractService = new ContractService();
