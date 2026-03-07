import { Link } from 'react-router-dom';
import './Dashboard.css';

export default function Dashboard() {
  // Mock data - in production, this would come from API
  const stats = {
    totalProducts: 24,
    totalQRCodes: 1200,
    avgCarbonFootprint: 5.8,
    verifiedProducts: 18
  };

  const recentActivity = [
    {
      id: 1,
      icon: '📦',
      title: 'New Product Created',
      description: 'Organic Cotton T-Shirt added to catalog',
      time: '2 hours ago'
    },
    {
      id: 2,
      icon: '🔲',
      title: 'QR Codes Generated',
      description: '50 QR codes generated for Recycled Polyester Jacket',
      time: '5 hours ago'
    },
    {
      id: 3,
      icon: '✅',
      title: 'Product Verified',
      description: 'Hemp Tote Bag passed sustainability audit',
      time: '1 day ago'
    },
    {
      id: 4,
      icon: '📊',
      title: 'Carbon Report Generated',
      description: 'Monthly carbon footprint report is ready',
      time: '2 days ago'
    }
  ];

  return (
    <div className="dashboard-page">
      {/* Header */}
      <div className="dashboard-header">
        <h1 className="dashboard-title">
          <span>📊</span>
          Dashboard
        </h1>
        <p className="dashboard-subtitle">
          Welcome back! Here's an overview of your sustainability metrics
        </p>
      </div>

      {/* Stats Grid */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-header">
            <span className="stat-label">Total Products</span>
            <span className="stat-icon">📦</span>
          </div>
          <div className="stat-value">{stats.totalProducts}</div>
          <div className="stat-change positive">
            <span>↑</span>
            <span>12% from last month</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-header">
            <span className="stat-label">QR Codes</span>
            <span className="stat-icon">🔲</span>
          </div>
          <div className="stat-value">{stats.totalQRCodes.toLocaleString()}</div>
          <div className="stat-change positive">
            <span>↑</span>
            <span>8% from last month</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-header">
            <span className="stat-label">Avg Carbon</span>
            <span className="stat-icon">🌱</span>
          </div>
          <div className="stat-value">{stats.avgCarbonFootprint} kg</div>
          <div className="stat-change negative">
            <span>↓</span>
            <span>5% reduction</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-header">
            <span className="stat-label">Verified</span>
            <span className="stat-icon">✅</span>
          </div>
          <div className="stat-value">{stats.verifiedProducts}</div>
          <div className="stat-change neutral">
            <span>→</span>
            <span>75% of products</span>
          </div>
        </div>
      </div>

      {/* Content Grid */}
      <div className="dashboard-content">
        {/* Chart Card */}
        <div className="chart-card">
          <div className="card-header">
            <h2 className="card-title">
              <span>📈</span>
              Carbon Footprint Trends
            </h2>
            <div className="card-actions">
              <button className="card-btn active">Week</button>
              <button className="card-btn">Month</button>
              <button className="card-btn">Year</button>
            </div>
          </div>
          <div className="chart-placeholder">
            <div>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📊</div>
              <div>Chart visualization will appear here</div>
              <div style={{ fontSize: '0.875rem', marginTop: '0.5rem', opacity: 0.7 }}>
                Connect to API to display real-time data
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="quick-actions-card">
          <div className="card-header">
            <h2 className="card-title">
              <span>⚡</span>
              Quick Actions
            </h2>
          </div>
          <div className="action-list">
            <Link to="/create-dpp" className="action-item">
              <div className="action-icon">➕</div>
              <div className="action-content">
                <div className="action-title">Create Product</div>
                <p className="action-description">Add new DPP</p>
              </div>
            </Link>

            <Link to="/products" className="action-item">
              <div className="action-icon">📦</div>
              <div className="action-content">
                <div className="action-title">View Products</div>
                <p className="action-description">Browse catalog</p>
              </div>
            </Link>

            <Link to="/qr-management" className="action-item">
              <div className="action-icon">🔲</div>
              <div className="action-content">
                <div className="action-title">Generate QR</div>
                <p className="action-description">Create codes</p>
              </div>
            </Link>

            <Link to="/settings" className="action-item">
              <div className="action-icon">⚙️</div>
              <div className="action-content">
                <div className="action-title">Settings</div>
                <p className="action-description">Manage profile</p>
              </div>
            </Link>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="activity-card">
        <div className="card-header">
          <h2 className="card-title">
            <span>🕐</span>
            Recent Activity
          </h2>
          <Link to="/auditor" className="card-btn">
            View All
          </Link>
        </div>
        <div className="activity-list">
          {recentActivity.map((activity) => (
            <div key={activity.id} className="activity-item">
              <div className="activity-icon">{activity.icon}</div>
              <div className="activity-content">
                <div className="activity-title">{activity.title}</div>
                <div className="activity-description">{activity.description}</div>
                <div className="activity-time">{activity.time}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
