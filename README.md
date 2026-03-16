# 签签通 V28 - 电子合同签署平台

## Windows 快速启动

### 方式一：双击启动（推荐）

1. 解压 `esign-platform.zip`
2. 进入文件夹
3. 双击 `start.bat`
4. 等待自动打开浏览器

### 方式二：手动启动

```cmd
cd backend
npm install
npm run dev
```

再开一个终端：
```cmd
cd frontend
npm install
npm run dev
```

---

## 访问地址

- 前端：http://localhost:5173
- 后端：http://localhost:3000
- API：http://localhost:3000/api/v1

---

## 测试账号

手机号：13996733243
密码：test123

---

## 功能说明

| 功能 | 说明 |
|------|------|
| 模板管理 | 创建和管理合同模板 |
| 合同创建 | 填写合同信息，自动触发契约锁 |
| 发起签署 | 上传合同文件，获取签署链接 |
| 企业管理 | 创建企业，添加成员 |
| 套餐购买 | 购买套餐，模拟支付 |

---

## 契约锁配置

已配置测试账号：
- 接口地址：https://openapi.qiyuesuo.cn
- 企业：集成测试中心
- 账号：285366268@qq.com
