import express from 'express';
import cors from 'cors';
import { config } from './shared/config';
import { errorMiddleware, notFoundMiddleware } from './shared/middleware';

// 导入模块路由
import { authRoutes } from './modules/auth';
import { userRoutes } from './modules/user';
import { contractRoutes } from './modules/contract';
import { templateRoutes } from './modules/template';
import { signRoutes } from './modules/sign';
import { paymentRoutes } from './modules/payment';

const app = express();
const PORT = config.port;

// 中间件
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// 静态文件（上传的合同文件）
app.use('/uploads', express.static('uploads'));

// 健康检查
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    version: '2.0.0',
  });
});

// API 路由（v1 版本）
app.use('/api/v1/auth', authRoutes);      // 认证：注册、登录、Token
app.use('/api/v1/users', userRoutes);     // 用户：个人信息、企业、成员
app.use('/api/v1/contracts', contractRoutes);  // 合同
app.use('/api/v1/templates', templateRoutes);  // 模板
app.use('/api/v1/sign', signRoutes);       // 签署
app.use('/api/v1/payment', paymentRoutes);  // 支付

// 兼容旧版路由（v0）
// 如果需要可以保留，暂时注释掉
// app.use('/api/auth', authRoutes);      
// app.use('/api/users', userRoutes);     
// app.use('/api/contracts', contractRoutes);  
// app.use('/api/templates', templateRoutes);  
// app.use('/api/sign', signRoutes);       

// 404 处理
app.use(notFoundMiddleware);

// 错误处理
app.use(errorMiddleware);

// 启动服务器
app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║   🚀 签签通后端服务启动成功                                  ║
║                                                           ║
║   本地: http://localhost:${PORT}                            ║
║   API:  http://localhost:${PORT}/api/v1                    ║
║   健康检查: http://localhost:${PORT}/api/health             ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
  `);
});

export default app;
