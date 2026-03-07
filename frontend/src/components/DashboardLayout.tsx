import { type ReactNode, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import './DashboardLayout.css';

interface DashboardLayoutProps {
  children: ReactNode;
}

interface NavItem {
  path: string;
  label: string;
  icon: string;
}

const navItems: NavItem[] = [
  { path: '/dashboard', label: 'Dashboard', icon: '📊' },
  { path: '/create-dpp', label: 'Create DPP', icon: '➕' },
  { path: '/products', label: 'Products List', icon: '📦' },
  { path: '/qr-management', label: 'QR Management', icon: '🔲' },
  { path: '/auditor', label: 'Auditor', icon: '🔍' },
  { path: '/settings', label: 'Settings', icon: '⚙️' },
];

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  return (
    <div className="dashboard-layout">
      {/* Sidebar */}
      <aside className={`sidebar ${isSidebarOpen ? 'open' : 'closed'}`}>
        <div className="sidebar-header">
          <h1 className="logo">Green Passport</h1>
          <button className="toggle-btn" onClick={toggleSidebar} aria-label="Toggle sidebar">
            {isSidebarOpen ? '◀' : '▶'}
          </button>
        </div>
        
        <nav className="sidebar-nav">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`nav-item ${location.pathname === item.path ? 'active' : ''}`}
            >
              <span className="nav-icon">{item.icon}</span>
              {isSidebarOpen && <span className="nav-label">{item.label}</span>}
            </Link>
          ))}
        </nav>

        {isSidebarOpen && (
          <div className="sidebar-footer">
            <p className="user-info">Manufacturer Portal</p>
          </div>
        )}
      </aside>

      {/* Main Content */}
      <main className={`main-content ${isSidebarOpen ? 'sidebar-open' : 'sidebar-closed'}`}>
        <header className="content-header">
          <button className="mobile-menu-btn" onClick={toggleSidebar} aria-label="Toggle menu">
            ☰
          </button>
          <div className="header-actions">
            <button className="header-btn">🔔</button>
            <button className="header-btn">👤</button>
          </div>
        </header>
        
        <div className="content-body">
          {children}
        </div>
      </main>
    </div>
  );
}
