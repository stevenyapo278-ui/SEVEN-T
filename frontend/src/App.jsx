import { lazy, Suspense } from 'react'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useAuth } from './contexts/AuthContext'
import { useModuleAvailability } from './hooks/useModuleAvailability'

// Public pages (loaded immediately)
import Landing from './pages/Landing'
import Login from './pages/Login'
import Register from './pages/Register'
import AuthCallback from './pages/AuthCallback'
import Legal from './pages/Legal'
import ForgotPassword from './pages/ForgotPassword'
import ResetPassword from './pages/ResetPassword'

// Dashboard pages (lazy)
const Dashboard = lazy(() => import('./pages/Dashboard'))
const Agents = lazy(() => import('./pages/Agents'))
const AgentDetail = lazy(() => import('./pages/AgentDetail'))
const Products = lazy(() => import('./pages/Products'))
const Services = lazy(() => import('./pages/Services'))
const KnowledgeBase = lazy(() => import('./pages/KnowledgeBase'))
const Leads = lazy(() => import('./pages/Leads'))
const Orders = lazy(() => import('./pages/Orders'))
const Conversations = lazy(() => import('./pages/Conversations'))
const ConversationDetail = lazy(() => import('./pages/ConversationDetail'))
const Settings = lazy(() => import('./pages/Settings'))
const Admin = lazy(() => import('./pages/Admin'))
const Analytics = lazy(() => import('./pages/Analytics'))
const Campaigns = lazy(() => import('./pages/Campaigns'))
const Relances = lazy(() => import('./pages/Relances'))
const Templates = lazy(() => import('./pages/Templates'))
const Workflows = lazy(() => import('./pages/Workflows'))
const Payments = lazy(() => import('./pages/Payments'))
const Expenses = lazy(() => import('./pages/Expenses'))
const Flows = lazy(() => import('./pages/Flows'))
const FlowBuilder = lazy(() => import('./pages/FlowBuilder'))
const Reports = lazy(() => import('./pages/Reports'))
const Notifications = lazy(() => import('./pages/Notifications'))
const Tools = lazy(() => import('./pages/Tools'))
const Help = lazy(() => import('./pages/Help'))
const Docs = lazy(() => import('./pages/Docs'))
const Tickets = lazy(() => import('./pages/Tickets'))
const TicketDetail = lazy(() => import('./pages/TicketDetail'))
const SupportTickets = lazy(() => import('./pages/SupportTickets'))
const SupportTicketDetail = lazy(() => import('./pages/SupportTicketDetail'))
const Logs = lazy(() => import('./pages/Logs'))
const Team = lazy(() => import('./pages/Team'))
const WhatsAppStatus = lazy(() => import('./pages/WhatsAppStatus'))
const Deals = lazy(() => import('./pages/Deals'))
const Pricing = lazy(() => import('./pages/Pricing'))
const Polls = lazy(() => import('./pages/Polls'))


// Partner Pages
const PartnerLogin = lazy(() => import('./pages/Partner/PartnerLogin'))
const PartnerDashboard = lazy(() => import('./pages/Partner/PartnerDashboard'))
const PartnerLayout = lazy(() => import('./layouts/PartnerLayout'))
import { PartnerAuthProvider } from './contexts/PartnerAuthContext'

import ErrorBoundary from './components/ErrorBoundary'
import CookieConsentBanner from './components/CookieConsentBanner'
import DashboardLayout from './layouts/DashboardLayout'
import TrialExpiredBanner from './components/TrialExpiredBanner'
import LockedModuleView from './components/LockedModuleView'
import { 
  BarChart3, 
  CreditCard, 
  GitBranch, 
  Users, 
  MessageSquare, 
  FileText, 
  PhoneCall, 
  Layout, 
  Send,
  Trello
} from 'lucide-react'

function PageFallback() {
  return <div className="min-h-[50vh] w-full" aria-busy="true" />
}

// Protected Route Component
function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center flex-col gap-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gold-400 flex-shrink-0" aria-hidden />
      </div>
    )
  }

  if (!user) {
    const from = `${location.pathname}${location.search || ''}`
    const redirect = from.startsWith('/dashboard') ? `?redirect=${encodeURIComponent(from)}` : ''
    return <Navigate to={`/login${redirect}`} replace />
  }

  return children
}

// Admin Route Component
function AdminRoute({ children }) {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center flex-col gap-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gold-400 flex-shrink-0" aria-hidden />
      </div>
    )
  }

  if (!user) {
    const from = `${location.pathname}${location.search || ''}`
    const redirect = from.startsWith('/dashboard') ? `?redirect=${encodeURIComponent(from)}` : ''
    return <Navigate to={`/login${redirect}`} replace />
  }

  const isAnyAdmin = Boolean(
    user.is_admin ||
    user.can_manage_users ||
    user.can_manage_plans ||
    user.can_view_stats ||
    user.can_manage_ai ||
    user.can_manage_tickets
  )

  if (!isAnyAdmin) {
    return <Navigate to="/dashboard" replace />
  }

  return children
}

function SupportRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center flex-col gap-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gold-400 flex-shrink-0" aria-hidden />
      </div>
    )
  }
  if (!user) return <Navigate to="/login" replace />

  const canSupport = Boolean(user.is_admin || (user.permissions || []).includes('support.tickets.read'))
  if (!canSupport) return <Navigate to="/dashboard" replace />
  return children
}

// StandardRoute - Blocks influencer-only users from accessing normal dashboard pages
function StandardRoute({ children }) {
  const { user, loading } = useAuth()
  const location = useLocation()
  const { status } = useModuleAvailability()

  if (loading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center flex-col gap-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gold-400 flex-shrink-0" aria-hidden />
      </div>
    )
  }

  if (!user) return <Navigate to="/login" replace />

  // Influencer-only accounts
  if (user.influencer_only) {
    const slug = user.name ? user.name.toLowerCase().trim().replace(/\s+/g, '-') : 'partenaire'
    return <Navigate to={`/dashboard/${slug}`} replace />
  }

  // Module lock check
  const pathMap = {
    '/dashboard/analytics': { key: 'analytics', name: 'Analyses Avancées', icon: BarChart3, desc: 'Obtenez des informations stratégiques sur vos performances et votre ROI.' },
    '/dashboard/reports': { key: 'reports', name: 'Rapports Professionnels', icon: FileText, desc: 'Générez des rapports PDF exportables pour vos réunions et bilans.' },
    '/dashboard/payments': { key: 'payment', name: 'Module de Paiement', icon: CreditCard, desc: 'Enclenchez des paiements directement via WhatsApp et suivez vos revenus.' },
    '/dashboard/flows': { key: 'flows', name: 'Constructeur de Flux', icon: GitBranch, desc: 'Créez des parcours clients automatisés complexes et visuels.' },
    '/dashboard/whatsapp-status': { key: 'whatsappStatus', name: 'Statut WhatsApp', icon: PhoneCall, desc: 'Surveillez l\'état de vos comptes WhatsApp et la qualité de connexion.' },
    '/dashboard/leads': { key: 'leads', name: 'Gestion des Prospects', icon: Users, desc: 'Organisez et qualifiez vos leads entrants automatiquement.' },
    '/dashboard/campaigns': { key: 'campaigns', name: 'Campagnes Marketing', icon: Send, desc: 'Lancez des campagnes de messages de masse ciblées et performantes.' },
    '/dashboard/deals': { key: 'deals', name: 'Pipeline de Ventes', icon: Trello, desc: 'Suivez vos opportunités commerciales de la prise de contact à la clôture.' },
  };

  const currentPath = location.pathname;
  const modInfo = pathMap[currentPath] || Object.entries(pathMap).find(([path]) => currentPath.startsWith(path))?.[1];

  if (modInfo && status[modInfo.key]?.locked) {
    return <LockedModuleView moduleName={modInfo.name} description={modInfo.desc} icon={modInfo.icon} />;
  }

  return children
}

import { OnboardingTourProvider } from './components/Onboarding'

function App() {
  const { user } = useAuth()
  return (
    <ErrorBoundary>
      <PartnerAuthProvider>
        <OnboardingTourProvider userId={user?.id}>
          <CookieConsentBanner />
          <TrialExpiredBanner />
          <Routes>
        {/* Public routes */}
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/auth/callback" element={<AuthCallback />} />
        <Route path="/legal" element={<Legal />} />

        {/* Partner Portal Routes */}
        <Route path="/partner/login" element={<Suspense fallback={<PageFallback />}><PartnerLogin /></Suspense>} />
        <Route path="/partner" element={<Suspense fallback={<PageFallback />}><PartnerLayout /></Suspense>}>
          <Route path="dashboard" element={<Suspense fallback={<PageFallback />}><PartnerDashboard /></Suspense>} />
          <Route index element={<Navigate to="/partner/dashboard" replace />} />
        </Route>

        {/* Protected routes */}
        <Route
          path="/dashboard/*"
          element={
            <ProtectedRoute>
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<StandardRoute><Suspense fallback={<PageFallback />}><Dashboard /></Suspense></StandardRoute>} />
          <Route path=":slug" element={<Suspense fallback={<PageFallback />}><PartnerDashboard /></Suspense>} />
          <Route path="agents" element={<StandardRoute><Suspense fallback={<PageFallback />}><Agents /></Suspense></StandardRoute>} />
          <Route path="agents/:id" element={<StandardRoute><Suspense fallback={<PageFallback />}><AgentDetail /></Suspense></StandardRoute>} />
          <Route path="products" element={<StandardRoute><Suspense fallback={<PageFallback />}><Products /></Suspense></StandardRoute>} />
          <Route path="services" element={<StandardRoute><Suspense fallback={<PageFallback />}><Services /></Suspense></StandardRoute>} />
          <Route path="knowledge" element={<StandardRoute><Suspense fallback={<PageFallback />}><KnowledgeBase /></Suspense></StandardRoute>} />
          <Route path="leads" element={<StandardRoute><Suspense fallback={<PageFallback />}><Leads /></Suspense></StandardRoute>} />
          <Route path="orders" element={<StandardRoute><Suspense fallback={<PageFallback />}><Orders /></Suspense></StandardRoute>} />
          <Route path="conversations" element={<StandardRoute><Suspense fallback={<PageFallback />}><Conversations /></Suspense></StandardRoute>} />
          <Route path="conversations/:id" element={<StandardRoute><Suspense fallback={<PageFallback />}><ConversationDetail /></Suspense></StandardRoute>} />
          <Route path="analytics" element={<StandardRoute><Suspense fallback={<PageFallback />}><Analytics /></Suspense></StandardRoute>} />
          <Route path="campaigns" element={<StandardRoute><Suspense fallback={<PageFallback />}><Campaigns /></Suspense></StandardRoute>} />
          <Route path="relances" element={<StandardRoute><Suspense fallback={<PageFallback />}><Relances /></Suspense></StandardRoute>} />
          <Route path="templates" element={<StandardRoute><Suspense fallback={<PageFallback />}><Templates /></Suspense></StandardRoute>} />
          <Route path="workflows" element={<StandardRoute><Suspense fallback={<PageFallback />}><Workflows /></Suspense></StandardRoute>} />
          <Route path="payments" element={<StandardRoute><Suspense fallback={<PageFallback />}><Payments /></Suspense></StandardRoute>} />
          <Route path="expenses" element={<StandardRoute><Suspense fallback={<PageFallback />}><Expenses /></Suspense></StandardRoute>} />
          <Route path="tools" element={<StandardRoute><Suspense fallback={<PageFallback />}><Tools /></Suspense></StandardRoute>} />
          <Route path="flows" element={<StandardRoute><Suspense fallback={<PageFallback />}><Flows /></Suspense></StandardRoute>} />
          <Route path="flows/:id" element={<StandardRoute><Suspense fallback={<PageFallback />}><FlowBuilder /></Suspense></StandardRoute>} />
          <Route path="reports" element={<StandardRoute><Suspense fallback={<PageFallback />}><Reports /></Suspense></StandardRoute>} />
          <Route path="notifications" element={<StandardRoute><Suspense fallback={<PageFallback />}><Notifications /></Suspense></StandardRoute>} />
          <Route path="tickets" element={<StandardRoute><Suspense fallback={<PageFallback />}><Tickets /></Suspense></StandardRoute>} />
          <Route path="tickets/:id" element={<StandardRoute><Suspense fallback={<PageFallback />}><TicketDetail /></Suspense></StandardRoute>} />
          <Route path="settings" element={<StandardRoute><Suspense fallback={<PageFallback />}><Settings /></Suspense></StandardRoute>} />
          <Route path="team" element={<StandardRoute><Suspense fallback={<PageFallback />}><Team /></Suspense></StandardRoute>} />
          <Route path="whatsapp-status" element={<StandardRoute><Suspense fallback={<PageFallback />}><WhatsAppStatus /></Suspense></StandardRoute>} />
          <Route path="deals" element={<StandardRoute><Suspense fallback={<PageFallback />}><Deals /></Suspense></StandardRoute>} />
          <Route path="pricing" element={<StandardRoute><Suspense fallback={<PageFallback />}><Pricing /></Suspense></StandardRoute>} />
          <Route path="logs" element={<StandardRoute><Suspense fallback={<PageFallback />}><Logs /></Suspense></StandardRoute>} />
          <Route path="help" element={<StandardRoute><Suspense fallback={<PageFallback />}><Help /></Suspense></StandardRoute>} />
          <Route path="polls" element={<StandardRoute><Suspense fallback={<PageFallback />}><Polls /></Suspense></StandardRoute>} />

          <Route path="docs" element={<Suspense fallback={<PageFallback />}><Docs /></Suspense>} />
          <Route path="admin" element={
            <AdminRoute>
              <Suspense fallback={<PageFallback />}><Admin /></Suspense>
            </AdminRoute>
          } />
          <Route path="support" element={
            <SupportRoute>
              <Suspense fallback={<PageFallback />}><SupportTickets /></Suspense>
            </SupportRoute>
          } />
          <Route path="support/tickets/:id" element={
            <SupportRoute>
              <Suspense fallback={<PageFallback />}><SupportTicketDetail /></Suspense>
            </SupportRoute>
          } />
        </Route>

        {/* Catch all */}
        <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        </OnboardingTourProvider>
      </PartnerAuthProvider>
    </ErrorBoundary>
  )
}

export default App
