import { prisma } from '../../shared/database';
import { qiyuesuoAdapter } from './qiyuesuo.adapter';
import { createError } from '../../shared/middleware';
import https from 'https';
import http from 'http';
import path from 'path';
import puppeteer from 'puppeteer';

export class SignService {
  // 下载文件
  private async downloadFile(url: string): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const isHttps = url.startsWith('https');
      const protocol = isHttps ? https : http;
      
      // 对于 HTTPS，忽略证书验证
      const options = isHttps ? { rejectUnauthorized: false } : {};
      
      protocol.get(url, options, (res) => {
        const chunks: Buffer[] = [];
        res.on('data', (chunk) => chunks.push(chunk));
        res.on('end', () => resolve(Buffer.concat(chunks)));
        res.on('error', reject);
      }).on('error', reject);
    });
  }
  
  // 生成 PDF（使用 puppeteer，完美支持中文）
  private async generatePDF(contract: any): Promise<Buffer> {
    // 解析合同数据
    let data: any = {};
    try {
      data = JSON.parse(contract.description || '{}');
    } catch {
      data = {};
    }
    
    const title = contract.title || '劳动合同';
    const contractNo = Date.now().toString().slice(-10);
    
    let htmlContent: string;
    
    // 优先使用模板内容
    if (contract.template?.content) {
      // 替换模板中的占位符
      let filledContent = contract.template.content;
      
      // 替换所有占位符
      const replacements: Record<string, string> = {
        '{{partyA}}': data.partyA || '___',
        '{{partyAAddress}}': data.partyAAddress || '___',
        '{{partyB}}': data.partyB || '___',
        '{{partyBIdCard}}': data.partyBIdCard || '___',
        '{{partyBPhone}}': data.partyBPhone || '___',
        '{{position}}': data.position || '___',
        '{{salary}}': data.salary || '___',
        '{{startDate}}': data.startDate || '___',
        '{{endDate}}': data.endDate || '___',
      };
      
      for (const [key, value] of Object.entries(replacements)) {
        filledContent = filledContent.replace(new RegExp(key, 'g'), value);
      }
      
      // 将替换后的内容转为 HTML（保留换行）
      const lines = filledContent.split('\n').map(line => 
        line.trim() ? `<p>${line}</p>` : ''
      ).join('\n');
      
      htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${title}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: "Microsoft YaHei", "SimHei", "PingFang SC", sans-serif; 
      font-size: 12pt; 
      line-height: 2; 
      padding: 60px;
      color: #333;
    }
    .title { 
      font-size: 22pt; 
      font-weight: bold; 
      text-align: center; 
      margin-bottom: 40px;
      letter-spacing: 4px;
    }
    .content {
      text-align: justify;
    }
    .content p {
      margin-bottom: 12px;
    }
    .signature {
      margin-top: 60px;
      display: flex;
      justify-content: space-between;
    }
    .signature-item {
      width: 45%;
    }
    .signature-line {
      border-bottom: 1px solid #333;
      margin-top: 50px;
      margin-bottom: 15px;
    }
    .signature-date {
      color: #666;
      font-size: 10pt;
    }
  </style>
</head>
<body>
  <h1 class="title">${title}</h1>
  <div class="content">
    ${lines}
  </div>
  <div class="signature">
    <div class="signature-item">
      <div>甲方（盖章）：</div>
      <div class="signature-line"></div>
      <div class="signature-date">日期：${data.startDate || '___'}</div>
    </div>
    <div class="signature-item">
      <div>乙方（签名）：</div>
      <div class="signature-line"></div>
      <div class="signature-date">日期：${data.startDate || '___'}</div>
    </div>
  </div>
</body>
</html>`;
    } else {
    // 使用默认模板（原有逻辑）
    const defaultHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${title}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: "Microsoft YaHei", "SimHei", "PingFang SC", sans-serif; 
      font-size: 12pt; 
      line-height: 1.8; 
      padding: 60px;
      color: #333;
    }
    .title { 
      font-size: 22pt; 
      font-weight: bold; 
      text-align: center; 
      margin-bottom: 30px;
      letter-spacing: 4px;
    }
    .header-info {
      display: flex;
      justify-content: space-between;
      margin-bottom: 30px;
      font-size: 10pt;
      color: #666;
    }
    .info-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 30px;
    }
    .info-table th, .info-table td {
      border: 1px solid #ddd;
      padding: 12px;
      text-align: left;
    }
    .info-table th {
      background-color: #f5f5f5;
      font-weight: bold;
      width: 25%;
    }
    .info-table td {
      width: 75%;
    }
    .clause {
      margin-bottom: 20px;
    }
    .clause-title {
      font-size: 13pt;
      font-weight: bold;
      margin-bottom: 8px;
      color: #1a1a1a;
    }
    .clause-content {
      text-align: justify;
    }
    .highlight {
      background-color: #fff9e6;
      padding: 2px 6px;
      border-radius: 3px;
    }
    .signature {
      margin-top: 50px;
      display: flex;
      justify-content: space-between;
    }
    .signature-item {
      width: 45%;
    }
    .signature-line {
      border-bottom: 1px solid #333;
      margin-top: 40px;
      margin-bottom: 10px;
    }
    .signature-date {
      color: #666;
      font-size: 10pt;
    }
  </style>
</head>
<body>
  <h1 class="title">${title}</h1>
  
  <div class="header-info">
    <span>合同编号：${contractNo}</span>
    <span>签订日期：${data.startDate || '___'}</span>
  </div>
  
  <table class="info-table">
    <tr>
      <th>甲方（用人单位）</th>
      <td>${data.partyA || '___'}</td>
    </tr>
    <tr>
      <th>地    址</th>
      <td>${data.partyAAddress || '___'}</td>
    </tr>
    <tr>
      <th>乙方（劳动者）</th>
      <td>${data.partyB || '___'}</td>
    </tr>
    <tr>
      <th>身份证号</th>
      <td>${data.partyBIdCard || '___'}</td>
    </tr>
    <tr>
      <th>联系电话</th>
      <td>${data.partyBPhone || '___'}</td>
    </tr>
  </table>
  
  <div class="clause">
    <div class="clause-title">一、工作内容</div>
    <div class="clause-content">乙方同意在甲方担任 <span class="highlight">${data.position || '___'}</span> 工作，具体工作内容和职责按照甲方岗位职责要求执行。</div>
  </div>
  
  <div class="clause">
    <div class="clause-title">二、合同期限</div>
    <div class="clause-content">本合同期限从 <span class="highlight">${data.startDate || '___'}</span> 起至 <span class="highlight">${data.endDate || '___'}</span> 止。合同期满后，如双方同意，可续签合同。</div>
  </div>
  
  <div class="clause">
    <div class="clause-title">三、工作报酬</div>
    <div class="clause-content">甲方每月向乙方支付工资人民币 <span class="highlight">¥${data.salary || '___'}</span> 元（大写：${this.numberToChinese(data.salary || 0)}元整）。工资发放时间为每月15日前。</div>
  </div>
  
  <div class="clause">
    <div class="clause-title">四、工作时间</div>
    <div class="clause-content">甲方执行标准工时制度，乙方每日工作时间不超过8小时，每周工作时间不超过40小时。甲方因生产经营需要安排乙方加班的，按照国家规定支付加班工资。</div>
  </div>
  
  <div class="clause">
    <div class="clause-title">五、社会保险</div>
    <div class="clause-content">甲方依法为乙方缴纳养老、医疗、失业、工伤、生育等社会保险。乙方个人应缴纳的社会保险费由甲方代扣代缴。</div>
  </div>
  
  <div class="clause">
    <div class="clause-title">六、劳动保护</div>
    <div class="clause-content">甲方为乙方提供符合国家规定的劳动安全卫生条件和必要的劳动防护用品。乙方应当严格遵守甲方依法制定的各项安全操作规程。</div>
  </div>
  
  <div class="clause">
    <div class="clause-title">七、合同变更</div>
    <div class="clause-content">经甲乙双方协商一致，可以变更本合同的内容。变更后的合同文本双方各执一份。</div>
  </div>
  
  <div class="clause">
    <div class="clause-title">八、违约责任</div>
    <div class="clause-content">甲乙双方任何一方违反本合同约定的，应当按照法律规定承担相应的违约责任。</div>
  </div>
  
  <div class="clause">
    <div class="clause-title">九、争议解决</div>
    <div class="clause-content">因本合同发生的争议，甲乙双方应当协商解决；协商不成的，可以向甲方所在地劳动争议仲裁委员会申请仲裁。</div>
  </div>
  
  <div class="clause">
    <div class="clause-title">十、其他约定</div>
    <div class="clause-content">本合同未尽事宜，甲乙双方可另行签订补充协议，补充协议与本合同具有同等法律效力。本合同一式两份，甲乙双方各执一份，自双方签字盖章之日起生效。</div>
  </div>
  
  <div class="signature">
    <div class="signature-item">
      <div>甲方（盖章）：</div>
      <div class="signature-line"></div>
      <div class="signature-date">日期：${data.startDate || '___'}</div>
    </div>
    <div class="signature-item">
      <div>乙方（签名）：</div>
      <div class="signature-line"></div>
      <div class="signature-date">日期：${data.startDate || '___'}</div>
    </div>
  </div>
</body>
</html>`;

    htmlContent = defaultHtml;
    }
    
    // 使用 puppeteer 生成 PDF
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
    
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: 0, bottom: 0, left: 0, right: 0 }
    });
    
    await browser.close();
    
    return Buffer.from(pdfBuffer);
  }
  
  // 数字转中文大写
  private numberToChinese(num: number | string): string {
    const numVal = typeof num === 'string' ? parseInt(num) || 0 : num;
    const chineseNumbers = ['零', '壹', '贰', '叁', '肆', '伍', '陆', '柒', '捌', '玖'];
    const units = ['', '拾', '佰', '仟', '万'];
    const numStr = String(numVal);
    let result = '';
    for (let i = 0; i < numStr.length; i++) {
      const n = parseInt(numStr[i]);
      if (!isNaN(n)) {
        result += chineseNumbers[n];
        if (numStr.length - i - 1 > 0) {
          result += units[Math.min(numStr.length - i - 1, 4)];
        }
      }
    }
    return result || '零';
  }
  private numberToChinese(num: number | string): string {
    const numVal = typeof num === 'string' ? parseInt(num) || 0 : num;
    const chineseNumbers = ['零', '壹', '贰', '叁', '肆', '伍', '陆', '柒', '捌', '玖'];
    const units = ['', '拾', '佰', '仟', '万'];
    const numStr = String(numVal);
    let result = '';
    for (let i = 0; i < numStr.length; i++) {
      const n = parseInt(numStr[i]);
      if (!isNaN(n)) {
        result += chineseNumbers[n];
        if (numStr.length - i - 1 > 0) {
          result += units[Math.min(numStr.length - i - 1, 4)];
        }
      }
    }
    return result || '零';
  }
  
  // 发起签署流程
  async initiateSign(userId: string, contractId: string) {
    // 获取合同详情（含模板信息）
    const contract = await prisma.contract.findUnique({
      where: { id: contractId },
      include: {
        signers: { orderBy: { signOrder: 'asc' } },
        user: true,
        template: true,
      },
    });
    
    if (!contract || contract.userId !== userId) {
      throw createError('Contract not found', 404, 3000);
    }
    
    if (contract.status !== 'PENDING') {
      throw createError('Contract is not in pending status', 400, 3001);
    }
    
    if (contract.signers.length === 0) {
      throw createError('No signers', 400, 3003);
    }
    
    // 获取文件URL和模板内容
    const fileUrl = contract.fileUrl || contract.template?.fileUrl;
    const hasTemplateContent = contract.template?.content && contract.template.content.length > 0;
    // 检查是否有合同内容可以生成PDF
    const hasContent = contract.description && contract.description.length > 0;
    
    // 优先使用模板内容生成PDF，而不是下载无效的fileUrl
    const shouldGeneratePDF = hasTemplateContent && hasContent;
    
    // 构建签署方列表
    const signatories = contract.signers.map((signer, index) => ({
      tenantType: 'PERSONAL' as const,
      tenantName: signer.name,
      receiver: {
        contact: signer.phone || signer.email || '',
        contactType: signer.phone ? 'MOBILE' as const : 'EMAIL' as const,
      },
      serialNo: String(index),
    }));
    
    let qiyuesuoContractId = '';
    let hasFile = false;
    
    try {
      // 1. 创建草稿（带创建者信息 - 使用企业管理员账号）
      const draftResult = await qiyuesuoAdapter.createDraft({
        tenantName: '集成测试中心', // 使用测试企业名称
        subject: contract.title,
        creator: {
          name: '夏开福', // 企业管理员
          contact: '285366268@qq.com',
          contactType: 'EMAIL',
        },
        signatories,
      });
      
      qiyuesuoContractId = draftResult.contractId;
      
      // 2. 处理文件：优先使用模板内容生成PDF
      let hasFile = false;
      
      if (shouldGeneratePDF) {
        // 2.1 有模板内容和数据，生成PDF
        try {
          console.log('【契约锁】使用模板生成PDF...');
          const pdfBuffer = await this.generatePDF(contract);
          
          const uploadResult = await qiyuesuoAdapter.uploadFileWithContractId(
            pdfBuffer,
            `${contract.title || '合同'}.pdf`,
            'pdf',
            qiyuesuoContractId
          );
          
          console.log('【契约锁】PDF生成并上传成功, documentId:', uploadResult.documentId);
          hasFile = true;
          
        } catch (pdfErr: any) {
          console.log('【契约锁】PDF生成失败:', pdfErr.message);
        }
      } else if (fileUrl && fileUrl.startsWith('http')) {
        // 2.1 有文件URL，下载上传
        try {
          console.log('【契约锁】下载文件:', fileUrl);
          const fileBuffer = await this.downloadFile(fileUrl);
          
          const ext = path.extname(fileUrl).toLowerCase();
          const fileName = path.basename(fileUrl);
          let fileSuffix = 'pdf';
          
          if (ext === '.doc') fileSuffix = 'doc';
          else if (ext === '.docx') fileSuffix = 'docx';
          else if (ext === '.pdf') fileSuffix = 'pdf';
          
          console.log('【契约锁】上传文件:', fileName, '类型:', fileSuffix);
          
          const uploadResult = await qiyuesuoAdapter.uploadFileWithContractId(
            fileBuffer,
            fileName,
            fileSuffix,
            qiyuesuoContractId
          );
          
          console.log('【契约锁】文件上传成功, documentId:', uploadResult.documentId);
          hasFile = true;
          
        } catch (uploadErr: any) {
          console.log('【契约锁】文件上传失败:', uploadErr.message);
        }
      } else if (hasContent) {
        // 2.2 没有文件URL但有内容，自动生成PDF
        try {
          console.log('【契约锁】自动生成PDF...');
          const pdfBuffer = await this.generatePDF(contract);
          
          const uploadResult = await qiyuesuoAdapter.uploadFileWithContractId(
            pdfBuffer,
            `${contract.title || '合同'}.pdf`,
            'pdf',
            qiyuesuoContractId
          );
          
          console.log('【契约锁】PDF生成并上传成功, documentId:', uploadResult.documentId);
          hasFile = true;
          
        } catch (pdfErr: any) {
          console.log('【契约锁】PDF生成失败:', pdfErr.message);
        }
      }
      
      // 3. 发起合同
      try {
        await qiyuesuoAdapter.sendContract(qiyuesuoContractId);
        console.log('【契约锁】合同发起成功');
      } catch (sendErr: any) {
        console.log('【契约锁】发起合同:', sendErr.message);
      }
      
      // 4. 更新合同状态
      const updated = await prisma.contract.update({
        where: { id: contractId },
        data: {
          status: hasFile ? 'PENDING' : 'DRAFT',
          fileKey: qiyuesuoContractId, // 保存契约锁的合同ID
        },
        include: { signers: true },
      });
      
      // 5. 记录日志
      await prisma.contractLog.create({
        data: {
          contractId,
          action: 'INITIATE_SIGN',
          operator: userId,
          content: `Sign initiated on Qiyuesuo: ${qiyuesuoContractId}, hasFile: ${hasFile}`,
        },
      });
      
      return {
        ...updated,
        signUrl: hasFile ? undefined : '需要上传文件才能获取签署链接'
      };
    } catch (err) {
      console.error('Initiate sign error:', err);
      throw createError('Failed to initiate sign', 500, 4000);
    }
  }
  
  // 获取签署页面 URL
  async getSignUrl(contractId: string, signerId: string) {
    const signer = await prisma.contractSigner.findUnique({
      where: { id: signerId },
      include: { contract: true },
    });
    
    if (!signer || !signer.contract) {
      throw createError('Signer not found', 404, 3000);
    }
    
    const contract = signer.contract;
    
    if (!contract.fileKey) {
      throw createError('Contract not initiated for signing', 400, 3001);
    }
    
    if (signer.status === 'SIGNED') {
      throw createError('Already signed', 400, 3004);
    }
    
    try {
      const { url } = await qiyuesuoAdapter.getSignUrl(contract.fileKey, {
        contact: signer.phone || signer.email || '',
        contactType: signer.phone ? 'MOBILE' : 'EMAIL',
      });
      
      return { url };
    } catch (err) {
      console.error('Get sign url error:', err);
      throw createError('Failed to get sign url', 500, 4000);
    }
  }
  
  // 处理签署回调
  async handleCallback(data: {
    processId: string;
    processStatus: string;
    eventType: string;
    signStatus?: string;
    signTime?: string;
    signer?: {
      signerKey: string;
      signerName: string;
    };
  }) {
    // 根据 contractId 查找合同（通过 fileKey）
    const contract = await prisma.contract.findFirst({
      where: { fileKey: data.processId },
      include: { signers: true },
    });
    
    if (!contract) {
      console.error('Contract not found for processId:', data.processId);
      return { message: 'Contract not found' };
    }
    
    // 更新签署方状态
    if (data.signer) {
      const signer = contract.signers.find(
        s => s.name === data.signer?.signerName
      );
      
      if (signer && data.signStatus === 'signed') {
        await prisma.contractSigner.update({
          where: { id: signer.id },
          data: {
            status: 'SIGNED',
            signedAt: data.signTime ? new Date(data.signTime) : new Date(),
          },
        });
        
        // 记录签署
        await prisma.signature.create({
          data: {
            contractId: contract.id,
            signerId: signer.id,
            signType: 'HANDWRITTEN',
          },
        });
      }
    }
    
    // 检查是否全部签署完成
    const allSigners = await prisma.contractSigner.findMany({
      where: { contractId: contract.id },
    });
    
    const allSigned = allSigners.every(s => s.status === 'SIGNED');
    
    if (allSigned && contract.status !== 'COMPLETED') {
      await prisma.contract.update({
        where: { id: contract.id },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
        },
      });
      
      // 记录日志
      await prisma.contractLog.create({
        data: {
          contractId: contract.id,
          action: 'COMPLETE',
          content: 'All signers have signed',
        },
      });
    }
    
    return { message: 'Callback processed' };
  }
  
  // 查询签署状态
  async getSignStatus(userId: string, contractId: string) {
    const contract = await prisma.contract.findFirst({
      where: { id: contractId, userId },
      include: {
        signers: { orderBy: { signOrder: 'asc' } },
        signatures: true,
      },
    });
    
    if (!contract) {
      throw createError('Contract not found', 404, 3000);
    }
    
    // 如果有契约锁合同ID，可以查询实际状态
    if (contract.fileKey) {
      try {
        const qiyuesuoStatus = await qiyuesuoAdapter.getContractStatus(contract.fileKey);
        return {
          contract,
          qiyuesuoStatus,
        };
      } catch (err) {
        console.error('Get Qiyuesuo status error:', err);
      }
    }
    
    return { contract };
  }
}

export const signService = new SignService();
