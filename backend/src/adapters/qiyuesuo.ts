import crypto from 'crypto'

/**
 * 契约锁 API 适配器
 * 文档：https://open.qiyuesuo.cn/
 */

export interface Signer {
  name: string
  phone?: string
  email?: string
  identityType?: 'PHONE' | 'NAME_IDCARD' | 'REAL_NAME' | 'ENTERPRISE'
  signOrder?: number
  // 扩展字段 - 对应契约锁API
  tenantType?: 'PERSONAL' | 'COMPANY'
  tenantName?: string
  contact?: string
  contactType?: 'MOBILE' | 'EMAIL'
  actions?: Array<{
    type: 'AUDIT' | 'COMPANY' | 'SIGN'
    name: string
    serialNo?: number
    corpOperators?: Array<{
      name: string
      contact: string
      contactType: 'MOBILE' | 'EMAIL'
    }>
  }>
}

export interface QiyuesuoConfig {
  token: string
  secret: string
  baseUrl: string
  tenantId?: string
}

export interface UploadResult {
  fileKey: string
  fileName: string
}

export interface FlowResult {
  flowId: string
  flowUrl?: string
  draftId?: string  // 草稿ID
}

export interface SignResult {
  success: boolean
  message?: string
}

export interface SignStatus {
  status: 'PENDING' | 'SIGNED' | 'REJECTED' | 'EXPIRED' | 'PARTIAL_SIGNED' | 'COMPLETED'
  signers: {
    name: string
    status: string
    signedAt?: string
  }[]
}

export interface CreateDraftParams {
  tenantName: string  // 发起方名称
  subject: string     // 合同主题
  creator: {
    name: string
    contact: string
    contactType: 'MOBILE' | 'EMAIL'
  }
  category?: {
    id?: string
    name?: string
  }
  signatories: Array<{
    tenantType: 'PERSONAL' | 'COMPANY'
    tenantName: string
    receiver?: {
      name?: string
      contact: string
      contactType: 'MOBILE' | 'EMAIL'
    }
    serialNo: number
    actions?: Array<{
      type: 'AUDIT' | 'COMPANY' | 'SIGN'
      name: string
      serialNo?: number
      corpOperators?: Array<{
        name: string
        contact: string
        contactType: 'MOBILE' | 'EMAIL'
      }>
    }>
  }>
  send?: boolean
  templateParams?: Array<{
    name: string
    value: string
  }>
}

export interface DraftResult {
  contractId: string
  documentId?: string
}

export class QiyueSuoAdapter {
  private token: string
  private secret: string
  private baseUrl: string
  private tenantId: string

  constructor(config: QiyuesuoConfig) {
    this.token = config.token
    this.secret = config.secret
    this.baseUrl = config.baseUrl.replace(/\/$/, '')
    this.tenantId = config.tenantId || this.token
  }

  /**
   * 计算签名
   * 签名算法：MD5(AppToken + AppSecret + timestamp + nonce)
   */
  private generateSignature(params: Record<string, any>): string {
    const crypto = require('crypto')
    const nonce = params.nonce || ''
    const signStr = this.token + this.secret + params.timestamp + nonce
    return crypto.createHash('md5').update(signStr).digest('hex').toLowerCase()
  }

  /**
   * 生成公共参数
   */
  private getCommonParams(): Record<string, any> {
    const timestamp = Date.now().toString()
    const nonce = Math.random().toString(36).substring(2, 15)
    const params: Record<string, any> = {
      tenantId: this.tenantId,
      timestamp,
      token: this.token,
      nonce
    }
    params.sign = this.generateSignature(params)
    return params
  }

  /**
   * 发送 API 请求
   */
  private async request<T = any>(
    method: 'GET' | 'POST',
    path: string,
    data?: Record<string, any>
  ): Promise<T> {
    const commonParams = this.getCommonParams()
    
    let url = `${this.baseUrl}${path}`
    let body: string | undefined
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'x-qys-open-accesstoken': this.token,
      'x-qys-open-signature': commonParams.sign,
      'x-qys-open-timestamp': commonParams.timestamp,
      'x-qys-open-nonce': commonParams.nonce
    }

    if (method === 'GET' && data) {
      // GET 请求将参数拼接到 URL
      const queryString = Object.entries({ ...commonParams, ...data })
        .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
        .join('&')
      url += `?${queryString}`
    } else if (method === 'POST') {
      // POST 请求将公共参数和业务参数合并
      const postData = { ...commonParams, ...data }
      body = JSON.stringify(postData)
    }

    console.log(`[QiyueSuo] ${method} ${url}`, body ? JSON.parse(body) : '')

    const response = await fetch(url, {
      method,
      headers,
      body
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`HTTP ${response.status}: ${errorText}`)
    }

    const result: any = await response.json()
    console.log('[QiyueSuo] Response:', result)

    // 检查业务错误
    if (result.code !== 0 && result.code !== 200) {
      throw new Error(`API Error: ${result.msg || result.message || JSON.stringify(result)}`)
    }

    return result.data || result
  }

  /**
   * 上传文件到契约锁（返回 fileKey）
   * @param fileUrl 文件URL
   * @param fileName 文件名
   */
  async uploadFile(fileUrl: string, fileName: string): Promise<UploadResult> {
    try {
      // 如果是本地或外部URL，需要先下载文件
      let fileBuffer: ArrayBuffer | null = null
      let contentType = 'application/pdf'

      if (fileUrl.startsWith('http://') || fileUrl.startsWith('https://')) {
        const fileResponse = await fetch(fileUrl)
        fileBuffer = await fileResponse.arrayBuffer()
        const contentTypeHeader = fileResponse.headers.get('content-type')
        if (contentTypeHeader) contentType = contentTypeHeader
      }

      // 生成 multipart 请求
      const boundary = `----WebKitFormBoundary${Date.now()}`
      
      // 准备公共参数
      const timestamp = Date.now().toString()
      const signParams: Record<string, any> = {
        tenantId: this.tenantId,
        timestamp,
        token: this.token,
        fileName
      }
      const sign = this.generateSignature(signParams)

      // 构建 multipart form data
      const parts: string[] = []
      
      // 公共参数
      parts.push(`--${boundary}\r\nContent-Disposition: form-data; name="tenantId"\r\n\r\n${this.tenantId}`)
      parts.push(`--${boundary}\r\nContent-Disposition: form-data; name="timestamp"\r\n\r\n${timestamp}`)
      parts.push(`--${boundary}\r\nContent-Disposition: form-data; name="token"\r\n\r\n${this.token}`)
      parts.push(`--${boundary}\r\nContent-Disposition: form-data; name="sign"\r\n\r\n${sign}`)
      parts.push(`--${boundary}\r\nContent-Disposition: form-data; name="fileName"\r\n\r\n${fileName}`)
      
      // 文件
      if (fileBuffer) {
        const base64 = Buffer.from(fileBuffer).toString('base64')
        parts.push(`--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${fileName}"\r\nContent-Type: ${contentType}\r\n\r\n${base64}`)
      }
      
      parts.push(`--${boundary}--`)

      const uploadUrl = `${this.baseUrl}/v2/file/upload`
      
      const uploadResponse = await fetch(uploadUrl, {
        method: 'POST',
        headers: {
          'Content-Type': `multipart/form-data; boundary=${boundary}`
        },
        body: parts.join('\r\n')
      })

      const result: any = await uploadResponse.json()
      console.log('[QiyueSuo] Upload result:', result)

      if (result.code !== 0 && result.code !== 200) {
        throw new Error(result.msg || 'Upload failed')
      }

      return {
        fileKey: result.data?.fileKey || result.data?.filekey || result.fileKey,
        fileName
      }
    } catch (error) {
      console.error('[QiyueSuo] Upload error:', error)
      throw error
    }
  }

  /**
   * 创建合同草稿
   * @param params 创建参数
   */
  async createDraft(params: CreateDraftParams): Promise<DraftResult> {
    // 构建 signatories
    const signatories = params.signatories.map(s => ({
      tenantType: s.tenantType,
      tenantName: s.tenantName,
      receiver: s.receiver ? {
        name: s.receiver.name,
        contact: s.receiver.contact,
        contactType: s.receiver.contactType
      } : undefined,
      serialNo: String(s.serialNo),
      actions: s.actions?.map(a => ({
        type: a.type,
        name: a.name,
        serialNo: a.serialNo ? String(a.serialNo) : undefined,
        corpOperators: a.corpOperators?.map(op => ({
          name: op.name,
          contact: op.contact,
          contactType: op.contactType
        }))
      }))
    }))

    const data: Record<string, any> = {
      tenantName: params.tenantName,
      subject: params.subject,
      ordinal: 'true',
      send: params.send ? 'true' : 'false',
      creator: {
        name: params.creator.name,
        contact: params.creator.contact,
        contactType: params.creator.contactType
      },
      signatories
    }

    // 可选参数
    if (params.category) {
      data.category = params.category
    }
    if (params.templateParams) {
      data.templateParams = params.templateParams
    }

    const result = await this.request<any>('POST', '/v2/contract/draft', data)
    
    return {
      contractId: result.contractId || result.contractId || result.id,
      documentId: result.documentId
    }
  }

  /**
   * 发起合同（创建草稿时直接send=true可以跳过此步骤）
   * @param contractId 合同ID
   */
  async sendContract(contractId: string): Promise<SignResult> {
    const data = {
      contractId
    }

    await this.request('POST', '/v2/contract/send', data)

    return {
      success: true,
      message: '合同已发起'
    }
  }

  /**
   * 获取签署页面地址
   * @param contractId 合同ID
   * @param contact 联系方式
   * @param contactType 联系方式类型
   */
  async getSignUrl(contractId: string, contact: string, contactType: 'MOBILE' | 'EMAIL' = 'MOBILE'): Promise<{ url: string }> {
    const data = {
      contractId,
      user: {
        contact,
        contactType
      }
    }

    const result = await this.request<any>('POST', '/v2/contract/signpage', data)
    
    return {
      url: result.url || result.signUrl || result
    }
  }

  /**
   * 获取浏览页面地址
   * @param contractId 合同ID
   */
  async getViewUrl(contractId: string): Promise<{ url: string }> {
    const data = {
      contractId
    }

    const result = await this.request<any>('POST', '/v2/contract/viewpage', data)
    
    return {
      url: result.url || result.viewUrl || result
    }
  }

  /**
   * 下载合同文档
   * @param documentId 文档ID
   */
  async downloadDocument(documentId: string): Promise<Buffer> {
    const timestamp = Date.now().toString()
    const signParams: Record<string, any> = {
      tenantId: this.tenantId,
      timestamp,
      token: this.token,
      documentId
    }
    const sign = this.generateSignature(signParams)

    const url = `${this.baseUrl}/v2/document/download?tenantId=${this.tenantId}&timestamp=${timestamp}&token=${this.token}&sign=${sign}&documentId=${documentId}`

    const response = await fetch(url)
    
    if (!response.ok) {
      throw new Error(`Download failed: ${response.status}`)
    }

    const buffer = await response.arrayBuffer()
    return Buffer.from(buffer)
  }

  /**
   * 添加文档到草稿（兼容旧接口）
   * @param draftId 草稿ID（创建草稿时返回）
   * @param fileKey 文件Key（通过uploadFile上传后返回）
   */
  async addDocumentToDraft(draftId: string, fileKey: string): Promise<{ success: boolean }> {
    const data = {
      draftId,
      fileKey
    }

    const result = await this.request<any>('POST', '/v2/document/addbyfile', data)
    
    return {
      success: result ? true : false
    }
  }

  /**
   * 创建签署流程
   * @param contractId 合同ID
   * @param title 合同标题
   * @param fileKey 文件Key
   * @param signers 签署方列表
   */
  async createFlow(
    contractId: string,
    title: string,
    fileKey: string,
    signers: Signer[]
  ): Promise<FlowResult> {
    const data = {
      title,
      fileKey,
      // 业务自定义ID，用于关联
      businessId: contractId,
      // 签署方列表
      signatories: signers.map((signer, index) => ({
        name: signer.name,
        mobile: signer.phone,
        email: signer.email,
        idType: signer.identityType || 'PHONE',
        // 签署顺序
        serialNo: signer.signOrder || index + 1,
        // 签署类型：1-手动签署
        signType: 1
      }))
    }

    const result = await this.request<any>('POST', '/api/v2/flow/create', data)

    return {
      flowId: result.flowId || result.flowid,
      flowUrl: result.flowUrl || result.flowurl
    }
  }

  /**
   * 发起签署
   * @param flowId 流程ID
   */
  async sendSign(flowId: string): Promise<SignResult> {
    const data = {
      flowId
    }

    await this.request('POST', '/api/v2/flow/send', data)

    return {
      success: true,
      message: '签署请求已发送'
    }
  }

  /**
   * 获取签署状态
   * @param flowId 流程ID
   */
  async getStatus(flowId: string): Promise<SignStatus> {
    const result = await this.request<any>('GET', '/api/v2/flow/status', {
      flowId
    })

    return {
      status: this.mapStatus(result.status),
      signers: (result.signatories || result.signList || []).map((s: any) => ({
        name: s.name,
        status: this.mapSignerStatus(s.status),
        signedAt: s.signTime
      }))
    }
  }

  /**
   * 下载签署文件
   * @param flowId 流程ID
   * @param type 文件类型：pdf-已签署合同，zip-签署过程文档包
   */
  async downloadFile(flowId: string, type: 'pdf' | 'zip' = 'pdf'): Promise<Buffer> {
    const timestamp = Date.now().toString()
    const signParams: Record<string, any> = {
      tenantId: this.tenantId,
      timestamp,
      token: this.token,
      flowId,
      type
    }
    const sign = this.generateSignature(signParams)

    const url = `${this.baseUrl}/api/v2/file/download?tenantId=${this.tenantId}&timestamp=${timestamp}&token=${this.token}&sign=${sign}&flowId=${flowId}&type=${type}`

    const response = await fetch(url)
    
    if (!response.ok) {
      throw new Error(`Download failed: ${response.status}`)
    }

    const buffer = await response.arrayBuffer()
    return Buffer.from(buffer)
  }

  /**
   * 映射合同状态
   */
  private mapStatus(status: string | number): SignStatus['status'] {
    const statusMap: Record<string, SignStatus['status']> = {
      'DRAFT': 'PENDING',
      'PENDING': 'PENDING',
      'PARTIAL_SIGNED': 'PARTIAL_SIGNED',
      'COMPLETED': 'COMPLETED',
      'SIGNED': 'COMPLETED',
      'REJECTED': 'REJECTED',
      'EXPIRED': 'EXPIRED',
      'CANCELLED': 'REJECTED'
    }
    return statusMap[String(status).toUpperCase()] || 'PENDING'
  }

  /**
   * 映射签署方状态
   */
  private mapSignerStatus(status: string | number): string {
    const statusMap: Record<string, string> = {
      'PENDING': 'PENDING',
      'WAITING': 'PENDING',
      'SIGNED': 'SIGNED',
      'COMPLETE': 'SIGNED',
      'REJECTED': 'REJECTED',
      'DECLINED': 'REJECTED',
      'EXPIRED': 'EXPIRED',
      'NOT_SIGNED': 'PENDING'
    }
    return statusMap[String(status).toUpperCase()] || 'PENDING'
  }
}

// 默认配置实例
export const qiyuesuoAdapter = new QiyueSuoAdapter({
  token: 'Xq9b4W39km',
  secret: 'G874GA2PL21qllVJBFWiHln7JCRzCO',
  baseUrl: 'https://openapi.qiyuesuo.cn',  // 测试环境
  tenantId: 'Xq9b4W39km'
})

export default QiyueSuoAdapter
