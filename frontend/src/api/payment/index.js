import api from './index.js';

/**
 * Payment API - 支付模块
 */

// 套餐列表
export async function getPackages() {
  const res = await api.get('/payment/packages');
  return res.data;
}

// 套餐详情
export async function getPackage(id) {
  const res = await api.get(`/payment/packages/${id}`);
  return res.data;
}

// 创建订单
export async function createOrder(data) {
  const res = await api.post('/payment/orders', data);
  return res.data;
}

// 订单列表
export async function getOrders(params = {}) {
  const res = await api.get('/payment/orders', { params });
  return res.data;
}

// 订单详情
export async function getOrder(id) {
  const res = await api.get(`/payment/orders/${id}`);
  return res.data;
}

// 模拟支付（演示用）
export async function simulatePay(orderId) {
  const res = await api.post(`/payment/orders/${orderId}/pay`);
  return res.data;
}

// 获取当前套餐
export async function getUserPackage() {
  const res = await api.get('/payment/my/package');
  return res.data;
}

// 订单状态映射
export const OrderStatusMap = {
  PENDING: '待支付',
  PAID: '已支付',
  CANCELLED: '已取消',
  REFUNDED: '已退款',
};

// 获取订单状态中文名
export function getOrderStatusText(status) {
  return OrderStatusMap[status] || status;
}
