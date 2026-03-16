import { useState } from 'react'
import { login, register, saveAuthData, isLoggedIn } from '../api/modules.js'

export default function Login({ onLogin }) {
  const [phone, setPhone] = useState('13900000000')
  const [password, setPassword] = useState('test123')
  const [name, setName] = useState('')
  const [isRegister, setIsRegister] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      let result
      
      if (isRegister) {
        if (!name) {
          setError('请输入姓名')
          setLoading(false)
          return
        }
        result = await register(phone, password, name)
      } else {
        result = await login(phone, password)
      }
      
      // 保存登录信息
      if (result.data) {
        saveAuthData(result.data)
        // 回调通知父组件
        onLogin(result.data.accessToken)
      } else {
        saveAuthData(result)
        onLogin(result.accessToken)
      }
      
    } catch (err) {
      setError(err.message || '请求失败')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <h1>📝 {isRegister ? '注册' : '登录'}</h1>
        <form onSubmit={handleSubmit}>
          {isRegister && (
            <div className="form-field">
              <label>姓名</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="请输入姓名"
              />
            </div>
          )}
          <div className="form-field">
            <label>手机号</label>
            <input
              type="tel"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              required
            />
          </div>
          <div className="form-field">
            <label>密码</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              minLength={6}
            />
          </div>
          {error && <div className="error">{error}</div>}
          <button type="submit" className="submit-btn" disabled={loading}>
            {loading ? '处理中...' : (isRegister ? '注册' : '登录')}
          </button>
        </form>
        <p className="switch-mode" onClick={() => setIsRegister(!isRegister)}>
          {isRegister ? '已有账号？去登录' : '没有账号？去注册'}
        </p>
      </div>
    </div>
  )
}
