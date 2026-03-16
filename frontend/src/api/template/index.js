import api from './index.js';

/**
 * Template API - 模板模块
 */

// 模板列表
export async function getTemplates(params = {}) {
  const res = await api.get('/templates', { params });
  return res.data;
}

// 获取模板详情
export async function getTemplate(id) {
  const res = await api.get(`/templates/${id}`);
  return res.data;
}

// 创建模板
export async function createTemplate(data) {
  const res = await api.post('/templates', data);
  return res.data;
}

// 更新模板
export async function updateTemplate(id, data) {
  const res = await api.patch(`/templates/${id}`, data);
  return res.data;
}

// 删除模板
export async function deleteTemplate(id) {
  const res = await api.delete(`/templates/${id}`);
  return res.data;
}

// 使用模板创建合同
export async function useTemplate(templateId, data) {
  const res = await api.post(`/templates/${templateId}/use`, data);
  return res.data;
}
