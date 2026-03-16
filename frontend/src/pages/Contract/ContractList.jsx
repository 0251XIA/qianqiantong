import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { getContracts, getStatusText } from '../../api/modules.js'
import './ContractList.css'

export default function ContractList() {
  const [contracts, setContracts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [statusFilter, setStatusFilter] = useState('')
  const pageSize = 10

  useEffect(() => {
    loadContracts()
  }, [page, statusFilter])

  const loadContracts = async () => {
    setLoading(true)
    setError('')
    try {
      const result = await getContracts({
        page,
        pageSize,
        status: statusFilter || undefined,
      })
      setContracts(result.data.items || [])
      setTotal(result.data.total || 0)
    } catch (err) {
      setError(err.message || '加载合同列表失败')
      console.error('加载合同列表失败:', err)
    } finally {
      setLoading(false)
    }
  }

  const totalPages = Math.ceil(total / pageSize)

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

  const formatDate = (dateStr) => {
    if (!dateStr) return '-'
    return new Date(dateStr).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    })
  }

  return (
    <div className="contract-list-page">
      <header className="page-header">
        <h1>📄 合同管理</h1>
        <Link to="/contract/create" className="btn-primary">
          + 创建合同
        </Link>
      </header>

      {/* 筛选 */}
      <div className="filter-bar">
        <select 
          value={statusFilter} 
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
        >
          <option value="">全部状态</option>
          <option value="DRAFT">草稿</option>
          <option value="PENDING">待签署</option>
          <option value="PARTIAL_SIGNED">部分签署</option>
          <option value="COMPLETED">已完成</option>
          <option value="REJECTED">已拒绝</option>
          <option value="EXPIRED">已过期</option>
          <option value="CANCELLED">已取消</option>
        </select>
      </div>

      {/* 加载中 */}
      {loading ? (
        <div className="loading">加载中...</div>
      ) : error ? (
        <div className="error-message">{error}</div>
      ) : contracts.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📄</div>
          <p>暂无合同</p>
          <Link to="/contract/create" className="btn-primary">
            创建一个合同
          </Link>
        </div>
      ) : (
        <>
          {/* 合同列表 */}
          <div className="contract-table">
            <div className="table-header">
              <div className="col-title">合同标题</div>
              <div className="col-status">状态</div>
              <div className="col-signers">签署方</div>
              <div className="col-date">创建时间</div>
              <div className="col-actions">操作</div>
            </div>
            
            {contracts.map(contract => (
              <div key={contract.id} className="table-row">
                <div className="col-title">
                  <Link to={`/contract/${contract.id}`}>{contract.title}</Link>
                </div>
                <div className="col-status">
                  <span className={`status-badge ${getStatusClass(contract.status)}`}>
                    {getStatusText(contract.status)}
                  </span>
                </div>
                <div className="col-signers">
                  {contract.signers?.length || 0} 人
                </div>
                <div className="col-date">
                  {formatDate(contract.createdAt)}
                </div>
                <div className="col-actions">
                  <Link to={`/contract/${contract.id}`} className="btn-link">
                    查看
                  </Link>
                </div>
              </div>
            ))}
          </div>

          {/* 分页 */}
          {totalPages > 1 && (
            <div className="pagination">
              <button 
                disabled={page <= 1} 
                onClick={() => setPage(p => p - 1)}
              >
                上一页
              </button>
              <span className="page-info">
                第 {page} / {totalPages} 页 (共 {total} 条)
              </span>
              <button 
                disabled={page >= totalPages} 
                onClick={() => setPage(p => p + 1)}
              >
                下一页
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
