import { QiyueSuoAdapter, CreateDraftParams } from './src/adapters/qiyuesuo.js'

const adapter = new QiyueSuoAdapter({
  token: 'Xq9b4W39km',
  secret: 'G874GA2PL21qllVJBFWiHln7JCRzCO',
  baseUrl: 'https://openapi.qiyuesuo.cn',
  tenantId: 'Xq9b4W39km'
})

async function test() {
  console.log('=== 测试创建合同草稿 ===\n')

  // 构建签署方参数
  const signatories: CreateDraftParams['signatories'] = [
    {
      tenantType: 'PERSONAL',
      tenantName: '张三',
      receiver: {
        contact: '13900000001',
        contactType: 'MOBILE'
      },
      serialNo: 0
    }
  ]

  const params: CreateDraftParams = {
    tenantName: '测试企业',  // 发起方名称
    subject: '测试合同-个人签署',  // 合同主题
    creator: {
      name: '夏开福',
      contact: '13900000001',
      contactType: 'MOBILE'
    },
    signatories,
    send: false  // 先不直接发起
  }

  try {
    console.log('请求参数:', JSON.stringify(params, null, 2))
    console.log('\n发送请求...\n')
    
    const result = await adapter.createDraft(params)
    console.log('=== 创建成功 ===')
    console.log('result:', JSON.stringify(result, null, 2))
    
    // 如果有 contractId，尝试获取签署页面
    if (result.contractId) {
      console.log('\n=== 测试获取签署页面 ===')
      const signUrl = await adapter.getSignUrl(result.contractId, '13900000001', 'MOBILE')
      console.log('签署页面URL:', signUrl.url)
    }
    
  } catch (error: any) {
    console.error('=== 创建失败 ===')
    console.error('错误:', error.message)
  }
}

test()
