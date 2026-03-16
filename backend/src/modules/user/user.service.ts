import { prisma } from '../../shared/database';
import { createError } from '../../shared/middleware';

export class UserService {
  // 获取用户详情
  async getUserById(userId: string) {
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
  
  // 创建企业账户
  async createEnterprise(userId: string, data: {
    name: string;
    licenseCode?: string;
    legalPerson?: string;
  }) {
    // 检查是否已经是企业用户
    const existingEnterprise = await prisma.enterprise.findFirst({
      where: {
        users: {
          some: { userId },
        },
      },
    });
    
    if (existingEnterprise) {
      throw createError('Enterprise account already exists', 400, 3005);
    }
    
    // 创建企业
    const enterprise = await prisma.enterprise.create({
      data: {
        name: data.name,
        licenseCode: data.licenseCode,
        legalPerson: data.legalPerson,
        status: 'PENDING',
        users: {
          create: {
            userId,
            role: 'OWNER',
          },
        },
      },
      include: {
        users: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                phone: true,
              },
            },
          },
        },
      },
    });
    
    // 更新用户为企业账户
    await prisma.user.update({
      where: { id: userId },
      data: { accountType: 'ENTERPRISE' },
    });
    
    return enterprise;
  }
  
  // 获取企业信息
  async getEnterprise(userId: string) {
    const enterpriseUser = await prisma.enterpriseUser.findFirst({
      where: { userId },
      include: {
        enterprise: {
          include: {
            users: {
              include: {
                user: {
                  select: {
                    id: true,
                    name: true,
                    phone: true,
                    email: true,
                    avatar: true,
                  },
                },
              },
            },
          },
        },
      },
    });
    
    if (!enterpriseUser) {
      throw createError('Enterprise account not found', 404, 3005);
    }
    
    return enterpriseUser.enterprise;
  }
  
  // 邀请企业成员
  async inviteMember(ownerId: string, data: {
    phone: string;
    name: string;
    role?: 'ADMIN' | 'MEMBER';
  }) {
    // 验证是否是企业拥有者
    const enterpriseUser = await prisma.enterpriseUser.findFirst({
      where: {
        userId: ownerId,
        role: 'OWNER',
      },
    });
    
    if (!enterpriseUser) {
      throw createError('Only owner can invite members', 403, 1002);
    }
    
    // 查找或创建用户
    let memberUser = await prisma.user.findUnique({
      where: { phone: data.phone },
    });
    
    if (!memberUser) {
      // 创建新用户（需要先注册）
      throw createError('User must register first before being invited', 400, 2006);
    }
    
    // 检查是否已经是企业成员
    const existingMember = await prisma.enterpriseUser.findFirst({
      where: {
        userId: memberUser.id,
        enterpriseId: enterpriseUser.enterpriseId,
      },
    });
    
    if (existingMember) {
      throw createError('User is already a member', 400, 3005);
    }
    
    // 添加企业成员
    const newMember = await prisma.enterpriseUser.create({
      data: {
        userId: memberUser.id,
        enterpriseId: enterpriseUser.enterpriseId,
        role: data.role || 'MEMBER',
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            phone: true,
            email: true,
          },
        },
      },
    });
    
    return newMember;
  }
  
  // 获取企业成员列表
  async getMembers(ownerId: string) {
    const enterpriseUser = await prisma.enterpriseUser.findFirst({
      where: {
        userId: ownerId,
        role: 'OWNER',
      },
    });
    
    if (!enterpriseUser) {
      throw createError('Enterprise account not found', 404, 3005);
    }
    
    const members = await prisma.enterpriseUser.findMany({
      where: { enterpriseId: enterpriseUser.enterpriseId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            phone: true,
            email: true,
            avatar: true,
            status: true,
            createdAt: true,
          },
        },
      },
    });
    
    return members;
  }
  
  // 移除企业成员
  async removeMember(ownerId: string, memberId: string) {
    const enterpriseUser = await prisma.enterpriseUser.findFirst({
      where: {
        userId: ownerId,
        role: 'OWNER',
      },
    });
    
    if (!enterpriseUser) {
      throw createError('Enterprise account not found', 404, 3005);
    }
    
    // 不能移除拥有者
    const targetMember = await prisma.enterpriseUser.findFirst({
      where: {
        id: memberId,
        enterpriseId: enterpriseUser.enterpriseId,
        role: { not: 'OWNER' },
      },
    });
    
    if (!targetMember) {
      throw createError('Member not found or cannot be removed', 404, 3005);
    }
    
    await prisma.enterpriseUser.delete({
      where: { id: memberId },
    });
    
    return { message: 'Member removed successfully' };
  }
  
  // 更新成员角色
  async updateMemberRole(ownerId: string, memberId: string, role: 'ADMIN' | 'MEMBER') {
    const enterpriseUser = await prisma.enterpriseUser.findFirst({
      where: {
        userId: ownerId,
        role: 'OWNER',
      },
    });
    
    if (!enterpriseUser) {
      throw createError('Enterprise account not found', 404, 3005);
    }
    
    const targetMember = await prisma.enterpriseUser.findFirst({
      where: {
        id: memberId,
        enterpriseId: enterpriseUser.enterpriseId,
        role: { not: 'OWNER' },
      },
    });
    
    if (!targetMember) {
      throw createError('Member not found', 404, 3005);
    }
    
    const updated = await prisma.enterpriseUser.update({
      where: { id: memberId },
      data: { role },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            phone: true,
          },
        },
      },
    });
    
    return updated;
  }
}

export const userService = new UserService();
