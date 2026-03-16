import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getTemplates } from '../api/modules.js'
import './TemplateList.css'

export default function TemplateList() {
  const [templates, setTemplates] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [category, setCategory] = useState('all')
  const navigate = useNavigate()

  useEffect(() => {
    loadTemplates()
  }, [category])

  const loadTemplates = async () => {
    setLoading(true)
    setError('')
    try {
      const result = await getTemplates({ 
        page: 1, 
        pageSize: 100,
        category: category === 'all' ? undefined : category
      })
      // 新版 API 返回格式: { code: 0, data: { items: [], total, page, pageSize } }
      setTemplates(result.data.items || [])
    } catch (err) {
      setError(err.message || '加载模板失败')
      console.error('加载模板失败:', err)
    } finally {
      setLoading(false)
    }
  }

  const filteredTemplates = category === 'all' 
    ? templates 
    : templates.filter(t => t.category === category)

  const categories = ['all', ...new Set(templates.map(t => t.category).filter(Boolean))]

  return (
    <div className="template-list">
      <header className="header">
        <h1>📋 发起合同</h1>
      </header>

      <div className="category-tabs">
        {categories.map(cat => (
          <button
            key={cat}
            className={`tab ${category === cat ? 'active' : ''}`}
            onClick={() => setCategory(cat)}
          >
            {cat === 'all' ? '全部' : cat}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="loading">加载中...</div>
      ) : error ? (
        <div className="error">{error}</div>
      ) : filteredTemplates.length === 0 ? (
        <div className="empty">暂无模板</div>
      ) : (
        <div className="template-grid">
          {filteredTemplates.map(template => (
            <div 
              key={template.id} 
              className="template-card"
              onClick={() => navigate(`/template/${template.id}`)}
            >
              <div className="template-icon">📄</div>
              <div className="template-info">
                <h3>{template.name}</h3>
                <p>{template.description}</p>
                {template.isSystem && <span className="badge">预设</span>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
