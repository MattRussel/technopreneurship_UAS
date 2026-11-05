import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import {
  HiHome,
  HiMap,
  HiCalendar,
  HiClipboardList,
  HiUser,
  HiCog,
  HiLogout,
  HiMenu,
  HiX,
  HiChat,
} from 'react-icons/hi'
import { useState } from 'react'
import './Layout.css'

const navItems = [
  { path: '/dashboard', label: 'Home', icon: HiHome },
  { path: '/parking-map', label: 'Map', icon: HiMap },
  { path: '/reserve', label: 'Reserve', icon: HiCalendar },
  { path: '/my-reservations', label: 'Bookings', icon: HiClipboardList },
  { path: '/profile', label: 'Profile', icon: HiUser },
]

const sidebarItems = [
  { path: '/dashboard', label: 'Dashboard', icon: HiHome },
  { path: '/parking-map', label: 'Parking Map', icon: HiMap },
  { path: '/reserve', label: 'Reserve Spot', icon: HiCalendar },
  { path: '/my-reservations', label: 'My Reservations', icon: HiClipboardList },
  { path: '/feedback', label: 'Feedback', icon: HiChat },
  { path: '/profile', label: 'Profile', icon: HiUser },
]

function Layout({ children }) {
  const { user, profile, signOut } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const handleSignOut = async () => {
    await signOut()
    navigate('/signin')
  }

  const getInitials = () => {
    if (profile?.full_name) {
      const parts = profile.full_name.split(' ')
      return parts.map(p => p[0]).join('').toUpperCase().slice(0, 2)
    }
    if (user?.email) {
      return user.email[0].toUpperCase()
    }
    return 'U'
  }

  const displayName = profile?.full_name || user?.email?.split('@')[0] || 'User'
  const isAdmin = profile?.role === 'admin'

  return (
    <div className="layout">
      {/* Header */}
      <header className="layout-header">
        <div className="header-left">
          <button
            className="menu-toggle hide-desktop"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            aria-label="Toggle menu"
          >
            {sidebarOpen ? <HiX size={24} /> : <HiMenu size={24} />}
          </button>
          <NavLink to="/dashboard" className="header-logo">
            <div className="logo-icon">P</div>
            <span className="logo-text">SmartPark Mall</span>
          </NavLink>
        </div>
        <div className="header-right">
          <NavLink to="/profile" className="header-avatar" title={displayName}>
            <span>{getInitials()}</span>
          </NavLink>
        </div>
      </header>

      {/* Desktop Sidebar */}
      <aside className={`layout-sidebar ${sidebarOpen ? 'sidebar-open' : ''}`}>
        <div className="sidebar-header">
          <div className="sidebar-user">
            <div className="sidebar-avatar">
              <span>{getInitials()}</span>
            </div>
            <div className="sidebar-user-info">
              <span className="sidebar-user-name">{displayName}</span>
              <span className="sidebar-user-email">{user?.email}</span>
            </div>
          </div>
        </div>

        <nav className="sidebar-nav">
          <div className="sidebar-nav-section">
            <span className="sidebar-nav-label">Main</span>
            {sidebarItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `sidebar-nav-item ${isActive ? 'active' : ''}`
                }
                onClick={() => setSidebarOpen(false)}
              >
                <item.icon size={20} />
                <span>{item.label}</span>
              </NavLink>
            ))}
          </div>

          {isAdmin && (
            <div className="sidebar-nav-section">
              <span className="sidebar-nav-label">Management</span>
              <NavLink
                to="/admin"
                className={({ isActive }) =>
                  `sidebar-nav-item ${isActive ? 'active' : ''}`
                }
                onClick={() => setSidebarOpen(false)}
              >
                <HiCog size={20} />
                <span>Admin Dashboard</span>
              </NavLink>
            </div>
          )}
        </nav>

        <div className="sidebar-footer">
          <button className="sidebar-nav-item signout-btn" onClick={handleSignOut}>
            <HiLogout size={20} />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Sidebar Overlay (mobile) */}
      {sidebarOpen && (
        <div
          className="sidebar-overlay hide-desktop"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main Content */}
      <main className="layout-content">
        {children}
      </main>

      {/* Bottom Navigation (mobile) */}
      <nav className="bottom-nav hide-desktop">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `bottom-nav-item ${isActive ? 'active' : ''}`
            }
          >
            <item.icon size={22} />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  )
}

export default Layout
