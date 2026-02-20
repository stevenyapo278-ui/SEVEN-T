import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './contexts/AuthContext'

// Pages
import Landing from './pages/Landing'
import Login from './pages/Login'
import Register from './pages/Register'
import AuthCallback from './pages/AuthCallback'
import Dashboard from './pages/Dashboard'
import Agents from './pages/Agents'
import AgentDetail from './pages/AgentDetail'
import Products from './pages/Products'
import KnowledgeBase from './pages/KnowledgeBase'
import Leads from './pages/Leads'
import Orders from './pages/Orders'
import Conversations from './pages/Conversations'
import ConversationDetail from './pages/ConversationDetail'
import Settings from './pages/Settings'
import Admin from './pages/Admin'
import Legal from './pages/Legal'
import Analytics from './pages/Analytics'
import Campaigns from './pages/Campaigns'
import Templates from './pages/Templates'
import Workflows from './pages/Workflows'
import Payments from './pages/Payments'
import Flows from './pages/Flows'
import FlowBuilder from './pages/FlowBuilder'
import Reports from './pages/Reports'
import Notifications from './pages/Notifications'
import Tools from './pages/Tools'
import ErrorBoundary from './components/ErrorBoundary'

// Layout
import DashboardLayout from './layouts/DashboardLayout'

// Protected Route Component
function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gold-400"></div>
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
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gold-400"></div>
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
        <Route index element={<Dashboard />} />
        <Route path="agents" element={<Agents />} />
        <Route path="agents/:id" element={<AgentDetail />} />
        <Route path="products" element={<Products />} />
        <Route path="knowledge" element={<KnowledgeBase />} />
        <Route path="leads" element={<Leads />} />
        <Route path="orders" element={<Orders />} />
        <Route path="conversations" element={<Conversations />} />
        <Route path="conversations/:id" element={<ConversationDetail />} />
        <Route path="analytics" element={<Analytics />} />
        <Route path="campaigns" element={<Campaigns />} />
        <Route path="templates" element={<Templates />} />
        <Route path="workflows" element={<Workflows />} />
        <Route path="payments" element={<Payments />} />
        <Route path="tools" element={<Tools />} />
        <Route path="flows" element={<Flows />} />
        <Route path="flows/:id" element={<FlowBuilder />} />
        <Route path="reports" element={<Reports />} />
        <Route path="notifications" element={<Notifications />} />
        <Route path="settings" element={<Settings />} />
        <Route path="admin" element={
          <AdminRoute>
            <Admin />
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
