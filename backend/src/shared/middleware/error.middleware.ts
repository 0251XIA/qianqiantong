import { Request, Response, NextFunction } from 'express';
import { error } from '../utils';

export interface AppError extends Error {
  statusCode?: number;
  code?: number;
}

// 错误处理中间件
export function errorMiddleware(err: AppError, req: Request, res: Response, next: NextFunction) {
  const statusCode = err.statusCode || 500;
  const code = err.code || 1004;
  const message = err.message || 'Internal Server Error';
  
  console.error(`[Error] ${req.method} ${req.path}:`, err);
  
  res.status(statusCode).json(
    error(code, message)
  );
}

// 404 处理
export function notFoundMiddleware(req: Request, res: Response) {
  res.status(404).json(
    error(1003, 'Resource not found')
  );
}

// 创建错误
export function createError(message: string, statusCode: number, code: number): AppError {
  const err: AppError = new Error(message);
  err.statusCode = statusCode;
  err.code = code;
  return err;
}
