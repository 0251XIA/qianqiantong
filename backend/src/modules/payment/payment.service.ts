import { prisma } from '../../shared/database';
import { createError } from '../../shared/middleware';

export class PaymentService {
  // 套餐列表
  async getPackages() {
    const packages = await prisma.package.findMany({
      where: { status: 'ACTIVE' },
      orderBy: { sort: 'asc' },
    });
    
    return packages;
  }
  
  // 套餐详情
  async getPackage(packageId: string) {
    const pkg = await prisma.package.findUnique({
      where: { id: packageId },
    });
    
    if (!pkg || pkg.status !== 'ACTIVE') {
      throw createError('Package not found', 404, 3000);
    }
    
    return pkg;
  }
  
  // 创建订单
  async createOrder(userId: string, data: {
    packageId?: string;
    type: 'PACKAGE' | 'RECHARGE';
    amount: number;
    paymentMethod: 'WECHAT' | 'ALIPAY' | 'BANK_TRANSFER';
  }) {
    // 生成订单号
    const orderNo = `ORD${Date.now()}${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    
    let packageInfo = null;
    let expireTime = null;
    let totalContracts = 0;
    
    if (data.packageId) {
      packageInfo = await this.getPackage(data.packageId);
      expireTime = new Date();
      expireTime.setDate(expireTime.getDate() + packageInfo.duration);
      totalContracts = packageInfo.contractCount;
    }
    
    const order = await prisma.order.create({
      data: {
        orderNo,
        userId,
        packageId: data.packageId,
        type: data.type,
        amount: data.amount,
        paymentMethod: data.paymentMethod,
        status: 'PENDING',
        expireTime,
        totalContracts,
      },
      include: {
        package: true,
      },
    });
    
    return order;
  }
  
  // 订单列表
  async getOrders(userId: string, query: {
    page?: number;
    pageSize?: number;
    status?: string;
  }) {
    const page = query.page || 1;
    const pageSize = query.pageSize || 10;
    
    const where: any = { userId };
    if (query.status) {
      where.status = query.status;
    }
    
    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        include: {
          package: true,
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.order.count({ where }),
    ]);
    
    return { orders, total, page, pageSize };
  }
  
  // 订单详情
  async getOrder(userId: string, orderId: string) {
    const order = await prisma.order.findFirst({
      where: { id: orderId, userId },
      include: {
        package: true,
      },
    });
    
    if (!order) {
      throw createError('Order not found', 404, 3000);
    }
    
    return order;
  }
  
  // 模拟支付（实际项目中需要对接支付宝/微信）
  async simulatePay(userId: string, orderId: string) {
    const order = await prisma.order.findFirst({
      where: { id: orderId, userId, status: 'PENDING' },
    });
    
    if (!order) {
      throw createError('Order not found or already paid', 404, 3000);
    }
    
    // 更新订单状态
    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data: {
        status: 'PAID',
        paymentTime: new Date(),
      },
    });
    
    // 如果是套餐订单，添加到用户套餐
    if (order.packageId && order.expireTime) {
      await prisma.userPackage.upsert({
        where: {
          userId_status: {
            userId,
            status: 'ACTIVE',
          },
        },
        update: {
          expireTime: order.expireTime,
          totalContracts: order.totalContracts,
          contractUsed: 0,
        },
        create: {
          userId,
          packageId: order.packageId,
          expireTime: order.expireTime,
          totalContracts: order.totalContracts,
          contractUsed: 0,
          status: 'ACTIVE',
        },
      });
    }
    
    return updatedOrder;
  }
  
  // 获取当前用户的套餐
  async getUserPackage(userId: string) {
    const userPackage = await prisma.userPackage.findFirst({
      where: { userId, status: 'ACTIVE' },
      include: {
        package: true,
      },
    });
    
    return userPackage;
  }
  
  // 验证并扣除合同份数
  async verifyAndUseContract(userId: string): Promise<boolean> {
    const userPackage = await this.getUserPackage(userId);
    
    if (!userPackage) {
      throw createError('No active package', 400, 4002);
    }
    
    // 检查是否过期
    if (new Date() > userPackage.expireTime) {
      throw createError('Package expired', 400, 4002);
    }
    
    // 检查份数是否用完
    if (userPackage.contractUsed >= userPackage.totalContracts) {
      throw createError('Package quota used up', 400, 4002);
    }
    
    // 扣除份数
    await prisma.userPackage.update({
      where: { id: userPackage.id },
      data: {
        contractUsed: userPackage.contractUsed + 1,
      },
    });
    
    return true;
  }
}

export const paymentService = new PaymentService();
