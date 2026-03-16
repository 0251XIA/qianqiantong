import crypto from 'crypto'

const token = 'Xq9b4W39km'
const secret = 'G874GA2PL21qllVJBFWiHln7JCRzCO'
const baseUrl = 'https://openapi.qiyuesuo.cn'

async function test() {
  const timestamp = Date.now().toString()
  const nonce = Math.random().toString(36).substring(2, 15)

  // 计算签名
  const signStr = token + secret + timestamp + nonce
  const sign = crypto.createHash('md5').update(signStr).digest('hex').toLowerCase()

  console.log('sign:', sign)

  const url = `${baseUrl}/api/v2/contract/draft`

  const postData = { 
    tenantId: token, 
    timestamp, 
    token, 
    nonce, 
    sign,
    subject: '测试合同',
    tenantName: '测试企业',
    ordinal: 'true'
  }

  const res = await fetch(url, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'x-qys-open-accesstoken': token,
      'x-qys-open-signature': sign,
      'x-qys-open-timestamp': timestamp,
      'x-qys-open-nonce': nonce
    },
    body: JSON.stringify(postData)
  })

  const text = await res.text()
  console.log('Status:', res.status)
  console.log('Result:', text)
}

test()
