import axios, { AxiosInstance } from 'axios';
import { config } from '../../shared/config';
import { createError } from '../../shared/middleware/error.middleware';
import crypto from 'crypto';

// 契约锁 API 响应类型
interface QiyuesuoResponse {
  code: number;
  message: string;
  data?: any;
}

export class QiyuesuoAdapter {
  private client: AxiosInstance;
  
  constructor() {
    this.client = axios.create({
      baseURL: config.qiyuesuo.apiUrl || 'https://openapi.qiyuesuo.cn',
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    });
  }
  
  // 生成签名 - 按契约锁规范: MD5(token + secret + timestamp + nonce)
  private generateSignature(timestamp: string, nonce: string): string {
    const signStr = config.qiyuesuo.token + config.qiyuesuo.secret + timestamp + nonce;
    return crypto.createHash('md5').update(signStr).digest('hex').toUpperCase();
  }
  
  // 设置认证头
  private setAuthHeaders(): Record<string, string> {
    const timestamp = Date.now().toString();
    const nonce = Math.random().toString(36).substring(2, 15);
    const signature = this.generateSignature(timestamp, nonce);
    
    return {
      'x-qys-open-accesstoken': config.qiyuesuo.token,
      'x-qys-open-signature': signature,
      'x-qys-open-timestamp': timestamp,
      'x-qys-open-nonce': nonce,
      'x-qys-open-tenantsign': config.qiyuesuo.tenantId,
    };
  }
  
  // 创建草稿（带创建者信息）
  async createDraft(params: {
    tenantName: string;
    subject: string;
    creator?: {
      name: string;
      contact: string;
      contactType: 'EMAIL' | 'MOBILE';
    };
    signatories: Array<{
      tenantType: 'PERSONAL' | 'COMPANY';
      tenantName: string;
      receiver: { contact: string; contactType: 'MOBILE' | 'EMAIL' };
      serialNo: string;
    }>;
  }): Promise<{ contractId: string }> {
    try {
      const requestBody = {
        tenantName: params.tenantName,
        subject: params.subject,
        ordinal: 'true',
        send: 'false',
        creator: params.creator || {
          name: params.tenantName,
          contact: '285366268@qq.com',
          contactType: 'EMAIL'
        },
        signatories: params.signatories,
      };
      
      console.log('【契约锁】创建草稿请求:', JSON.stringify(requestBody, null, 2));
      
      const response = await this.client.post(
        '/v2/contract/draft',
        requestBody,
        { headers: this.setAuthHeaders() }
      );
      
      console.log('【契约锁】创建草稿响应:', JSON.stringify(response.data, null, 2));
      
      const result = response.data;
      if (result.code !== 0) {
        throw createError(`Qiyuesuo create draft failed: ${result.message}`, 500, 4000);
      }
      
      // 契约锁返回 result.result.id
      return { contractId: result.result.id.toString() };
    } catch (err: any) {
      console.error('【契约锁】createDraft error:', err.response?.data || err.message);
      throw createError(`创建草稿失败: ${err.response?.data?.message || err.message}`, 500, 4000);
    }
  }
  
  // 上传文件（带 contractId，上传同时关联合同）
  async uploadFileWithContractId(
    fileBuffer: Buffer, 
    fileName: string, 
    fileSuffix: string,
    contractId: string
  ): Promise<{ fileKey: string; documentId: string }> {
    try {
      const FormData = require('form-data');
      const formData = new FormData();
      formData.append('file', fileBuffer, { filename: fileName });
      formData.append('title', fileName);
      formData.append('fileSuffix', fileSuffix);
      formData.append('contractId', contractId); // 关键：同时传入 contractId
      
      const response = await this.client.post(
        '/v2/document/addbyfile',
        formData,
        {
          headers: {
            ...this.setAuthHeaders(),
            ...formData.getHeaders(),
          },
        }
      );
      
      const result = response.data;
      if (result.code !== 0) {
        throw createError(`Qiyuesuo upload failed: ${result.message}`, 500, 4000);
      }
      
      console.log('【契约锁】uploadFileWithContractId 响应:', JSON.stringify(result.data));
      
      return {
        fileKey: result.data?.fileKey || '',
        documentId: result.data?.documentId || result.data?.documentId || '',
      };
    } catch (err: any) {
      console.error('【契约锁】uploadFileWithContractId error:', err.response?.data || err.message);
      throw createError('文件上传失败', 500, 4000);
    }
  }
  
  // 上传文件（兼容旧接口）
  async uploadFile(fileBuffer: Buffer, fileName: string): Promise<{ fileKey: string; fileId: string }> {
    try {
      const FormData = require('form-data');
      const formData = new FormData();
      formData.append('file', fileBuffer, { filename: fileName });
      formData.append('title', fileName);
      formData.append('fileSuffix', 'pdf');
      
      const response = await this.client.post(
        '/v2/document/addbyfile',
        formData,
        {
          headers: {
            ...this.setAuthHeaders(),
            ...formData.getHeaders(),
          },
        }
      );
      
      const result = response.data;
      if (result.code !== 0) {
        throw createError(`Qiyuesuo upload failed: ${result.message}`, 500, 4000);
      }
      
      return {
        fileKey: result.data.fileKey,
        fileId: result.data.fileId,
      };
    } catch (err: any) {
      console.error('【契约锁】uploadFile error:', err.response?.data || err.message);
      throw createError('文件上传失败', 500, 4000);
    }
  }
  
  // 添加文档到草稿
  async addDocument(contractId: string, fileKey: string): Promise<void> {
    try {
      const response = await this.client.post(
        '/v2/document/add',
        {
          contractId,
          fileKey,
        },
        { headers: this.setAuthHeaders() }
      );
      
      const result = response.data;
      if (result.code !== 0) {
        throw createError(`Qiyuesuo add document failed: ${result.message}`, 500, 4000);
      }
    } catch (err: any) {
      console.error('【契约锁】addDocument error:', err.response?.data || err.message);
      throw createError('添加文档失败', 500, 4000);
    }
  }
  
  // 发起合同
  async sendContract(contractId: string): Promise<void> {
    try {
      const response = await this.client.post(
        '/v2/contract/send',
        { contractId },
        { headers: this.setAuthHeaders() }
      );
      
      const result = response.data;
      console.log('【契约锁】发起合同响应:', JSON.stringify(result, null, 2));
      
      if (result.code !== 0) {
        throw createError(`Qiyuesuo send contract failed: ${result.message}`, 500, 4000);
      }
    } catch (err: any) {
      console.error('【契约锁】sendContract error:', err.response?.data || err.message);
      throw createError(`发起合同失败: ${err.response?.data?.message || err.message}`, 500, 4000);
    }
  }
  
  // 获取签署页面 URL
  async getSignUrl(contractId: string, signer: {
    contact: string;
    contactType: 'MOBILE' | 'EMAIL';
  }): Promise<{ url: string }> {
    try {
      const response = await this.client.post(
        '/v2/contract/pageurl',
        {
          contractId,
          user: signer,
        },
        { headers: this.setAuthHeaders() }
      );
      
      const result = response.data;
      console.log('【契约锁】获取签署链接响应:', JSON.stringify(result, null, 2));
      
      if (result.code !== 0) {
        throw createError(`Qiyuesuo get sign url failed: ${result.message}`, 500, 4000);
      }
      
      return { url: result.data.url };
    } catch (err: any) {
      console.error('【契约锁】getSignUrl error:', err.response?.data || err.message);
      throw createError('获取签署链接失败', 500, 4000);
    }
  }
  
  // 查询合同状态
  async getContractStatus(contractId: string): Promise<{
    status: string;
    signers: Array<{
      signerKey: string;
      signerName: string;
      status: string;
      signTime?: string;
    }>;
  }> {
    try {
      const response = await this.client.get(
        `/v2/contract/detail?contractId=${contractId}`,
        { headers: this.setAuthHeaders() }
      );
      
      const result = response.data;
      if (result.code !== 0) {
        throw createError(`Qiyuesuo get status failed: ${result.message}`, 500, 4000);
      }
      
      return result.data;
    } catch (err: any) {
      console.error('【契约锁】getContractStatus error:', err.response?.data || err.message);
      throw createError('查询合同状态失败', 500, 4000);
    }
  }
  
  // 取消合同
  async cancelContract(contractId: string): Promise<void> {
    try {
      const response = await this.client.post(
        '/v2/contract/cancel',
        { contractId },
        { headers: this.setAuthHeaders() }
      );
      
      const result = response.data;
      if (result.code !== 0) {
        throw createError(`Qiyuesuo cancel failed: ${result.message}`, 500, 4000);
      }
    } catch (err: any) {
      console.error('【契约锁】cancelContract error:', err.response?.data || err.message);
      throw createError('取消合同失败', 500, 4000);
    }
  }
}

export const qiyuesuoAdapter = new QiyuesuoAdapter();
