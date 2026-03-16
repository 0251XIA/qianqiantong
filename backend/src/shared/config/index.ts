// 环境配置
export const config = {
  // 环境
  nodeEnv: process.env.NODE_ENV || 'development',
  
  // 服务器
  port: parseInt(process.env.PORT || '3000', 10),
  
  // 数据库
  database: {
    url: process.env.DATABASE_URL || 'file:./dev.db',
  },
  
  // JWT
  jwt: {
    secret: process.env.JWT_SECRET || 'your-secret-key-change-in-production',
    accessTokenExpire: '2h',
    refreshTokenExpire: '7d',
  },
  
  // 契约锁
  qiyuesuo: {
    apiUrl: process.env.QIYUESUO_API_URL || 'https://openapi.qiyuesuo.cn',
    token: process.env.QIYUESUO_TOKEN || 'Xq9b4W39km',
    secret: process.env.QIYUESUO_SECRET || 'G874GA2PL21qllVJBFWiHln7JCRzCO',
    tenantId: process.env.QIYUESUO_TENANT_ID || 'Xq9b4W39km',
  },
  
  // 短信
  sms: {
    accessKeyId: process.env.SMS_ACCESS_KEY_ID || '',
    accessKeySecret: process.env.SMS_ACCESS_KEY_SECRET || '',
    signName: process.env.SMS_SIGN_NAME || '签签通',
    templateCode: process.env.SMS_TEMPLATE_CODE || '',
  },
  
  // 支付
  payment: {
    alipay: {
      appId: process.env.ALIPAY_APP_ID || '',
      privateKey: process.env.ALIPAY_PRIVATE_KEY || '',
      alipayPublicKey: process.env.ALIPAY_PUBLIC_KEY || '',
    },
    wechat: {
      appId: process.env.WECHAT_APP_ID || '',
      mchId: process.env.WECHAT_MCH_ID || '',
      apiKey: process.env.WECHAT_API_KEY || '',
    },
  },
};
