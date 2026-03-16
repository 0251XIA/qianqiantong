import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import TemplateList from './pages/TemplateList'
import TemplateForm from './pages/TemplateForm'
import ContractList from './pages/Contract/ContractList'
import ContractForm from './pages/Contract/ContractForm'
import ContractDetail from './pages/Contract/ContractDetail'
import Enterprise from './pages/Enterprise/Enterprise'
import Package from './pages/Package/Package'
import Login from './pages/Login'
import { isLoggedIn, clearAuthData, getStoredUser } from './api/modules.js'

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const checkAuth = () => {
      const loggedIn = isLoggedIn()
      const storedUser = getStoredUser()
      setIsAuthenticated(loggedIn)
      setUser(storedUser)
      setLoading(false)
    }
    
    checkAuth()
  }, [])

  const handleLogin = (token) => {
    setIsAuthenticated(true)
    setUser(getStoredUser())
  }

  const handleLogout = () => {
    clearAuthData()
    setIsAuthenticated(false)
    setUser(null)
  }

  if (loading) {
    return <div className="loading">加载中...</div>
  }

  if (!isAuthenticated) {
    return <Login onLogin={handleLogin} />
  }

  return (
    <BrowserRouter>
      <div className="app">
        <header className="app-header">
          <div className="nav-links">
            <a href="/" className="nav-link">模板</a>
            <a href="/contracts" className="nav-link">合同</a>
            <a href="/enterprise" className="nav-link">企业</a>
            <a href="/package" className="nav-link">套餐</a>
          </div>
          <div className="user-section">
            <span className="user-info">{user?.name || user?.phone}</span>
            <button onClick={handleLogout} className="logout-btn">退出</button>
          </div>
        </header>
        <Routes>
          <Route path="/" element={<TemplateList />} />
          <Route path="/template/:id" element={<TemplateForm />} />
          <Route path="/contracts" element={<ContractList />} />
          <Route path="/contract/new" element={<ContractForm />} />
          <Route path="/contract/:id" element={<ContractDetail />} />
          <Route path="/contract/create" element={<ContractForm />} />
          <Route path="/enterprise" element={<Enterprise />} />
          <Route path="/package" element={<Package />} />
        </Routes>
      </div>
    </BrowserRouter>
  )
}
