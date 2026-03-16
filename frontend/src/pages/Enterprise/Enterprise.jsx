import { useState, useEffect } from 'react'
import { getEnterprise, getEnterpriseMembers, createEnterprise, inviteMember, removeMember, updateMemberRole } from '../../api/modules.js'
import './Enterprise.css'

export default function Enterprise() {
  const [enterprise, setEnterprise] = useState(null)
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // 创建企业表单
  const [createForm, setCreateForm] = useState({
    name: '',
    licenseCode: '',
    legalPerson: '',
  })

  // 邀请成员表单
  const [inviteForm, setInviteForm] = useState({
    phone: '',
    name: '',
    role: 'MEMBER',
  })

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    setError('')
    try {
      // 尝试获取企业信息
      try {
        const entResult = await getEnterprise()
        setEnterprise(entResult.data)
        
        // 获取成员列表
        const memResult = await getEnterpriseMembers()
        setMembers(memResult.data || [])
      } catch (err) {
        // 没有企业账户是正常的
        if (err.message?.includes('not found')) {
          setEnterprise(null)
        } else {
          throw err
        }
      }
    } catch (err) {
      setError(err.message || '加载企业信息失败')
      console.error('加载企业信息失败:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateEnterprise = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    setError('')
    
    try {
      await createEnterprise(createForm)
      alert('企业创建成功')
      setShowCreateModal(false)
      loadData()
    } catch (err) {
      setError(err.message || '创建企业失败')
    } finally {
      setSubmitting(false)
    }
  }

  const handleInviteMember = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    setError('')
    
    try {
      await inviteMember(inviteForm.phone, inviteForm.name, inviteForm.role)
      alert('邀请成功')
      setShowInviteModal(false)
      setInviteForm({ phone: '', name: '', role: 'MEMBER' })
      loadData()
    } catch (err) {
      setError(err.message || '邀请成员失败')
    } finally {
      setSubmitting(false)
    }
  }

  const handleRemoveMember = async (memberId) => {
    if (!confirm('确定要移除该成员吗？')) return
    
    try {
      await removeMember(memberId)
      alert('成员已移除')
      loadData()
    } catch (err) {
      alert(err.message || '移除成员失败')
    }
  }

  const handleUpdateRole = async (memberId, newRole) => {
    try {
      await updateMemberRole(memberId, newRole)
      alert('角色已更新')
      loadData()
    } catch (err) {
      alert(err.message || '更新角色失败')
    }
  }

  const getRoleText = (role) => {
    const roleMap = {
      OWNER: '所有者',
      ADMIN: '管理员',
      MEMBER: '成员',
    }
    return roleMap[role] || role
  }

  const getRoleClass = (role) => {
    const classMap = {
      OWNER: 'role-owner',
      ADMIN: 'role-admin',
      MEMBER: 'role-member',
    }
    return classMap[role] || ''
  }

  if (loading) return <div className="loading">加载中...</div>

  // 没有企业账户
  if (!enterprise) {
    return (
      <div className="enterprise-page">
        <div className="no-enterprise">
          <div className="no-enterprise-icon">🏢</div>
          <h2>还没有企业账户</h2>
          <p>创建企业账户后，您可以邀请团队成员一起使用</p>
          <button className="btn-primary" onClick={() => setShowCreateModal(true)}>
            创建企业
          </button>
        </div>

        {/* 创建企业弹窗 */}
        {showCreateModal && (
          <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
            <div className="modal" onClick={e => e.stopPropagation()}>
              <h3>创建企业</h3>
              <form onSubmit={handleCreateEnterprise}>
                <div className="form-field">
                  <label>企业名称 *</label>
                  <input
                    type="text"
                    value={createForm.name}
                    onChange={e => setCreateForm({ ...createForm, name: e.target.value })}
                    required
                    placeholder="请输入企业名称"
                  />
                </div>
                <div className="form-field">
                  <label>营业执照号</label>
                  <input
                    type="text"
                    value={createForm.licenseCode}
                    onChange={e => setCreateForm({ ...createForm, licenseCode: e.target.value })}
                    placeholder="请输入营业执照号"
                  />
                </div>
                <div className="form-field">
                  <label>法人代表</label>
                  <input
                    type="text"
                    value={createForm.legalPerson}
                    onChange={e => setCreateForm({ ...createForm, legalPerson: e.target.value })}
                    placeholder="请输入法人代表姓名"
                  />
                </div>
                {error && <div className="error-message">{error}</div>}
                <div className="modal-actions">
                  <button type="button" className="btn-secondary" onClick={() => setShowCreateModal(false)}>
                    取消
                  </button>
                  <button type="submit" className="btn-primary" disabled={submitting}>
                    {submitting ? '创建中...' : '创建'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="enterprise-page">
      <header className="page-header">
        <h1>🏢 企业管理</h1>
      </header>

      {error && <div className="error-message">{error}</div>}

      {/* 企业信息 */}
      <div className="section">
        <div className="section-header">
          <h2>企业信息</h2>
        </div>
        <div className="info-card">
          <div className="info-row">
            <label>企业名称</label>
            <span>{enterprise.name}</span>
          </div>
          <div className="info-row">
            <label>营业执照号</label>
            <span>{enterprise.licenseCode || '-'}</span>
          </div>
          <div className="info-row">
            <label>法人代表</label>
            <span>{enterprise.legalPerson || '-'}</span>
          </div>
          <div className="info-row">
            <label>企业状态</label>
            <span className={`status-badge status-${enterprise.status?.toLowerCase()}`}>
              {enterprise.status === 'VERIFIED' ? '已认证' : 
               enterprise.status === 'PENDING' ? '待审核' : '已拒绝'}
            </span>
          </div>
        </div>
      </div>

      {/* 成员管理 */}
      <div className="section">
        <div className="section-header">
          <h2>成员管理</h2>
          <button className="btn-primary" onClick={() => setShowInviteModal(true)}>
            + 邀请成员
          </button>
        </div>
        
        {members.length === 0 ? (
          <div className="empty-members">
            <p>暂无成员，快邀请团队成员加入吧</p>
          </div>
        ) : (
          <div className="members-table">
            <div className="table-header">
              <div className="col-name">姓名</div>
              <div className="col-phone">手机号</div>
              <div className="col-role">角色</div>
              <div className="col-actions">操作</div>
            </div>
            {members.map(member => (
              <div key={member.id} className="table-row">
                <div className="col-name">
                  {member.user?.name || '-'}
                </div>
                <div className="col-phone">
                  {member.user?.phone || '-'}
                </div>
                <div className="col-role">
                  <span className={`role-badge ${getRoleClass(member.role)}`}>
                    {getRoleText(member.role)}
                  </span>
                </div>
                <div className="col-actions">
                  {member.role !== 'OWNER' && (
                    <>
                      <select
                        value={member.role}
                        onChange={(e) => handleUpdateRole(member.id, e.target.value)}
                        className="role-select"
                      >
                        <option value="MEMBER">成员</option>
                        <option value="ADMIN">管理员</option>
                      </select>
                      <button
                        className="btn-danger-text"
                        onClick={() => handleRemoveMember(member.id)}
                      >
                        移除
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 邀请成员弹窗 */}
      {showInviteModal && (
        <div className="modal-overlay" onClick={() => setShowInviteModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3>邀请成员</h3>
            <form onSubmit={handleInviteMember}>
              <div className="form-field">
                <label>手机号 *</label>
                <input
                  type="tel"
                  value={inviteForm.phone}
                  onChange={e => setInviteForm({ ...inviteForm, phone: e.target.value })}
                  required
                  placeholder="请输入成员手机号"
                />
              </div>
              <div className="form-field">
                <label>姓名 *</label>
                <input
                  type="text"
                  value={inviteForm.name}
                  onChange={e => setInviteForm({ ...inviteForm, name: e.target.value })}
                  required
                  placeholder="请输入成员姓名"
                />
              </div>
              <div className="form-field">
                <label>角色</label>
                <select
                  value={inviteForm.role}
                  onChange={e => setInviteForm({ ...inviteForm, role: e.target.value })}
                >
                  <option value="MEMBER">成员</option>
                  <option value="ADMIN">管理员</option>
                </select>
              </div>
              {error && <div className="error-message">{error}</div>}
              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowInviteModal(false)}>
                  取消
                </button>
                <button type="submit" className="btn-primary" disabled={submitting}>
                  {submitting ? '邀请中...' : '邀请'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
