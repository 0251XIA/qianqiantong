import api from '../index.js';

/**
 * Sign API - 签署模块
 */

// 发起签署
export async function initiateSign(contractId) {
  const res = await api.post('/sign/initiate', { contractId });
  return res.data;
}

// 获取签署 URL
export async function getSignUrl(contractId, signerId) {
  const res = await api.get(`/sign/${contractId}/signers/${signerId}/url`);
  return res.data;
}

// 查询签署状态
export async function getSignStatus(contractId) {
  const res = await api.get(`/sign/${contractId}/status`);
  return res.data;
}

// 签署方状态映射
export const SignerStatusMap = {
  PENDING: '待签署',
  SIGNED: '已签署',
  REJECTED: '已拒绝',
  EXPIRED: '已过期',
};

// 获取签署方状态中文名
export function getSignerStatusText(status) {
  return SignerStatusMap[status] || status;
}
