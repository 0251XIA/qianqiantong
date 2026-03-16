// 统一导出所有 API 模块

// Auth 模块
export {
  register,
  login,
  refreshToken,
  getProfile,
  updateProfile,
  changePassword,
  saveAuthData,
  clearAuthData,
  getStoredUser,
  isLoggedIn,
} from './auth/index.js';

// User 模块
export {
  getCurrentUser,
  createEnterprise,
  getEnterprise,
  getEnterpriseMembers,
  inviteMember,
  removeMember,
  updateMemberRole,
} from './user/index.js';

// Contract 模块
export {
  getContracts,
  getContract,
  createContract,
  updateContract,
  deleteContract,
  addSigner,
  removeSigner,
  sendContract,
  cancelContract,
  ContractStatusMap,
  getStatusText,
} from './contract/index.js';

// Template 模块
export {
  getTemplates,
  listTemplates,
  getTemplate,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  useTemplate,
} from './template/index.js';

// Sign 模块
export {
  initiateSign,
  getSignUrl,
  getSignStatus,
  SignerStatusMap,
  getSignerStatusText,
} from './sign/index.js';

// Payment 模块
export {
  getPackages,
  getPackage,
  createOrder,
  getOrders,
  getOrder,
  simulatePay,
  getUserPackage,
  OrderStatusMap,
  getOrderStatusText,
} from './payment/index.js';

// 默认导出
export { default as api } from './index.js';
