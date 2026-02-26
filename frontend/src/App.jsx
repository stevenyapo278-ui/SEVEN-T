import { lazy, Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './contexts/AuthContext'

// Public pages (loaded immediately)
import Landing from './pages/Landing'
import Login from './pages/Login'
import Register from './pages/Register'
import AuthCallback from './pages/AuthCallback'
import Legal from './pages/Legal'

// Dashboard pages (lazy)
const Dashboard = lazy(() => import('./pages/Dashboard'))
const Agents = lazy(() => import('./pages/Agents'))
const AgentDetail = lazy(() => import('./pages/AgentDetail'))
const Products = lazy(() => import('./pages/Products'))
const KnowledgeBase = lazy(() => import('./pages/KnowledgeBase'))
const Leads = lazy(() => import('./pages/Leads'))
const Orders = lazy(() => import('./pages/Orders'))
const Conversations = lazy(() => import('./pages/Conversations'))
const ConversationDetail = lazy(() => import('./pages/ConversationDetail'))
const Settings = lazy(() => import('./pages/Settings'))
const Admin = lazy(() => import('./pages/Admin'))
const Analytics = lazy(() => import('./pages/Analytics'))
const Campaigns = lazy(() => import('./pages/Campaigns'))
const Templates = lazy(() => import('./pages/Templates'))
const Workflows = lazy(() => import('./pages/Workflows'))
const Payments = lazy(() => import('./pages/Payments'))
const Expenses = lazy(() => import('./pages/Expenses'))
const Flows = lazy(() => import('./pages/Flows'))
const FlowBuilder = lazy(() => import('./pages/FlowBuilder'))
const Reports = lazy(() => import('./pages/Reports'))
const Notifications = lazy(() => import('./pages/Notifications'))
const Tools = lazy(() => import('./pages/Tools'))

import ErrorBoundary from './components/ErrorBoundary'
import CookieConsentBanner from './components/CookieConsentBanner'
import DashboardLayout from './layouts/DashboardLayout'

function PageFallback() {
  return (
    <div className="min-h-[50vh] flex items-center justify-center" aria-busy="true" aria-label="Chargement">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gold-400 flex-shrink-0" />
    </div>
  )
}

// Protected Route Component
function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center flex-col gap-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gold-400 flex-shrink-0" aria-hidden />
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  return children
}

// Admin Route Component
function AdminRoute({ children }) {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center flex-col gap-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gold-400 flex-shrink-0" aria-hidden />
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  if (!user.is_admin) {
    return <Navigate to="/dashboard" replace />
  }

  return children
}

function App() {
  return (
    <ErrorBoundary>
      <CookieConsentBanner />
      <Routes>
      {/* Public routes */}
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/auth/callback" element={<AuthCallback />} />
      <Route path="/legal" element={<Legal />} />

      {/* Protected routes */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Suspense fallback={<PageFallback />}><Dashboard /></Suspense>} />
        <Route path="agents" element={<Suspense fallback={<PageFallback />}><Agents /></Suspense>} />
        <Route path="agents/:id" element={<Suspense fallback={<PageFallback />}><AgentDetail /></Suspense>} />
        <Route path="products" element={<Suspense fallback={<PageFallback />}><Products /></Suspense>} />
        <Route path="knowledge" element={<Suspense fallback={<PageFallback />}><KnowledgeBase /></Suspense>} />
        <Route path="leads" element={<Suspense fallback={<PageFallback />}><Leads /></Suspense>} />
        <Route path="orders" element={<Suspense fallback={<PageFallback />}><Orders /></Suspense>} />
        <Route path="conversations" element={<Suspense fallback={<PageFallback />}><Conversations /></Suspense>} />
        <Route path="conversations/:id" element={<Suspense fallback={<PageFallback />}><ConversationDetail /></Suspense>} />
        <Route path="analytics" element={<Suspense fallback={<PageFallback />}><Analytics /></Suspense>} />
        <Route path="campaigns" element={<Suspense fallback={<PageFallback />}><Campaigns /></Suspense>} />
        <Route path="templates" element={<Suspense fallback={<PageFallback />}><Templates /></Suspense>} />
        <Route path="workflows" element={<Suspense fallback={<PageFallback />}><Workflows /></Suspense>} />
        <Route path="payments" element={<Suspense fallback={<PageFallback />}><Payments /></Suspense>} />
        <Route path="expenses" element={<Suspense fallback={<PageFallback />}><Expenses /></Suspense>} />
        <Route path="tools" element={<Suspense fallback={<PageFallback />}><Tools /></Suspense>} />
        <Route path="flows" element={<Suspense fallback={<PageFallback />}><Flows /></Suspense>} />
        <Route path="flows/:id" element={<Suspense fallback={<PageFallback />}><FlowBuilder /></Suspense>} />
        <Route path="reports" element={<Suspense fallback={<PageFallback />}><Reports /></Suspense>} />
        <Route path="notifications" element={<Suspense fallback={<PageFallback />}><Notifications /></Suspense>} />
        <Route path="settings" element={<Suspense fallback={<PageFallback />}><Settings /></Suspense>} />
        <Route path="admin" element={
          <AdminRoute>
            <Suspense fallback={<PageFallback />}><Admin /></Suspense>
          </AdminRoute>
        } />
      </Route>

      {/* Catch all */}
      <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </ErrorBoundary>
  )
}

export default App
