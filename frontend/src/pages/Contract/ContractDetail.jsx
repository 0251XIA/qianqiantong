import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getContract, sendContract, cancelContract, deleteContract, getStatusText } from '../../api/modules.js'
import './ContractDetail.css'

export default function ContractDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [contract, setContract] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    loadContract()
  }, [id])

  const loadContract = async () => {
    setLoading(true)
    setError('')
    try {
      const result = await getContract(id)
      setContract(result.data)
    } catch (err) {
      setError(err.message || '加载合同详情失败')
      console.error('加载合同详情失败:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSend = async () => {
    if (!confirm('确定要发起签署吗？')) return
    
    setSubmitting(true)
    try {
      await sendContract(id)
      alert('签署已发起')
      loadContract()
    } catch (err) {
      alert(err.message || '发起签署失败')
    } finally {
      setSubmitting(false)
    }
  }

  const handleCancel = async () => {
    if (!confirm('确定要取消该合同吗？')) return
    
    setSubmitting(true)
    try {
      await cancelContract(id)
      alert('合同已取消')
      loadContract()
    } catch (err) {
      alert(err.message || '取消合同失败')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('确定要删除该合同吗？此操作不可恢复。')) return
    
    setSubmitting(true)
    try {
      await deleteContract(id)
      alert('合同已删除')
      navigate('/contracts')
    } catch (err) {
      alert(err.message || '删除合同失败')
    } finally {
      setSubmitting(false)
    }
  }

  const getStatusClass = (status) => {
    const statusMap = {
      DRAFT: 'status-draft',
      PENDING: 'status-pending',
      PARTIAL_SIGNED: 'status-partial',
      COMPLETED: 'status-completed',
      REJECTED: 'status-rejected',
      EXPIRED: 'status-expired',
      CANCELLED: 'status-cancelled',
    }
    return statusMap[status] || ''
  }

  const getSignerStatusClass = (status) => {
    const statusMap = {
      PENDING: 'signer-pending',
      SIGNED: 'signer-signed',
      REJECTED: 'signer-rejected',
      EXPIRED: 'signer-expired',
    }
    return statusMap[status] || ''
  }

  const formatDate = (dateStr) => {
    if (!dateStr) return '-'
    return new Date(dateStr).toLocaleString('zh-CN')
  }

  if (loading) return <div className="loading">加载中...</div>
  if (error) return <div className="error-message">{error}</div>
  if (!contract) return <div className="error-message">合同不存在</div>

  return (
    <div className="contract-detail-page">
      <header className="page-header">
        <button onClick={() => navigate('/contracts')} className="btn-back">
          ← 返回
        </button>
        <h1>{contract.title}</h1>
      </header>

      {/* 基本信息 */}
      <div className="detail-section">
        <h2>基本信息</h2>
        <div className="info-grid">
          <div className="info-item">
            <label>合同状态</label>
            <span className={`status-badge ${getStatusClass(contract.status)}`}>
              {getStatusText(contract.status)}
            </span>
          </div>
          <div className="info-item">
            <label>创建时间</label>
            <span>{formatDate(contract.createdAt)}</span>
          </div>
          <div className="info-item">
            <label>完成时间</label>
            <span>{formatDate(contract.completedAt)}</span>
          </div>
          <div className="info-item">
            <label>签署截止</label>
            <span>{formatDate(contract.signDeadline)}</span>
          </div>
        </div>
      </div>

      {/* 签署方列表 */}
      <div className="detail-section">
        <h2>签署方</h2>
        {contract.signers?.length > 0 ? (
          <div className="signers-list">
            {contract.signers.map((signer, index) => (
              <div key={signer.id} className="signer-card">
                <div className="signer-header">
                  <span className="signer-order">签署方 {index + 1}</span>
                  <span className={`signer-status ${getSignerStatusClass(signer.status)}`}>
                    {signer.status === 'PENDING' ? '待签署' : 
                     signer.status === 'SIGNED' ? '已签署' :
                     signer.status === 'REJECTED' ? '已拒绝' : '已过期'}
                  </span>
                </div>
                <div className="signer-info">
                  <div className="info-item">
                    <label>姓名</label>
                    <span>{signer.name}</span>
                  </div>
                  <div className="info-item">
                    <label>手机</label>
                    <span>{signer.phone || '-'}</span>
                  </div>
                  <div className="info-item">
                    <label>邮箱</label>
                    <span>{signer.email || '-'}</span>
                  </div>
                  <div className="info-item">
                    <label>签署时间</label>
                    <span>{formatDate(signer.signedAt)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-signers">暂无签署方</div>
        )}
      </div>

      {/* 操作日志 */}
      {contract.logs?.length > 0 && (
        <div className="detail-section">
          <h2>操作记录</h2>
          <div className="logs-list">
            {contract.logs.map(log => (
              <div key={log.id} className="log-item">
                <span className="log-action">{log.action}</span>
                <span className="log-content">{log.content}</span>
                <span className="log-time">{formatDate(log.createdAt)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 操作按钮 */}
      <div className="action-bar">
        {contract.status === 'DRAFT' && (
          <>
            <button 
              className="btn-primary" 
              onClick={handleSend}
              disabled={submitting}
            >
              {submitting ? '提交中...' : '发起签署'}
            </button>
            <button 
              className="btn-danger" 
              onClick={handleDelete}
              disabled={submitting}
            >
              删除合同
            </button>
          </>
        )}
        {(contract.status === 'PENDING' || contract.status === 'PARTIAL_SIGNED') && (
          <button 
            className="btn-secondary" 
            onClick={handleCancel}
            disabled={submitting}
          >
            {submitting ? '提交中...' : '取消合同'}
          </button>
        )}
      </div>
    </div>
  )
}
