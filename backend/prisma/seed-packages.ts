import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // 创建套餐
  const packages = [
    {
      id: 'pkg_basic',
      name: '基础版',
      type: 'MONTHLY',
      price: 9.9,
      originalPrice: 19.9,
      duration: 30,
      contractCount: 10,
      features: JSON.stringify(['基础合同签署', '模板管理', '短信通知']),
      isPopular: false,
      status: 'ACTIVE',
      sort: 1,
    },
    {
      id: 'pkg_pro',
      name: '专业版',
      type: 'YEARLY',
      price: 99,
      originalPrice: 199,
      duration: 365,
      contractCount: 100,
      features: JSON.stringify(['基础合同签署', '模板管理', '短信通知', '企业成员管理', 'API接口']),
      isPopular: true,
      status: 'ACTIVE',
      sort: 2,
    },
    {
      id: 'pkg_enterprise',
      name: '企业版',
      type: 'YEARLY',
      price: 299,
      originalPrice: 599,
      duration: 365,
      contractCount: 500,
      features: JSON.stringify(['基础合同签署', '模板管理', '短信通知', '企业成员管理', 'API接口', '专属客服', '优先处理']),
      isPopular: false,
      status: 'ACTIVE',
      sort: 3,
    },
  ];

  for (const pkg of packages) {
    await prisma.package.upsert({
      where: { id: pkg.id },
      update: pkg,
      create: pkg,
    });
  }

  console.log('✅ 套餐数据创建完成');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
