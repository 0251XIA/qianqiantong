import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getTemplates, useTemplate, sendContract, initiateSign } from '../../api/modules.js'
import './ContractForm.css'

export default function ContractForm() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState(1) // 1: 选择模板, 2: 填写信息, 3: 添加签署方, 4: 发起签署
  const [templates, setTemplates] = useState([])
  const [selectedTemplate, setSelectedTemplate] = useState(null)
  const [contract, setContract] = useState(null)
  const [signUrl, setSignUrl] = useState('')
  
  // 动态表单数据
  const [formData, setFormData] = useState({})
  
  // 签署方信息
  const [signer, setSigner] = useState({
    name: '',
    phone: '',
    email: '',
  })
  
  // 加载模板列表
  useEffect(() => {
    loadTemplates()
  }, [])
  
  const loadTemplates = async () => {
    try {
      const res = await getTemplates()
      if (res.data.code === 0) {
        setTemplates(res.data.data.items || [])
      }
    } catch (err) {
      console.error('加载模板失败:', err)
    }
  }
  
  // 选择模板
  const handleSelectTemplate = (template) => {
    setSelectedTemplate(template)
    setFormData({})
    
    // 根据模板字段设置默认值
    try {
      const fields = JSON.parse(template.fields || '[]')
      const defaults = {}
      fields.forEach(field => {
        defaults[field.key] = ''
      })
      setFormData(defaults)
    } catch {
      setFormData({})
    }
    
    setStep(2)
  }
  
  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }
  
  const handleSignerChange = (e) => {
    const { name, value } = e.target
    setSigner(prev => ({ ...prev, [name]: value }))
  }
  
  // 第2步：使用模板创建合同
  const handleCreateContract = async () => {
    if (!selectedTemplate) {
      alert('请选择模板')
      return
    }
    
    // 验证必填字段
    try {
      const fields = JSON.parse(selectedTemplate.fields || '[]')
      for (const field of fields) {
        if (field.required && !formData[field.key]) {
          alert(`请填写：${field.label}`)
          return
        }
      }
    } catch (err) {
      console.error('解析字段失败:', err)
    }
    
    if (!signer.name || !signer.phone) {
      alert('请填写签署方信息')
      return
    }
    
    setLoading(true)
    try {
      // 调用模板创建合同接口
      const res = await useTemplate(selectedTemplate.id, {
        title: formData.title || `${selectedTemplate.name}`,
        ...formData,
        signers: [{
          name: signer.name,
          phone: signer.phone,
          email: signer.email,
          signOrder: 1
        }]
      })
      
      if (res.data.code === 0) {
        setContract(res.data.data)
        setStep(3)
      } else {
        alert(res.data.message || '创建失败')
      }
    } catch (err) {
      console.error('创建合同失败:', err)
      alert('创建失败')
    }
    
    setLoading(false)
  }
  
  // 第3步：发送合同
  const handleSendContract = async () => {
    if (!contract) return
    
    setLoading(true)
    try {
      const res = await sendContract(contract.id)
      if (res.data.code === 0) {
        setContract(res.data.data)
        setStep(4)
      } else {
        alert(res.data.message || '发送失败')
      }
    } catch (err) {
      console.error('发送失败:', err)
      alert('发送失败')
    }
    setLoading(false)
  }
  
  // 第4步：发起签署
  const handleInitiateSign = async () => {
    if (!contract) return
    
    setLoading(true)
    try {
      const res = await initiateSign(contract.id)
      if (res.data.code === 0) {
        // 获取签署链接
        const url = await getSignUrl(contract.fileKey || res.data.data.fileKey)
        setSignUrl(url)
      } else {
        alert(res.data.message || '发起签署失败')
      }
    } catch (err) {
      console.error('发起签署失败:', err)
      alert('发起签署失败')
    }
    setLoading(false)
  }
  
  // 获取签署链接
  const getSignUrl = async (contractId) => {
    // 这里简化处理，实际应该调用后端 API
    // 后端 sign.service.ts 中的 initiateSign 已经返回了 signUrl
    return ''
  }
  
  // 渲染模板字段表单
  const renderTemplateFields = () => {
    if (!selectedTemplate) return null
    
    try {
      const fields = JSON.parse(selectedTemplate.fields || '[]')
      
      return (
        <div className="form-section">
          <h3>填写合同信息</h3>
          
          <div className="form-group">
            <label>合同标题 *</label>
            <input
              type="text"
              name="title"
              value={formData.title || ''}
              onChange={handleInputChange}
              placeholder="请输入合同标题"
            />
          </div>
          
          {fields.map((field, index) => (
            <div className="form-group" key={index}>
              <label>
                {field.label}
                {field.required && <span className="required">*</span>}
              </label>
              {field.type === 'number' ? (
                <input
                  type="number"
                  name={field.key}
                  value={formData[field.key] || ''}
                  onChange={handleInputChange}
                  placeholder={`请输入${field.label}`}
                />
              ) : field.type === 'date' ? (
                <input
                  type="date"
                  name={field.key}
                  value={formData[field.key] || ''}
                  onChange={handleInputChange}
                />
              ) : (
                <input
                  type="text"
                  name={field.key}
                  value={formData[field.key] || ''}
                  onChange={handleInputChange}
                  placeholder={`请输入${field.label}`}
                />
              )}
            </div>
          ))}
        </div>
      )
    } catch (err) {
      return <p className="no-fields">该模板暂无字段配置</p>
    }
  }
  
  // 步骤条
  const renderStepBar = () => (
    <div className="step-bar">
      <div className={`step ${step >= 1 ? 'active' : ''}`}>
        <span className="step-num">1</span>
        <span className="step-text">选择模板</span>
      </div>
      <div className="step-line"></div>
      <div className={`step ${step >= 2 ? 'active' : ''}`}>
        <span className="step-num">2</span>
        <span className="step-text">填写信息</span>
      </div>
      <div className="step-line"></div>
      <div className={`step ${step >= 3 ? 'active' : ''}`}>
        <span className="step-num">3</span>
        <span className="step-text">发送合同</span>
      </div>
      <div className="step-line"></div>
      <div className={`step ${step >= 4 ? 'active' : ''}`}>
        <span className="step-num">4</span>
        <span className="step-text">发起签署</span>
      </div>
    </div>
  )
  
  return (
    <div className="contract-form-page">
      <div className="page-header">
        <h2>创建合同</h2>
        <button className="btn-secondary" onClick={() => navigate('/contracts')}>
          返回列表
        </button>
      </div>
      
      {renderStepBar()}
      
      {step === 1 && (
        <div className="template-selection">
          <h3>选择合同模板</h3>
          <div className="template-grid">
            {templates.map(template => (
              <div
                key={template.id}
                className={`template-card ${selectedTemplate?.id === template.id ? 'selected' : ''}`}
                onClick={() => handleSelectTemplate(template)}
              >
                <div className="template-icon">📄</div>
                <div className="template-info">
                  <h4>{template.name}</h4>
                  <p>{template.description || '暂无描述'}</p>
                  <span className="template-category">{template.category || '未分类'}</span>
                </div>
              </div>
            ))}
            {templates.length === 0 && (
              <p className="no-templates">暂无模板，请先创建模板</p>
            )}
          </div>
        </div>
      )}
      
      {step === 2 && (
        <div className="contract-form">
          {renderTemplateFields()}
          
          <div className="form-section">
            <h3>签署方信息</h3>
            <div className="form-group">
              <label>签署人姓名 *</label>
              <input
                type="text"
                name="name"
                value={signer.name}
                onChange={handleSignerChange}
                placeholder="请输入签署人姓名"
              />
            </div>
            <div className="form-group">
              <label>手机号 *</label>
              <input
                type="tel"
                name="phone"
                value={signer.phone}
                onChange={handleSignerChange}
                placeholder="请输入手机号"
              />
            </div>
            <div className="form-group">
              <label>邮箱</label>
              <input
                type="email"
                name="email"
                value={signer.email}
                onChange={handleSignerChange}
                placeholder="请输入邮箱（选填）"
              />
            </div>
          </div>
          
          <div className="form-actions">
            <button className="btn-secondary" onClick={() => setStep(1)}>
              上一步
            </button>
            <button className="btn-primary" onClick={handleCreateContract} disabled={loading}>
              {loading ? '创建中...' : '创建合同'}
            </button>
          </div>
        </div>
      )}
      
      {step === 3 && contract && (
        <div className="contract-review">
          <h3>合同已创建</h3>
          <div className="contract-info">
            <p><strong>合同标题：</strong>{contract.title}</p>
            <p><strong>合同状态：</strong>{contract.status}</p>
            <p><strong>模板：</strong>{selectedTemplate?.name}</p>
          </div>
          
          <div className="form-actions">
            <button className="btn-secondary" onClick={() => { setContract(null); setStep(1) }}>
              创建新合同
            </button>
            <button className="btn-primary" onClick={handleSendContract} disabled={loading}>
              {loading ? '发送中...' : '发送合同'}
            </button>
          </div>
        </div>
      )}
      
      {step === 4 && contract && (
        <div className="sign-initiated">
          <h3>合同已发送</h3>
          <div className="contract-info">
            <p><strong>合同标题：</strong>{contract.title}</p>
            <p><strong>合同状态：</strong>{contract.status}</p>
          </div>
          
          <div className="form-actions">
            <button className="btn-primary" onClick={handleInitiateSign} disabled={loading}>
              {loading ? '处理中...' : '发起签署'}
            </button>
          </div>
          
          {signUrl && (
            <div className="sign-url-result">
              <p>签署链接已生成：</p>
              <a href={signUrl} target="_blank" rel="noopener noreferrer">
                {signUrl}
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
