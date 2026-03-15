import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useTheme } from '../contexts/ThemeContext'
import { useLockBodyScroll } from '../hooks/useLockBodyScroll'
import api from '../services/api'
import { MessageSquare, Mail, Calendar, Plus, RefreshCw, Trash2, Power, PowerOff, Wrench, Crown, X, Pencil, Check, MessageCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import { useOnboardingTour } from '../components/Onboarding'

const TOOL_LABELS = {
  whatsapp: 'WhatsApp',
  outlook: 'Outlook',
  google_calendar: 'Google Calendar'
}

const POLL_INTERVAL_MS = 2000
const POLL_TIMEOUT_MS = 5 * 60 * 1000 // 5 min max

export default function Tools() {
  const { startTour, completedTours, nextStep, isStepActive } = useOnboardingTour()
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const [searchParams, setSearchParams] = useSearchParams()
  const [tools, setTools] = useState([])
  const [usage, setUsage] = useState({})
  const [limits, setLimits] = useState({})
  const [loading, setLoading] = useState(true)
  const [qrByTool, setQrByTool] = useState({})
  const [busyToolId, setBusyToolId] = useState(null)
  const [connectingToolId, setConnectingToolId] = useState(null)
  useLockBodyScroll(!!connectingToolId)
  const [quotas, setQuotas] = useState(null)
  const [editingToolId, setEditingToolId] = useState(null)
  const [editingLabel, setEditingLabel] = useState('')
  const [loadError, setLoadError] = useState(null)
  const [configTool, setConfigTool] = useState(null)

  const loadTools = async () => {
    setLoadError(null)
    setLoading(true)
    try {
      const [toolsRes, quotasRes] = await Promise.all([
        api.get('/tools'),
        api.get('/agents/quotas').catch(() => ({ data: null }))
      ])
      setTools(toolsRes.data.tools || [])
      setUsage(toolsRes.data.usage || {})
      setLimits(toolsRes.data.limits || {})
      setQuotas(quotasRes.data || null)
    } catch (error) {
      const message = error.response?.data?.error || error.message || 'Erreur de chargement'
      setLoadError(message)
      toast.error('Impossible de charger les outils')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadTools()
  }, [])

  useEffect(() => {
    if (!completedTours.includes('whatsapp_connect')) {
      startTour('whatsapp_connect')
    }
  }, [completedTours, startTour])

  // Move to next step of whatsapp_connect tour if we start connecting
  useEffect(() => {
    if (connectingToolId && isStepActive('wc-select-agent')) {
      nextStep()
    }
  }, [connectingToolId, isStepActive, nextStep])

  useEffect(() => {
    // Check for Outlook OAuth results
    const outlook = searchParams.get('outlook')
    const outlookError = searchParams.get('outlook_error')
    if (outlook === 'connected') {
      toast.success('Compte Outlook connecté')
      searchParams.delete('outlook')
      setSearchParams(searchParams, { replace: true })
      loadTools()
    } else if (outlookError) {
      toast.error(decodeURIComponent(outlookError))
      searchParams.delete('outlook_error')
      setSearchParams(searchParams, { replace: true })
    }

    // Check for Google OAuth results
    const google = searchParams.get('google')
    const googleError = searchParams.get('google_error')
    if (google === 'connected') {
      toast.success('Compte Google Calendar connecté')
      searchParams.delete('google')
      setSearchParams(searchParams, { replace: true })
      loadTools()
    } else if (googleError) {
      toast.error(decodeURIComponent(googleError))
      searchParams.delete('google_error')
      setSearchParams(searchParams, { replace: true })
    }
  }, [searchParams])

  // Poll status when connecting: show QR and detect when connected (no extra click)
  useEffect(() => {
    if (!connectingToolId) return
    const start = Date.now()
    const poll = async () => {
      if (Date.now() - start > POLL_TIMEOUT_MS) {
        setConnectingToolId(null)
        setBusyToolId(null)
        return
      }
      try {
        const res = await api.get(`/whatsapp/status/${connectingToolId}`)
        if (res.data.qr) {
          setQrByTool(prev => ({ ...prev, [connectingToolId]: res.data.qr }))
        }
        if (res.data.status === 'connected') {
          setConnectingToolId(null)
          setBusyToolId(null)
          setQrByTool(prev => ({ ...prev, [connectingToolId]: null }))
          await loadTools()
          toast.success('WhatsApp connecté')
        }
      } catch {
        // keep polling
      }
    }
    poll()
    const interval = setInterval(poll, POLL_INTERVAL_MS)
    return () => clearInterval(interval)
  }, [connectingToolId])

  const connectWhatsApp = async (toolId, forceNew = false) => {
    try {
      setBusyToolId(toolId)
      setQrByTool(prev => ({ ...prev, [toolId]: null }))
      await api.post(`/whatsapp/connect/${toolId}`, { forceNew })
      setConnectingToolId(toolId)
    } catch (error) {
      const message = error.response?.data?.error || 'Connexion WhatsApp échouée'
      toast.error(message)
      setBusyToolId(null)
    }
  }

  const disconnectWhatsApp = async (toolId) => {
    try {
      setBusyToolId(toolId)
      await api.post(`/whatsapp/disconnect/${toolId}`)
      setQrByTool(prev => ({ ...prev, [toolId]: null }))
      await loadTools()
    } catch (error) {
      toast.error('Déconnexion WhatsApp échouée')
    } finally {
      setBusyToolId(null)
    }
  }

  const cancelConnect = async (toolId) => {
    setConnectingToolId(null)
    setBusyToolId(null)
    setQrByTool(prev => ({ ...prev, [toolId]: null }))
    try {
      await api.post(`/whatsapp/disconnect/${toolId}`)
      await loadTools()
    } catch {
      // ignore
    }
  }

  const saveOutlookConfig = async (e) => {
    e.preventDefault();
    if (!configTool?.id || !configTool.draftConfig) return;
    try {
      setBusyToolId(configTool.id);
      
      const { clientId, clientSecret } = configTool.draftConfig;
      if (!clientId || !clientSecret) {
        toast.error('Client ID et Secret requis');
        return;
      }

      await api.patch(`/tools/${configTool.id}`, {
        config: configTool.draftConfig
      });
      
      const savedToolId = configTool.id;
      setConfigTool(null);
      toast.success('Configuration sauvegardée, redirection vers Microsoft…');
      
      // Lance la connexion OAuth maintenant que configuré  
      await connectOutlookAuth(savedToolId);
    } catch (err) {
      toast.error('Erreur configuration Outlook');
    } finally {
      setBusyToolId(null);
    }
  };

  const connectOutlookAuth = async (toolId) => {
    try {
      setBusyToolId(toolId)
      const res = await api.post('/outlook/connect-url', { toolId })
      if (res.data?.url) {
        window.location.href = res.data.url
        return
      }
      toast.error('Impossible d’obtenir l’URL de connexion Outlook')
    } catch (error) {
      const message = error.response?.data?.error || 'Connexion Outlook échouée'
      toast.error(message)
    } finally {
      setBusyToolId(null)
    }
  }

  const disconnectOutlook = async (toolId) => {
    try {
      setBusyToolId(toolId)
      await api.post(`/outlook/disconnect/${toolId}`)
      await loadTools()
      toast.success('Outlook déconnecté')
    } catch (error) {
      toast.error('Déconnexion Outlook échouée')
    } finally {
      setBusyToolId(null)
    }
  }

  const saveGoogleConfig = async (e) => {
    e.preventDefault();
    if (!configTool?.id || !configTool.draftConfig) return;
    try {
      setBusyToolId(configTool.id);
      const { clientId, clientSecret } = configTool.draftConfig;
      if (!clientId || !clientSecret) {
        toast.error('Client ID et Secret requis');
        return;
      }
      await api.patch(`/tools/${configTool.id}`, {
        config: configTool.draftConfig
      });
      const savedToolId = configTool.id;
      setConfigTool(null);
      toast.success('Configuration sauvegardée, redirection vers Google…');
      await connectGoogleAuth(savedToolId);
    } catch (err) {
      toast.error('Erreur configuration Google Calendar');
    } finally {
      setBusyToolId(null);
    }
  };

  const connectGoogleAuth = async (toolId) => {
    try {
      setBusyToolId(toolId)
      const res = await api.post('/google-calendar/connect-url', { toolId })
      if (res.data?.url) {
        window.location.href = res.data.url
        return
      }
      toast.error('Impossible d’obtenir l’URL de connexion Google')
    } catch (error) {
      const message = error.response?.data?.error || 'Connexion Google Calendar échouée'
      toast.error(message)
    } finally {
      setBusyToolId(null)
    }
  }

  const disconnectGoogle = async (toolId) => {
    try {
      setBusyToolId(toolId)
      await api.post(`/google-calendar/disconnect/${toolId}`)
      await loadTools()
      toast.success('Google Calendar déconnecté')
    } catch (error) {
      toast.error('Déconnexion Google Calendar échouée')
    } finally {
      setBusyToolId(null)
    }
  }

  const startEditLabel = (tool) => {
    setEditingToolId(tool.id)
    setEditingLabel(tool.label || TOOL_LABELS[tool.type] || tool.type)
  }

  const saveToolLabel = async (toolId) => {
    const trimmed = (editingLabel || '').trim()
    if (trimmed === '') {
      setEditingToolId(null)
      return
    }
    try {
      await api.patch(`/tools/${toolId}`, { label: trimmed })
      await loadTools()
      toast.success('Nom mis à jour')
    } catch (error) {
      toast.error('Impossible de modifier le nom')
    } finally {
      setEditingToolId(null)
    }
  }

  const createTool = async (type) => {
    try {
      setLoading(true)
      const res = await api.post('/tools', { type, label: TOOL_LABELS[type] })
      const tool = res.data.tool
      if (type === 'whatsapp') {
        await connectWhatsApp(tool.id)
      } else if (type === 'outlook' || type === 'google_calendar') {
        await loadTools()
        const newTool = (await api.get(`/tools/${tool.id}`)).data.tool
        setConfigTool({ ...newTool, draftConfig: { clientId: newTool.config?.clientId || '', clientSecret: newTool.config?.clientSecret || '' } })
        toast.success(`Outil créé, renseignez vos identifiants ${type === 'outlook' ? 'Microsoft' : 'Google'}.`)
        return
      }
      await loadTools()
      toast.success('Outil créé')
    } catch (error) {
      const message = error.response?.data?.error || 'Création de l’outil échouée'
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  const deleteTool = async (toolId) => {
    try {
      setBusyToolId(toolId)
      await api.delete(`/tools/${toolId}`)
      await loadTools()
      toast.success('Outil supprimé')
    } catch (error) {
      toast.error('Suppression de l’outil échouée')
    } finally {
      setBusyToolId(null)
    }
  }

  const getRemaining = (type) => {
    const limit = limits?.[`${type}_accounts`]
    const used = usage?.[type] || 0
    if (limit === -1) return { text: 'Illimité', canAdd: true }
    if (limit == null) return { text: '0', canAdd: false }
    const remaining = Math.max(0, limit - used)
    return { text: String(remaining), canAdd: remaining > 0 }
  }

  const whatsappRemaining = getRemaining('whatsapp')
  const outlookRemaining = getRemaining('outlook')
  const googleRemaining = getRemaining('google_calendar')

  if (loading && tools.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <div className="w-16 h-16 border-4 border-space-700 rounded-full border-t-gold-400 animate-spin" />
        <p className="mt-4 text-gray-400">Chargement des outils...</p>
      </div>
    )
  }

  return (
    <div className="max-w-full mx-auto w-full space-y-6 px-4 sm:px-6 lg:px-8 min-w-0">
      {/* Hero Header - theme-aware, motif adapté au thème */}
      <div className={`relative rounded-2xl sm:rounded-3xl border p-4 sm:p-8 mb-4 sm:mb-8 ${
        isDark ? 'bg-gradient-to-br from-space-800 via-space-900 to-space-800 border-space-700/50' : 'bg-gradient-to-br from-gray-50 via-white to-gray-50 border-gray-200'
      }`}>
        <div
          className="absolute inset-0 opacity-50"
          style={{ backgroundImage: `url(${isDark ? "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wMiI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMiIvPjwvZz48L2c+PC9zdmc+" : "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgdmlld0JveD0iMCAwIDYwIDYwIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiM2NDc0OGIiIGZpbGwtb3BhY2l0eT0iMC4wNiI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMiIvPjwvZz48L2c+PC9zdmc+"})` }}
          aria-hidden
        />
        <div className="relative flex flex-col gap-4 sm:gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-3 mb-2 min-w-0">
              <div className="p-2 bg-gold-400/10 rounded-xl flex-shrink-0">
                <Wrench className="w-6 h-6 text-gold-400" />
              </div>
              <h1 className={`text-2xl sm:text-3xl font-display font-bold break-words ${isDark ? 'text-white' : 'text-gray-900'}`}>Outils</h1>
              {quotas?.plan && (
                <span className={`px-3 py-1 rounded-full text-xs sm:text-sm font-medium flex-shrink-0 ${quotas.plan.name === 'free' ? 'bg-gray-500/20 text-gray-400' : 'bg-gold-400/20 text-gold-400'}`}>
                  <Crown className="w-3.5 h-3.5 inline mr-1" />
                  {quotas.plan.displayName}
                </span>
              )}
            </div>
            <p className={`text-base sm:text-lg break-words ${isDark ? 'text-gray-400' : 'text-gray-700'}`}>Connectez vos canaux et assignez-les à vos agents</p>
          </div>
          <button
            onClick={loadTools}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all duration-200 min-h-[44px] flex-shrink-0 ${
              isDark ? 'bg-space-700/50 hover:bg-space-700 text-gray-300 hover:text-white' : 'bg-gray-200 hover:bg-gray-300 text-gray-700 hover:text-gray-900'
            }`}
          >
            <RefreshCw className="w-4 h-4" />
            <span className="hidden sm:inline">Actualiser</span>
          </button>
        </div>
      </div>

      {/* Load error + Retry */}
      {loadError && (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-6 text-center mb-6">
          <p className="text-red-300 mb-3">{loadError}</p>
          <button
            type="button"
            onClick={() => loadTools()}
            className="inline-flex items-center gap-2 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-200 rounded-xl font-medium transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Réessayer
          </button>
        </div>
      )}

      {/* Add tool cards */}
      {!loadError && (
        <>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 mb-6 sm:mb-8">
          <div className={`relative overflow-hidden rounded-xl sm:rounded-2xl border p-5 sm:p-6 ${isDark ? 'bg-space-800/50 border-space-700/50' : 'bg-white border-gray-200'}`}>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 bg-emerald-500/10 rounded-xl">
                <MessageSquare className="w-6 h-6 text-emerald-400" />
              </div>
              <div className="min-w-0">
                <h2 className={`text-lg font-display font-semibold ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>WhatsApp</h2>
                <p className={`text-sm ${isDark ? 'text-gray-500' : 'text-gray-600'}`}>Restant: {whatsappRemaining.text}</p>
              </div>
            </div>
            {whatsappRemaining.canAdd ? (
              <button
                onClick={() => createTool('whatsapp')}
                disabled={loading}
                data-tour="create-tool-whatsapp"
                className="btn-primary w-full flex items-center justify-center gap-2 min-h-[48px]"
              >
                <Plus className="w-5 h-5" />
                Connecter WhatsApp
              </button>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-amber-400">Aucun compte WhatsApp inclus dans votre plan.</p>
                <Link
                  to="/dashboard/settings?tab=subscription"
                  className="btn-primary w-full block text-center min-h-[48px]"
                >
                  Améliorer mon plan
                </Link>
              </div>
            )}
          </div>

          <div className={`relative overflow-hidden rounded-xl sm:rounded-2xl border p-5 sm:p-6 ${isDark ? 'bg-space-800/50 border-space-700/50' : 'bg-white border-gray-200'}`}>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 bg-blue-500/10 rounded-xl">
                <Mail className="w-6 h-6 text-blue-400" />
              </div>
              <div className="min-w-0">
                <h2 className={`text-lg font-display font-semibold ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>Outlook</h2>
                <p className={`text-sm ${isDark ? 'text-gray-500' : 'text-gray-600'}`}>Restant: {outlookRemaining.text}</p>
              </div>
            </div>
            {outlookRemaining.canAdd ? (
              <button
                onClick={() => createTool('outlook')}
                disabled={loading}
                className="btn-secondary w-full flex items-center justify-center gap-2 min-h-[48px]"
              >
                <Plus className="w-5 h-5" />
                Connecter Outlook
              </button>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-amber-400">Aucun compte Outlook inclus dans votre plan.</p>
                <Link
                  to="/dashboard/settings?tab=subscription"
                  className="btn-primary w-full block text-center min-h-[48px]"
                >
                  Améliorer mon plan
                </Link>
              </div>
            )}
          </div>

          <div className={`relative overflow-hidden rounded-xl sm:rounded-2xl border p-5 sm:p-6 ${isDark ? 'bg-space-800/50 border-space-700/50' : 'bg-white border-gray-200'}`}>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 bg-rose-500/10 rounded-xl">
                <Calendar className="w-6 h-6 text-rose-400" />
              </div>
              <div className="min-w-0">
                <h2 className={`text-lg font-display font-semibold ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>Google Calendar</h2>
                <p className={`text-sm ${isDark ? 'text-gray-500' : 'text-gray-600'}`}>Restant: {googleRemaining.text}</p>
              </div>
            </div>
            {googleRemaining.canAdd ? (
              <button
                onClick={() => createTool('google_calendar')}
                disabled={loading}
                className="btn-secondary w-full flex items-center justify-center gap-2 min-h-[48px] border-rose-500/30 hover:border-rose-500/50"
              >
                <Plus className="w-5 h-5" />
                Connecter Calendar
              </button>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-amber-400">Aucun compte Google inclus dans votre plan.</p>
                <Link
                  to="/dashboard/settings?tab=subscription"
                  className="btn-primary w-full block text-center min-h-[48px]"
                >
                  Améliorer mon plan
                </Link>
              </div>
            )}
          </div>

        </div>

      {/* List of tools */}
      <div className="min-w-0">
        <h2 className={`text-lg sm:text-xl font-display font-semibold mb-4 sm:mb-6 ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>Mes outils connectés</h2>
        {loading ? (
          <div className="text-gray-400">Chargement...</div>
        ) : tools.length === 0 ? (
          <div className={`rounded-3xl border p-12 text-center ${isDark ? 'bg-space-800/50 border-space-700/50' : 'bg-gray-50 border-gray-200'}`}>
            <div className={`w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-6 ${isDark ? 'bg-space-700/50' : 'bg-white shadow-sm'}`}>
              <Wrench className="w-10 h-10 text-gray-500" />
            </div>
            <h3 className={`text-lg font-semibold mb-2 ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>Aucun outil connecté</h3>
            <p className={`max-w-md mx-auto mb-6 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              Connectez WhatsApp ou Outlook pour que vos agents envoient et reçoivent des messages.
            </p>
            <div className="flex flex-wrap gap-3 justify-center">
              {whatsappRemaining.canAdd && (
                <button
                  type="button"
                  onClick={() => createTool('whatsapp')}
                  disabled={loading}
                  className="btn-primary"
                >
                  <MessageSquare className="w-5 h-5 mr-2 inline" />
                  Ajouter WhatsApp
                </button>
              )}
              {outlookRemaining.canAdd && (
                <button
                  type="button"
                  onClick={() => createTool('outlook')}
                  disabled={loading}
                  className="btn-secondary"
                >
                  <Mail className="w-5 h-5 mr-2 inline" />
                  Ajouter Outlook
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {tools.map((tool, index) => (
              <div 
                key={tool.id} 
                className={`group block p-3 rounded-xl border transition-all duration-300 animate-fadeIn ${
                  isDark ? 'bg-space-800/50 hover:bg-space-800 border-space-700/50' : 'bg-white border-gray-200 hover:border-gray-300'
                }`}
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    {tool.type === 'whatsapp' ? (
                      <div className="p-2 bg-emerald-500/10 rounded-lg flex-shrink-0">
                        <MessageSquare className="w-5 h-5 text-emerald-400" />
                      </div>
                    ) : tool.type === 'outlook' ? (
                      <div className="p-2 bg-blue-500/10 rounded-lg flex-shrink-0">
                        <Mail className="w-5 h-5 text-blue-400" />
                      </div>
                    ) : (
                      <div className="p-2 bg-rose-500/10 rounded-lg flex-shrink-0">
                        <Calendar className="w-5 h-5 text-rose-400" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      {editingToolId === tool.id ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={editingLabel}
                            onChange={(e) => setEditingLabel(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') saveToolLabel(tool.id)
                              if (e.key === 'Escape') setEditingToolId(null)
                            }}
                            className="input-dark py-1 px-2 text-sm w-full max-w-[180px]"
                            placeholder="Nom de l’outil"
                            autoFocus
                          />
                          <button
                            type="button"
                            onClick={() => saveToolLabel(tool.id)}
                            className="p-1.5 text-emerald-400 hover:bg-emerald-500/20 rounded-lg transition-colors"
                            title="Enregistrer"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold text-gray-100">{tool.label || TOOL_LABELS[tool.type] || tool.type}</p>
                          <button
                            type="button"
                            onClick={() => startEditLabel(tool)}
                            className="p-1 text-gray-400 hover:text-gray-200 hover:bg-space-700 rounded transition-colors"
                            title="Modifier le nom"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                      {tool.type === 'whatsapp' && tool.status === 'connected' && tool.meta?.phone && (
                        <p className="text-sm text-gray-400 mt-0.5">{tool.meta.phone}</p>
                      )}
                      {tool.type === 'outlook' && tool.status === 'connected' && tool.meta?.email && (
                        <p className="text-sm text-gray-400 mt-0.5">{tool.meta.email}</p>
                      )}
                      <span className={`inline-block text-xs px-2 py-0.5 rounded-full mt-1 ${
                        tool.status === 'connected' ? 'bg-emerald-500/20 text-emerald-400' :
                        tool.status === 'reconnecting' ? 'bg-amber-500/20 text-amber-400' : 'bg-space-700 text-gray-400'
                      }`}>
                        {tool.status === 'reconnecting' ? 'Reconnexion…' : tool.status === 'connected' ? 'Connecté' : tool.status}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => deleteTool(tool.id)}
                    className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors flex-shrink-0"
                    disabled={busyToolId === tool.id}
                    title="Supprimer l’outil"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {tool.type === 'whatsapp' && (
                  <div className="mt-4 pt-4 border-t border-space-700/50">
                    {tool.status === 'connected' ? (
                      <button
                        onClick={() => disconnectWhatsApp(tool.id)}
                        className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-space-700 text-gray-200 hover:bg-space-600 transition-colors"
                        disabled={busyToolId === tool.id}
                      >
                        <PowerOff className="w-4 h-4" />
                        Déconnecter
                      </button>
                    ) : (
                      <>
                        <div className="flex items-center gap-2 flex-wrap">
                          <button
                            onClick={() => connectWhatsApp(tool.id)}
                            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl font-medium bg-emerald-600 hover:bg-emerald-500 text-white transition-colors"
                            disabled={busyToolId === tool.id}
                          >
                            {connectingToolId === tool.id ? (
                              <>
                                <RefreshCw className="w-4 h-4 animate-spin" />
                                Connexion en cours…
                              </>
                            ) : (
                              <>
                                <Power className="w-4 h-4" />
                                Connecter (afficher le QR)
                              </>
                            )}
                          </button>
                        </div>
                        {connectingToolId === tool.id && (
                          <p className="mt-2 text-sm text-gray-400">Ouverture du QR en premier plan…</p>
                        )}
                      </>
                    )}
                  </div>
                )}

                {tool.type === 'outlook' && (
                  <div className="mt-4 pt-4 border-t border-space-700/50">
                    {tool.status === 'connected' ? (
                      <>
                        {tool.meta?.email && (
                          <p className="text-sm text-gray-400 mb-3">{tool.meta.email}</p>
                        )}
                        <div className="flex flex-wrap gap-2">
                          <button
                            onClick={() => disconnectOutlook(tool.id)}
                            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-space-700 text-gray-200 hover:bg-space-600 transition-colors"
                            disabled={busyToolId === tool.id}
                          >
                            <PowerOff className="w-4 h-4" />
                            Déconnecter
                          </button>
                          <button
                            onClick={() => setConfigTool({ ...tool, draftConfig: { clientId: tool.config?.clientId || '', clientSecret: tool.config?.clientSecret || '' } })}
                            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-space-700 text-gray-200 hover:bg-space-600 transition-colors"
                            disabled={busyToolId === tool.id}
                          >
                            <Wrench className="w-4 h-4" />
                            Modifier
                          </button>
                        </div>
                      </>
                    ) : (
                      <button
                        onClick={() => setConfigTool({ ...tool, draftConfig: { clientId: tool.config?.clientId || '', clientSecret: tool.config?.clientSecret || '' } })}
                        className="inline-flex items-center gap-2 px-3 py-2 rounded-xl font-medium bg-blue-600 hover:bg-blue-500 text-white transition-colors"
                        disabled={busyToolId === tool.id}
                      >
                        <Wrench className="w-4 h-4" />
                        Configurer Outlook
                      </button>
                    )}
                  </div>
                )}

                {tool.type === 'google_calendar' && (
                  <div className="mt-4 pt-4 border-t border-space-700/50">
                    {tool.status === 'connected' ? (
                      <>
                        {tool.meta?.email && (
                          <p className="text-sm text-gray-400 mb-3">{tool.meta.email}</p>
                        )}
                        <div className="flex flex-wrap gap-2">
                          <button
                            onClick={() => disconnectGoogle(tool.id)}
                            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-space-700 text-gray-200 hover:bg-space-600 transition-colors"
                            disabled={busyToolId === tool.id}
                          >
                            <PowerOff className="w-4 h-4" />
                            Déconnecter
                          </button>
                          <button
                            onClick={() => setConfigTool({ ...tool, draftConfig: { clientId: tool.config?.clientId || '', clientSecret: tool.config?.clientSecret || '' } })}
                            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-space-700 text-gray-200 hover:bg-space-600 transition-colors"
                            disabled={busyToolId === tool.id}
                          >
                            <Wrench className="w-4 h-4" />
                            Modifier
                          </button>
                        </div>
                      </>
                    ) : (
                      <button
                        onClick={() => setConfigTool({ ...tool, draftConfig: { clientId: tool.config?.clientId || '', clientSecret: tool.config?.clientSecret || '' } })}
                        className="inline-flex items-center gap-2 px-3 py-2 rounded-xl font-medium bg-rose-600 hover:bg-rose-500 text-white transition-colors"
                        disabled={busyToolId === tool.id}
                      >
                        <Wrench className="w-4 h-4" />
                        Configurer Google
                      </button>
                    )}
                  </div>
                )}

              </div>
            ))}
          </div>
        )}
      </div>
    </>
  )}

      {/* Overlay QR code en premier plan */}
      {connectingToolId && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-sm"
          onClick={(e) => e.target === e.currentTarget && cancelConnect(connectingToolId)}
        >
          <div
            className="relative z-10 w-full max-w-md rounded-t-2xl sm:rounded-2xl bg-space-800 border border-space-600 shadow-2xl p-6 sm:p-8 flex flex-col items-center max-h-[90vh] sm:max-h-[85vh] overflow-y-auto animate-fadeIn"
            onClick={(e) => e.stopPropagation()}
            data-tour="whatsapp-connect-section"
          >
            <button
              type="button"
              onClick={() => cancelConnect(connectingToolId)}
              className="absolute top-4 right-4 p-2 rounded-xl text-gray-400 hover:text-white hover:bg-space-700 transition-colors"
              aria-label="Fermer"
            >
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-xl font-display font-semibold text-gray-100 mb-2">Connexion WhatsApp</h3>
            {qrByTool[connectingToolId] ? (
              <>
                <div className="rounded-2xl bg-white p-4 border-2 border-space-600 shadow-lg my-4">
                  <img
                    src={qrByTool[connectingToolId]}
                    alt="QR code WhatsApp"
                    className="w-72 h-72 sm:w-80 sm:h-80 block"
                  />
                </div>
                <p className="text-sm text-gray-300 text-center mb-6 max-w-sm">
                  Scannez ce QR code avec WhatsApp (Paramètres → Appareils connectés). La connexion se fera automatiquement.
                </p>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center py-12">
                <RefreshCw className="w-12 h-12 text-gray-500 animate-spin mb-4" />
                <p className="text-gray-400">Génération du QR code…</p>
              </div>
            )}
            <button
              type="button"
              onClick={() => cancelConnect(connectingToolId)}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-medium bg-space-700 text-gray-200 hover:bg-space-600 transition-colors"
            >
              <X className="w-4 h-4" />
              Annuler
            </button>
          </div>
        </div>
      )}


      {/* Configuration Modal (Outlook / Google) */}
      {configTool && (configTool.type === 'outlook' || configTool.type === 'google_calendar') && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
          onClick={(e) => e.target === e.currentTarget && setConfigTool(null)}
        >
          <div
            className="relative z-10 w-full max-w-md rounded-2xl bg-space-800 border border-space-600 shadow-2xl p-6 sm:p-8 flex flex-col max-h-[90vh] overflow-y-auto animate-fadeIn"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setConfigTool(null)}
              className="absolute top-4 right-4 p-2 rounded-xl text-gray-400 hover:text-white hover:bg-space-700 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-xl font-display font-semibold text-gray-100 mb-4 flex items-center gap-2">
              {configTool.type === 'outlook' ? (
                <Mail className="w-5 h-5 text-blue-500" />
              ) : (
                <Calendar className="w-5 h-5 text-rose-500" />
              )}
              {configTool.type === 'outlook' ? 'Configuration Outlook' : 'Configuration Google Calendar'}
            </h3>
            
            <form onSubmit={configTool.type === 'outlook' ? saveOutlookConfig : saveGoogleConfig} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  {configTool.type === 'outlook' ? 'Microsoft App Client ID' : 'Google Client ID'}
                </label>
                <input
                  type="text"
                  required
                  value={configTool.draftConfig?.clientId || ''}
                  onChange={e => setConfigTool({ ...configTool, draftConfig: { ...configTool.draftConfig, clientId: e.target.value } })}
                  className="input-dark w-full font-mono text-sm"
                  placeholder={configTool.type === 'outlook' ? 'ex: 8bxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx' : 'ex: xxxx.apps.googleusercontent.com'}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  {configTool.type === 'outlook' ? 'Client Secret' : 'Client Secret'}
                </label>
                <input
                  type="password"
                  required
                  value={configTool.draftConfig?.clientSecret || ''}
                  onChange={e => setConfigTool({ ...configTool, draftConfig: { ...configTool.draftConfig, clientSecret: e.target.value } })}
                  className="input-dark w-full font-mono text-sm"
                  placeholder="Secret de l'application..."
                />
                <p className="mt-2 text-xs text-gray-400">
                  {configTool.type === 'outlook' ? (
                    <>Besoin d'aide ? Créez une application dans Azure Active Directory, ajoutez l'URI de redirection <code>HTTPS://.../api/outlook/callback</code>, et générez un secret.</>
                  ) : (
                    <>Besoin d'aide ? Créez un projet dans Google Cloud Console, activez l'API Calendar, ajoutez l'URI de redirection <code>HTTPS://.../api/google-calendar/callback</code> dans vos identifiants OAuth 2.0.</>
                  )}
                </p>
              </div>

              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setConfigTool(null)}
                  className="flex-1 px-4 py-2.5 rounded-xl font-medium bg-space-700 text-gray-200 hover:bg-space-600 transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={busyToolId === configTool.id}
                  className={`flex-1 px-4 py-2.5 rounded-xl font-medium text-white transition-colors ${
                    configTool.type === 'outlook' ? 'bg-blue-600 hover:bg-blue-500' : 'bg-rose-600 hover:bg-rose-500'
                  }`}
                >
                  Suivant (Connexion)
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
