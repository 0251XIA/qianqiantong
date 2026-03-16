import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';

// 创建 Axios 实例
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 请求拦截器 - 自动添加 Token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 响应拦截器 - 统一处理错误
api.interceptors.response.use(
  (response) => {
    const res = response.data;
    
    // 根据后端统一响应格式处理
    if (res.code === 0) {
      return res;
    }
    
    // Token 过期
    if (res.code === 1007 || res.code === 1008) {
      // 尝试刷新 Token
      return refreshTokenAndRetry(response.config);
    }
    
    // 其他错误
    return Promise.reject(new Error(res.message || 'Request failed'));
  },
  (error) => {
    console.error('API Error:', error);
    return Promise.reject(error);
  }
);

// Token 刷新逻辑
let isRefreshing = false;
let refreshSubscribers = [];

function subscribeTokenRefresh(callback) {
  refreshSubscribers.push(callback);
}

function onTokenRefreshed(newToken) {
  refreshSubscribers.forEach(callback => callback(newToken));
  refreshSubscribers = [];
}

async function refreshTokenAndRetry(config) {
  if (isRefreshing) {
    return new Promise((resolve) => {
      subscribeTokenRefresh((token) => {
        config.headers.Authorization = `Bearer ${token}`;
        resolve(api(config));
      });
    });
  }

  isRefreshing = true;
  const refreshToken = localStorage.getItem('refreshToken');

  if (!refreshToken) {
    // 没有 refresh token，直接跳转登录
    window.location.href = '/login';
    return Promise.reject(new Error('No refresh token'));
  }

  try {
    const res = await axios.post(`${API_BASE_URL}/auth/refresh-token`, {
      refreshToken,
    });

    const { accessToken, refreshToken: newRefreshToken } = res.data.data;
    
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', newRefreshToken);
    
    isRefreshing = false;
    onTokenRefreshed(accessToken);
    
    config.headers.Authorization = `Bearer ${accessToken}`;
    return api(config);
  } catch (error) {
    isRefreshing = false;
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    window.location.href = '/login';
    return Promise.reject(error);
  }
}

export default api;

// 常用请求方法封装
export const request = {
  get: (url, config) => api.get(url, config),
  post: (url, data, config) => api.post(url, data, config),
  patch: (url, data, config) => api.patch(url, data, config),
  put: (url, data, config) => api.put(url, data, config),
  delete: (url, config) => api.delete(url, config),
};
