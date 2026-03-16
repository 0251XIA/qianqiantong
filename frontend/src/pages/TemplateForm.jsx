import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getTemplate, createContract, addSigner, sendContract, getSignUrl } from '../api/modules.js'
import './TemplateForm.css'

export default function TemplateForm() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [template, setTemplate] = useState(null)
  const [formData, setFormData] = useState({})
  const [signers, setSigners] = useState([{ name: '', phone: '', email: '', signOrder: 1 }])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [signUrl, setSignUrl] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    loadTemplate()
  }, [id])

  const loadTemplate = async () => {
    try {
      const result = await getTemplate(id)
      const templateData = result.data
      setTemplate(templateData)
      
      // 初始化表单数据
      const fields = JSON.parse(templateData.fields || '[]')
      const initialData = {}
      fields.forEach(f => {
        initialData[f.key] = ''
      })
      setFormData(initialData)
    } catch (err) {
      console.error('加载模板失败:', err)
      setError(err.message || '加载模板失败')
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (key, value) => {
    setFormData(prev => ({ ...prev, [key]: value }))
  }

  const handleSignerChange = (index, field, value) => {
    const newSigners = [...signers]
    newSigners[index][field] = value
    setSigners(newSigners)
  }

  const addSignerRow = () => {
    setSigners([...signers, { name: '', phone: '', email: '', signOrder: signers.length + 1 }])
  }

  const removeSignerRow = (index) => {
    if (signers.length > 1) {
      const newSigners = signers.filter((_, i) => i !== index)
      setSigners(newSigners.map((s, i) => ({ ...s, signOrder: i + 1 })))
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    setError('')

    try {
      // 1. 创建合同
      const contractResult = await createContract({
        title: `${template.name}`,
        fileUrl: template.fileUrl,
        templateId: id,
      })

      const contract = contractResult.data

      // 2. 添加签署方
      for (const signer of signers) {
        if (signer.name) {
          await addSigner(contract.id, {
            name: signer.name,
            phone: signer.phone || undefined,
            email: signer.email || undefined,
            signOrder: signer.signOrder,
          })
        }
      }

      // 3. 发起签署
      await sendContract(contract.id)

      // 4. 获取签署链接（第一个签署方）
      if (signers.length > 0 && signers[0].name) {
        try {
          // 先获取合同详情找到签署方ID
          const { getContract } = await import('../api/modules.js')
          const contractDetail = await getContract(contract.id)
          const firstSigner = contractDetail.data.signers?.[0]
          
          if (firstSigner) {
            const urlResult = await getSignUrl(contract.id, firstSigner.id)
            if (urlResult.data?.url) {
              setSignUrl(urlResult.data.url)
            }
          }
        } catch (urlErr) {
          console.error('获取签署链接失败:', urlErr)
        }
      }

      alert('合同发起成功！')

    } catch (err) {
      console.error('创建合同失败:', err)
      setError(err.message || '创建合同失败')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <div className="loading">加载中...</div>

  if (error && !template) return <div className="error">{error}</div>

  const fields = JSON.parse(template?.fields || '[]')

  // 签署链接已获取
  if (signUrl) {
    return (
      <div className="template-form success-page">
        <div className="success-icon">✅</div>
        <h2>合同发起成功！</h2>
        <p>请点击下方链接完成签署：</p>
        <a href={signUrl} target="_blank" rel="noopener noreferrer" className="sign-link">
          立即签署 →
        </a>
        <button onClick={() => navigate('/')} className="back-btn">
          返回模板列表
        </button>
      </div>
    )
  }

  return (
    <div className="template-form">
      <header className="header">
        <button onClick={() => navigate('/')} className="back">← 返回</button>
        <h1>{template.name}</h1>
      </header>

      {error && <div className="error-message">{error}</div>}

      <form onSubmit={handleSubmit}>
        {/* 签署方信息 */}
        <div className="form-section">
          <h2>签署方信息</h2>
          
          {signers.map((signer, index) => (
            <div key={index} className="signer-row">
              <div className="signer-order">签署方 {index + 1}</div>
              <div className="form-field">
                <label>姓名 <span className="required">*</span></label>
                <input
                  type="text"
                  value={signer.name}
                  onChange={e => handleSignerChange(index, 'name', e.target.value)}
                  required
                  placeholder="请输入姓名"
                />
              </div>
              <div className="form-field">
                <label>手机号</label>
                <input
                  type="tel"
                  value={signer.phone}
                  onChange={e => handleSignerChange(index, 'phone', e.target.value)}
                  placeholder="请输入手机号"
                />
              </div>
              <div className="form-field">
                <label>邮箱</label>
                <input
                  type="email"
                  value={signer.email}
                  onChange={e => handleSignerChange(index, 'email', e.target.value)}
                  placeholder="请输入邮箱"
                />
              </div>
              {signers.length > 1 && (
                <button type="button" className="remove-signer" onClick={() => removeSignerRow(index)}>
                  删除
                </button>
              )}
            </div>
          ))}
          
          <button type="button" className="add-signer" onClick={addSignerRow}>
            + 添加签署方
          </button>
        </div>

        {/* 合同变量 */}
        {fields.length > 0 && (
          <div className="form-section">
            <h2>合同信息</h2>
            
            {fields.map(field => (
              <div key={field.key} className="form-field">
                <label>
                  {field.label}
                  {field.required && <span className="required">*</span>}
                </label>
                
                {field.type === 'textarea' ? (
                  <textarea
                    value={formData[field.key] || ''}
                    onChange={e => handleChange(field.key, e.target.value)}
                    placeholder={field.placeholder}
                    required={field.required}
                  />
                ) : field.type === 'select' ? (
                  <select
                    value={formData[field.key] || ''}
                    onChange={e => handleChange(field.key, e.target.value)}
                    required={field.required}
                  >
                    <option value="">请选择</option>
                    {(field.options || []).map(opt => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                ) : field.type === 'date' ? (
                  <input
                    type="date"
                    value={formData[field.key] || ''}
                    onChange={e => handleChange(field.key, e.target.value)}
                    required={field.required}
                  />
                ) : field.type === 'number' ? (
                  <input
                    type="number"
                    value={formData[field.key] || ''}
                    onChange={e => handleChange(field.key, e.target.value)}
                    placeholder={field.placeholder}
                    required={field.required}
                  />
                ) : (
                  <input
                    type="text"
                    value={formData[field.key] || ''}
                    onChange={e => handleChange(field.key, e.target.value)}
                    placeholder={field.placeholder}
                    required={field.required}
                  />
                )}
              </div>
            ))}
          </div>
        )}

        <button type="submit" className="submit-btn" disabled={submitting}>
          {submitting ? '提交中...' : '发起合同'}
        </button>
      </form>
    </div>
  )
}
