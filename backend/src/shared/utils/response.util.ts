// 统一响应格式

export interface ApiResponse<T = any> {
  code: number;
  message: string;
  data: T | null;
}

export interface PaginatedResponse<T = any> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// 成功响应
export function success<T>(data: T, message = 'success'): ApiResponse<T> {
  return {
    code: 0,
    message,
    data,
  };
}

// 分页成功响应
export function paginatedSuccess<T>(
  items: T[],
  total: number,
  page: number,
  pageSize: number
): ApiResponse<PaginatedResponse<T>> {
  return {
    code: 0,
    message: 'success',
    data: {
      items,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    },
  };
}

// 错误响应
export function error(code: number, message: string, data: any = null): ApiResponse {
  return {
    code,
    message,
    data,
  };
}

// 常用错误码
export const ErrorCode = {
  // 通用错误 1000-1999
  BAD_REQUEST: 1000,
  UNAUTHORIZED: 1001,
  FORBIDDEN: 1002,
  NOT_FOUND: 1003,
  INTERNAL_ERROR: 1004,
  
  // 认证错误 2000-2999
  INVALID_PHONE: 2000,
  INVALID_CODE: 2001,
  CODE_EXPIRED: 2002,
  CODE_SENT_TOO_FREQUENT: 2003,
  PHONE_ALREADY_EXISTS: 2004,
  PASSWORD_WRONG: 2005,
  USER_NOT_FOUND: 2006,
  TOKEN_EXPIRED: 2007,
  TOKEN_INVALID: 2008,
  
  // 业务错误 3000-3999
  CONTRACT_NOT_FOUND: 3000,
  CONTRACT_STATUS_ERROR: 3001,
  TEMPLATE_NOT_FOUND: 3002,
  SIGNERS_REQUIRED: 3003,
  SIGN_COMPLETED: 3004,
  PERMISSION_DENIED: 3005,
  
  // 第三方错误 4000-4999
  QIYUESUO_ERROR: 4000,
  SMS_SEND_ERROR: 4001,
  PAYMENT_ERROR: 4002,
} as const;
