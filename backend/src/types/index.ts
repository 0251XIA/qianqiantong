import { Request } from 'express'

export interface AuthRequest extends Request {
  userId?: string
  user?: {
    id: string
    phone: string
    name: string | null
    email: string | null
  }
}

export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  message?: string
  error?: string
}

export interface PaginatedResponse<T> extends ApiResponse<T> {
  pagination?: {
    page: number
    pageSize: number
    total: number
    totalPages: number
  }
}
