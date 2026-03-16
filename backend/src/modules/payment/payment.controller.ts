import { Request, Response, NextFunction } from 'express';
import { paymentService } from './payment.service';
import { success, error, ErrorCode, paginatedSuccess } from '../../shared/utils';
import { AuthRequest } from '../../shared/middleware';

export class PaymentController {
  // 套餐列表
  async getPackages(req: Request, res: Response, next: NextFunction) {
    try {
      const packages = await paymentService.getPackages();
      res.json(success(packages));
    } catch (err) {
      next(err);
    }
  }
  
  // 套餐详情
  async getPackage(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const pkg = await paymentService.getPackage(id);
      res.json(success(pkg));
    } catch (err) {
      next(err);
    }
  }
  
  // 创建订单
  async createOrder(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const { packageId, type, amount, paymentMethod } = req.body;
      
      if (!type || !amount || !paymentMethod) {
        return res.json(error(ErrorCode.BAD_REQUEST, 'Missing required fields'));
      }
      
      const order = await paymentService.createOrder(userId, {
        packageId,
        type,
        amount,
        paymentMethod,
      });
      
      res.json(success(order, 'Order created'));
    } catch (err) {
      next(err);
    }
  }
  
  // 订单列表
  async getOrders(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const { page, pageSize, status } = req.query;
      
      const result = await paymentService.getOrders(userId, {
        page: parseInt(page as string) || 1,
        pageSize: parseInt(pageSize as string) || 10,
        status: status as string,
      });
      
      res.json(paginatedSuccess(result.orders, result.total, result.page, result.pageSize));
    } catch (err) {
      next(err);
    }
  }
  
  // 订单详情
  async getOrder(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const { id } = req.params;
      
      const order = await paymentService.getOrder(userId, id);
      res.json(success(order));
    } catch (err) {
      next(err);
    }
  }
  
  // 模拟支付（演示用）
  async simulatePay(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const { id } = req.params;
      
      if (!id) {
        return res.json(error(ErrorCode.BAD_REQUEST, 'Order ID is required'));
      }
      
      const order = await paymentService.simulatePay(userId, id);
      res.json(success(order, 'Payment successful'));
    } catch (err) {
      next(err);
    }
  }
  
  // 获取当前套餐
  async getUserPackage(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const userPackage = await paymentService.getUserPackage(userId);
      res.json(success(userPackage));
    } catch (err) {
      next(err);
    }
  }
}

export const paymentController = new PaymentController();
