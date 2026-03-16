import api from './index.js';

/**
 * Auth API - 认证模块
 */

// 手机号注册
export async function register(phone, password, name) {
  const res = await api.post('/auth/register', { phone, password, name });
  return res.data;
}

// 账号密码登录
export async function login(phone, password) {
  const res = await api.post('/auth/login', { phone, password });
  return res.data;
}

// 刷新 Token
export async function refreshToken(refreshToken) {
  const res = await api.post('/auth/refresh-token', { refreshToken });
  return res.data;
}

// 获取当前用户信息
export async function getProfile() {
  const res = await api.get('/auth/profile');
  return res.data;
}

// 更新当前用户信息
export async function updateProfile(data) {
  const res = await api.patch('/auth/profile', data);
  return res.data;
}

// 修改密码
export async function changePassword(oldPassword, newPassword) {
  const res = await api.post('/auth/change-password', { oldPassword, newPassword });
  return res.data;
}

// 保存登录信息到本地存储
export function saveAuthData(authData) {
  localStorage.setItem('accessToken', authData.accessToken);
  localStorage.setItem('refreshToken', authData.refreshToken);
  localStorage.setItem('user', JSON.stringify(authData.user));
}

// 清除登录信息
export function clearAuthData() {
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('user');
}

// 获取本地存储的用户信息
export function getStoredUser() {
  const user = localStorage.getItem('user');
  return user ? JSON.parse(user) : null;
}

// 检查是否已登录
export function isLoggedIn() {
  return !!localStorage.getItem('accessToken');
}
