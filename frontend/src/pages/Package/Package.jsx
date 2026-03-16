import { useState, useEffect } from 'react'
import { getPackages, createOrder, simulatePay, getUserPackage, getOrders } from '../../api/modules.js'
import './Package.css'

export default function Package() {
  const [packages, setPackages] = useState([])
  const [userPackage, setUserPackage] = useState(null)
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState('packages')
  const [buyingPackage, setBuyingPackage] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    setError('')
    try {
      // 获取套餐列表
      const pkgResult = await getPackages()
      setPackages(pkgResult.data || [])

      // 获取当前套餐
      try {
        const userPkgResult = await getUserPackage()
        setUserPackage(userPkgResult.data)
      } catch (err) {
        setUserPackage(null)
      }

      // 获取订单列表
      try {
        const orderResult = await getOrders({ page: 1, pageSize: 10 })
        setOrders(orderResult.data.items || [])
      } catch (err) {
        setOrders([])
      }
    } catch (err) {
      setError(err.message || '加载数据失败')
      console.error('加载数据失败:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleBuy = async (pkg) => {
    setBuyingPackage(pkg)
    
    try {
      setSubmitting(true)
      
      // 创建订单
      const orderResult = await createOrder({
        packageId: pkg.id,
        type: 'PACKAGE',
        amount: pkg.price,
        paymentMethod: 'ALIPAY',
      })
      
      const order = orderResult.data
      
      // 模拟支付
      await simulatePay(order.id)
      
      alert('购买成功！')
      setBuyingPackage(null)
      loadData()
    } catch (err) {
      alert(err.message || '购买失败')
    } finally {
      setSubmitting(false)
    }
  }

  const getPackageTypeText = (type) => {
    const typeMap = {
      MONTHLY: '月卡',
      YEARLY: '年卡',
      COUNT: '按份',
    }
    return typeMap[type] || type
  }

  const formatDate = (dateStr) => {
    if (!dateStr) return '-'
    return new Date(dateStr).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    })
  }

  const formatPrice = (price) => {
    return typeof price === 'number' ? price.toFixed(2) : '0.00'
  }

  const getOrderStatusText = (status) => {
    const statusMap = {
      PENDING: '待支付',
      PAID: '已支付',
      CANCELLED: '已取消',
      REFUNDED: '已退款',
    }
    return statusMap[status] || status
  }

  const getOrderStatusClass = (status) => {
    const classMap = {
      PENDING: 'status-pending',
      PAID: 'status-paid',
      CANCELLED: 'status-cancelled',
      REFUNDED: 'status-refunded',
    }
    return classMap[status] || ''
  }

  if (loading) return <div className="loading">加载中...</div>

  return (
    <div className="package-page">
      <header className="page-header">
        <h1>💳 套餐中心</h1>
      </header>

      {error && <div className="error-message">{error}</div>}

      {/* 当前套餐 */}
      {userPackage && (
        <div className="current-package">
          <div className="current-package-label">当前套餐</div>
          <div className="current-package-info">
            <div className="pkg-name">{userPackage.package?.name}</div>
            <div className="pkg-usage">
              已使用 {userPackage.contractUsed} / {userPackage.totalContracts} 份
              <span className="pkg-expire">有效期至 {formatDate(userPackage.expireTime)}</span>
            </div>
            <div className="usage-bar">
              <div 
                className="usage-progress" 
                style={{ width: `${(userPackage.contractUsed / userPackage.totalContracts) * 100}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Tab 切换 */}
      <div className="tabs">
        <button 
          className={`tab ${activeTab === 'packages' ? 'active' : ''}`}
          onClick={() => setActiveTab('packages')}
        >
          套餐列表
        </button>
        <button 
          className={`tab ${activeTab === 'orders' ? 'active' : ''}`}
          onClick={() => setActiveTab('orders')}
        >
          我的订单
        </button>
      </div>

      {/* 套餐列表 */}
      {activeTab === 'packages' && (
        <div className="packages-grid">
          {packages.map(pkg => (
            <div 
              key={pkg.id} 
              className={`package-card ${pkg.isPopular ? 'popular' : ''}`}
            >
              {pkg.isPopular && <div className="popular-tag">热门</div>}
              <div className="pkg-type">{getPackageTypeText(pkg.type)}</div>
              <div className="pkg-title">{pkg.name}</div>
              <div className="pkg-price">
                <span className="price">¥{formatPrice(pkg.price)}</span>
                {pkg.originalPrice && pkg.originalPrice > pkg.price && (
                  <span className="original-price">¥{formatPrice(pkg.originalPrice)}</span>
                )}
              </div>
              <div className="pkg-duration">
                有效期 {pkg.duration} 天
              </div>
              <div className="pkg-count">
                包含 {pkg.contractCount} 份合同
              </div>
              <div className="pkg-features">
                {JSON.parse(pkg.features || '[]').map((feature, idx) => (
                  <div key={idx} className="feature-item">✓ {feature}</div>
                ))}
              </div>
              <button 
                className="buy-btn"
                onClick={() => handleBuy(pkg)}
                disabled={submitting}
              >
                {buyingPackage?.id === pkg.id ? '购买中...' : '立即购买'}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* 订单列表 */}
      {activeTab === 'orders' && (
        <div className="orders-section">
          {orders.length === 0 ? (
            <div className="empty-orders">
              <div className="empty-icon">📋</div>
              <p>暂无订单</p>
            </div>
          ) : (
            <div className="orders-list">
              {orders.map(order => (
                <div key={order.id} className="order-card">
                  <div className="order-header">
                    <span className="order-no">{order.orderNo}</span>
                    <span className={`order-status ${getOrderStatusClass(order.status)}`}>
                      {getOrderStatusText(order.status)}
                    </span>
                  </div>
                  <div className="order-body">
                    <div className="order-package">
                      {order.package?.name || '充值'}
                    </div>
                    <div className="order-amount">
                      ¥{formatPrice(order.amount)}
                    </div>
                  </div>
                  <div className="order-footer">
                    <span className="order-time">{formatDate(order.createdAt)}</span>
                    {order.paymentMethod && (
                      <span className="order-method">
                        {order.paymentMethod === 'ALIPAY' ? '支付宝' : 
                         order.paymentMethod === 'WECHAT' ? '微信' : '银行转账'}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
