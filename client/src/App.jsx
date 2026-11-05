import { useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import Layout from './components/Layout'
import LoadingSpinner from './components/LoadingSpinner'
import Onboarding from './pages/Onboarding'
import SignIn from './pages/SignIn'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import Reserve from './pages/Reserve'
import MyReservations from './pages/MyReservations'
import ParkingMap from './pages/ParkingMap'
import AdminDashboard from './pages/AdminDashboard'
import Profile from './pages/Profile'
import Feedback from './pages/Feedback'

/* Reset scroll to top on every page navigation */
function ScrollToTop() {
  const { pathname } = useLocation()

  useEffect(() => {
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: 'instant',
    })
    document.documentElement.scrollTop = 0
    document.body.scrollTop = 0

    const mainContent = document.querySelector('.layout-content')
    if (mainContent) {
      mainContent.scrollTop = 0
    }
  }, [pathname])

  return null
}

/* Protected Route Component */
function ProtectedRoute({ children, adminOnly = false }) {
  const { user, profile, loading } = useAuth()

  if (loading) {
    return <LoadingSpinner fullScreen />
  }

  if (!user) {
    return <Navigate to="/signin" replace />
  }

  if (adminOnly && profile?.role !== 'admin') {
    return <Navigate to="/dashboard" replace />
  }

  return <Layout>{children}</Layout>
}

/* Auth Route - redirects to dashboard if already signed in */
function AuthRoute({ children }) {
  const { user, loading } = useAuth()

  if (loading) {
    return <LoadingSpinner fullScreen />
  }

  if (user) {
    return <Navigate to="/dashboard" replace />
  }

  return children
}

/* Root Route - shows onboarding or redirects */
function RootRoute() {
  const { user, loading } = useAuth()
  const onboardingSeen = localStorage.getItem('smartpark_onboarding_seen')

  if (loading) {
    return <LoadingSpinner fullScreen />
  }

  if (user) {
    return <Navigate to="/dashboard" replace />
  }

  if (!onboardingSeen) {
    return <Onboarding />
  }

  return <Navigate to="/signin" replace />
}

/* Main App Content */
function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<RootRoute />} />

      <Route path="/signin" element={
        <AuthRoute><SignIn /></AuthRoute>
      } />

      <Route path="/register" element={
        <AuthRoute><Register /></AuthRoute>
      } />

      <Route path="/dashboard" element={
        <ProtectedRoute><Dashboard /></ProtectedRoute>
      } />

      <Route path="/reserve" element={
        <ProtectedRoute><Reserve /></ProtectedRoute>
      } />

      <Route path="/my-reservations" element={
        <ProtectedRoute><MyReservations /></ProtectedRoute>
      } />

      <Route path="/parking-map" element={
        <ProtectedRoute><ParkingMap /></ProtectedRoute>
      } />

      <Route path="/admin" element={
        <ProtectedRoute adminOnly><AdminDashboard /></ProtectedRoute>
      } />

      <Route path="/profile" element={
        <ProtectedRoute><Profile /></ProtectedRoute>
      } />

      <Route path="/feedback" element={
        <ProtectedRoute><Feedback /></ProtectedRoute>
      } />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

function App() {
  return (
    <Router>
      <ScrollToTop />
      <AuthProvider>
        <Toaster
          position="top-center"
          toastOptions={{
            duration: 3000,
            style: {
              background: '#1E293B',
              color: '#FFFFFF',
              borderRadius: '12px',
              padding: '12px 20px',
              fontSize: '0.875rem',
              fontWeight: 500,
              fontFamily: "'Inter', sans-serif",
              boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
            },
            success: {
              iconTheme: { primary: '#10B981', secondary: '#FFFFFF' },
            },
            error: {
              iconTheme: { primary: '#EF4444', secondary: '#FFFFFF' },
            },
          }}
        />
        <AppRoutes />
      </AuthProvider>
    </Router>
  )
}

export default App
