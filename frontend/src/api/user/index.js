import api from './index.js';

/**
 * User API - 用户模块
 */

// 获取当前用户信息
export async function getCurrentUser() {
  const res = await api.get('/users/me');
  return res.data;
}

// 创建企业账户
export async function createEnterprise(data) {
  const res = await api.post('/users/enterprise', data);
  return res.data;
}

// 获取企业信息
export async function getEnterprise() {
  const res = await api.get('/users/enterprise');
  return res.data;
}

// 获取企业成员列表
export async function getEnterpriseMembers() {
  const res = await api.get('/users/enterprise/members');
  return res.data;
}

// 邀请企业成员
export async function inviteMember(phone, name, role) {
  const res = await api.post('/users/enterprise/members/invite', { phone, name, role });
  return res.data;
}

// 移除企业成员
export async function removeMember(memberId) {
  const res = await api.delete(`/users/enterprise/members/${memberId}`);
  return res.data;
}

// 更新成员角色
export async function updateMemberRole(memberId, role) {
  const res = await api.patch(`/users/enterprise/members/${memberId}/role`, { role });
  return res.data;
}
