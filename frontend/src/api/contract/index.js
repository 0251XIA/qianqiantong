import api from './index.js';

/**
 * Contract API - 合同模块
 */

// 合同列表
export async function getContracts(params = {}) {
  const res = await api.get('/contracts', { params });
  return res.data;
}

// 获取合同详情
export async function getContract(id) {
  const res = await api.get(`/contracts/${id}`);
  return res.data;
}

// 创建合同
export async function createContract(data) {
  const res = await api.post('/contracts', data);
  return res.data;
}

// 更新合同
export async function updateContract(id, data) {
  const res = await api.patch(`/contracts/${id}`, data);
  return res.data;
}

// 删除合同
export async function deleteContract(id) {
  const res = await api.delete(`/contracts/${id}`);
  return res.data;
}

// 添加签署方
export async function addSigner(contractId, data) {
  const res = await api.post(`/contracts/${contractId}/signers`, data);
  return res.data;
}

// 移除签署方
export async function removeSigner(contractId, signerId) {
  const res = await api.delete(`/contracts/${contractId}/signers/${signerId}`);
  return res.data;
}

// 发起签署
export async function sendContract(contractId) {
  const res = await api.post(`/contracts/${contractId}/send`);
  return res.data;
}

// 发起签署（触发契约锁）
export async function initiateSign(contractId) {
  const res = await api.post(`/sign/initiate`, { contractId });
  return res.data;
}

// 获取签署链接
export async function getSignUrl(contractId, signerId) {
  const res = await api.get(`/sign/${contractId}/signers/${signerId}/url`);
  return res.data;
}

// 取消合同
export async function cancelContract(contractId) {
  const res = await api.post(`/contracts/${contractId}/cancel`);
  return res.data;
}

// 合同状态映射（中文）
export const ContractStatusMap = {
  DRAFT: '草稿',
  PENDING: '待签署',
  PARTIAL_SIGNED: '部分签署',
  COMPLETED: '已完成',
  REJECTED: '已拒绝',
  EXPIRED: '已过期',
  CANCELLED: '已取消',
};

// 获取状态中文名
export function getStatusText(status) {
  return ContractStatusMap[status] || status;
}
