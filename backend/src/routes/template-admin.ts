import { Router, Request, Response } from 'express'
import prisma from '../prisma'

const router = Router()

// 预设模板数据
const systemTemplates = [
  {
    name: '租赁合同',
    category: '租赁',
    description: '适用于房屋、设备等租赁场景',
    content: `租赁合同

甲方（出租方）：{{party_a}}
乙方（承租方）：{{party_b}}

根据《中华人民共和国合同法》及相关法律法规，甲乙双方本着平等自愿的原则，就租赁事宜达成如下协议：

一、租赁物
乙方租赁甲方位于{{rental_item}}的物品/房屋作为使用。

二、租金及支付方式
每月租金人民币{{rent}}元，乙方应于每月{{pay_day}}日前支付当月租金。

三、租期
本合同租期为{{term}}个月，自{{start_date}}起至{{end_date}}止。

四、押金
乙方需支付押金{{deposit}}元，合同期满后无违约行为全额退还。

甲方（签字）：_______________  日期：___________
乙方（签字）：_______________  日期：___________`,
    fields: [
      { key: 'party_a', label: '甲方（出租方）', type: 'text', required: true, placeholder: '请输入甲方名称' },
      { key: 'party_b', label: '乙方（承租方）', type: 'text', required: true, placeholder: '请输入乙方名称' },
      { key: 'rental_item', label: '租赁物', type: 'text', required: true, placeholder: '请输入租赁物名称/地址' },
      { key: 'rent', label: '租金（元/月）', type: 'number', required: true, placeholder: '请输入每月租金' },
      { key: 'pay_day', label: '支付日期', type: 'number', required: true, placeholder: '请输入每月几号支付' },
      { key: 'term', label: '租期（个月）', type: 'number', required: true, placeholder: '请输入租期月数' },
      { key: 'start_date', label: '起始日期', type: 'date', required: true },
      { key: 'end_date', label: '结束日期', type: 'date', required: true },
      { key: 'deposit', label: '押金（元）', type: 'number', required: true, placeholder: '请输入押金金额' }
    ]
  },
  {
    name: '服务协议',
    category: '服务',
    description: '适用于咨询服务、技术服务等场景',
    content: `服务协议

服务方（甲方）：{{provider}}
接受方（乙方）：{{receiver}}

一、服务内容
{{service_content}}

二、服务费用
本次服务费用为人民币{{fee}}元整。

三、支付方式
{{payment_method}}

四、服务期限
服务期限自{{start_date}}至{{end_date}}。

甲方（签字）：_______________  日期：___________
乙方（签字）：_______________  日期：___________`,
    fields: [
      { key: 'provider', label: '服务方（甲方）', type: 'text', required: true, placeholder: '请输入服务方名称' },
      { key: 'receiver', label: '接受方（乙方）', type: 'text', required: true, placeholder: '请输入接受方名称' },
      { key: 'service_content', label: '服务内容', type: 'textarea', required: true, placeholder: '请详细描述服务内容' },
      { key: 'fee', label: '服务费用（元）', type: 'number', required: true, placeholder: '请输入服务费用' },
      { key: 'payment_method', label: '支付方式', type: 'select', required: true, options: ['一次性支付', '分期支付', '按月支付'] },
      { key: 'start_date', label: '起始日期', type: 'date', required: true },
      { key: 'end_date', label: '结束日期', type: 'date', required: true }
    ]
  },
  {
    name: '采购合同',
    category: '采购',
    description: '适用于货物采购场景',
    content: `采购合同

甲方（采购方）：{{buyer}}
乙方（供应方）：{{seller}}

一、采购货物
货物名称：{{product}}
数量：{{quantity}}件

二、合同金额
合同总金额为人民币{{amount}}元整。

三、交货时间
{{delivery_date}}

四、付款方式
{{payment_method}}

甲方（签字）：_______________  日期：___________
乙方（签字）：_______________  日期：___________`,
    fields: [
      { key: 'buyer', label: '甲方（采购方）', type: 'text', required: true, placeholder: '请输入采购方名称' },
      { key: 'seller', label: '乙方（供应方）', type: 'text', required: true, placeholder: '请输入供应方名称' },
      { key: 'product', label: '货物名称', type: 'text', required: true, placeholder: '请输入货物名称' },
      { key: 'quantity', label: '数量', type: 'number', required: true, placeholder: '请输入采购数量' },
      { key: 'amount', label: '合同金额（元）', type: 'number', required: true, placeholder: '请输入合同金额' },
      { key: 'delivery_date', label: '交货时间', type: 'date', required: true },
      { key: 'payment_method', label: '付款方式', type: 'select', required: true, options: ['款到发货', '货到付款', '月结30天'] }
    ]
  },
  {
    name: '劳动合同',
    category: '劳动',
    description: '适用于雇佣关系场景',
    content: `劳动合同

甲方（用人单位）：{{employer}}
乙方（劳动者）：{{employee}}

一、劳动合同期限
本合同期限为{{term}}个月，自{{start_date}}起。

二、工作内容
乙方担任{{position}}岗位。

三、工作地点
工作地点：{{work_location}}

四、劳动报酬
月工资：{{salary}}元

甲方（盖章）：_______________  日期：___________
乙方（签字）：_______________  日期：___________`,
    fields: [
      { key: 'employer', label: '甲方（用人单位）', type: 'text', required: true, placeholder: '请输入用人单位名称' },
      { key: 'employee', label: '乙方（劳动者）', type: 'text', required: true, placeholder: '请输入劳动者姓名' },
      { key: 'position', label: '工作岗位', type: 'text', required: true, placeholder: '请输入工作岗位' },
      { key: 'work_location', label: '工作地点', type: 'text', required: true, placeholder: '请输入工作地点' },
      { key: 'salary', label: '月工资（元）', type: 'number', required: true, placeholder: '请输入月工资' },
      { key: 'term', label: '合同期限（个月）', type: 'number', required: true, placeholder: '请输入合同期限' },
      { key: 'start_date', label: '起始日期', type: 'date', required: true }
    ]
  },
  {
    name: '保密协议',
    category: '保密',
    description: '适用于商业保密场景',
    content: `保密协议

甲方：{{party_a}}
乙方：{{party_b}}

一、保密信息
{{confidential_info}}

二、保密期限
保密期限自{{start_date}}起至{{end_date}}止。

甲方（盖章）：_______________  日期：___________
乙方（签字）：_______________  日期：___________`,
    fields: [
      { key: 'party_a', label: '甲方', type: 'text', required: true, placeholder: '请输入甲方名称' },
      { key: 'party_b', label: '乙方', type: 'text', required: true, placeholder: '请输入乙方名称' },
      { key: 'confidential_info', label: '保密信息内容', type: 'textarea', required: true, placeholder: '请描述需要保密的信息' },
      { key: 'start_date', label: '起始日期', type: 'date', required: true },
      { key: 'end_date', label: '结束日期', type: 'date', required: true }
    ]
  }
]

// 初始化系统预设模板
router.post('/init', async (req: Request, res: Response) => {
  try {
    // 检查是否已有系统模板
    const existingTemplates = await prisma.template.findMany({
      where: { isSystem: true }
    })

    if (existingTemplates.length > 0) {
      return res.json({
        success: true,
        message: `已有 ${existingTemplates.length} 个系统模板`,
        data: { count: existingTemplates.length }
      })
    }

    // 创建预设模板
    const templates = await Promise.all(
      systemTemplates.map((template, index) =>
        prisma.template.create({
          data: {
            name: template.name,
            category: template.category,
            description: template.description,
            content: template.content,
            fields: JSON.stringify(template.fields),
            isSystem: true,
            isActive: true,
            sort: index + 1,
            userId: 'system'  // 系统模板
          }
        })
      )
    )

    res.json({
      success: true,
      message: '系统预设模板初始化成功',
      data: { count: templates.length }
    })
  } catch (error) {
    console.error('Init templates error:', error)
    res.status(500).json({
      success: false,
      message: '初始化模板失败'
    })
  }
})

// 获取模板分类列表
router.get('/categories', async (req: Request, res: Response) => {
  try {
    const categories = await prisma.template.findMany({
      where: {
        isActive: true,
        OR: [
          { isSystem: true },
          { isPublic: true }
        ]
      },
      select: { category: true },
      distinct: ['category']
    })

    res.json({
      success: true,
      data: categories.map(c => c.category).filter(Boolean)
    })
  } catch (error) {
    console.error('Get categories error:', error)
    res.status(500).json({
      success: false,
      message: '获取分类失败'
    })
  }
})

export default router
