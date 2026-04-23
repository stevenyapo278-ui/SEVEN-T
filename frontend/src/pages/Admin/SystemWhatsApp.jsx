import { useState, useEffect, useRef } from 'react'
import api from '../../services/api'
import { 
  MessageSquare, 
  Smartphone, 
  QrCode, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  ShieldCheck,
  Zap,
  Power,
  Trash2
} from 'lucide-react'
import toast from 'react-hot-toast'

export default function SystemWhatsApp() {
  const [loading, setLoading] = useState(true)
  const [settings, setSettings] = useState({
    system_whatsapp_tool_id: '',
    system_whatsapp_number: ''
  })
  const [whatsappInfo, setWhatsappInfo] = useState(null)
  const [qrCode, setQrCode] = useState(null)
  const [connecting, setConnecting] = useState(false)
  const qrRef = useRef(null)

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    setLoading(true)
    try {
      const res = await api.get('/admin/ai/settings')
      const s = res.data?.settings || {}
      setSettings({
        system_whatsapp_tool_id: s.system_whatsapp_tool_id || '',
        system_whatsapp_number: s.system_whatsapp_number || ''
      })
      
      if (s.system_whatsapp_tool_id) {
        loadWhatsAppStatus(s.system_whatsapp_tool_id)
      }
    } catch (error) {
      toast.error('Erreur lors du chargement des paramètres')
    } finally {
      setLoading(false)
    }
  }

  const loadWhatsAppStatus = async (toolId) => {
    try {
      const res = await api.get(`/whatsapp/status/${toolId}`)
      setWhatsappInfo(res.data)
    } catch (error) {
      console.error('Error loading WhatsApp status:', error)
    }
  }

  const handleCreateSystemTool = async () => {
    setConnecting(true)
    try {
      // Logic to create a special "System" tool or just use a generated ID
      const toolId = `system_${Math.random().toString(36).substring(7)}`
      
      // Save settings
      await api.put('/admin/ai/settings', { system_whatsapp_tool_id: toolId })
      setSettings(prev => ({ ...prev, system_whatsapp_tool_id: toolId }))
      
      // Start connection
      startConnection(toolId)
    } catch (error) {
      toast.error('Erreur lors de la création du tool système')
    } finally {
      setConnecting(false)
    }
  }

  const startConnection = async (toolId) => {
    setConnecting(true)
    setQrCode(null)
    try {
      const res = await api.post(`/whatsapp/connect/${toolId}`)
      if (res.data?.qr) {
        setQrCode(res.data.qr)
        // Poll for connection
        pollConnection(toolId)
      }
    } catch (error) {
      toast.error('Erreur lors de l\'initialisation de la connexion')
    } finally {
      setConnecting(false)
    }
  }

  const pollConnection = (toolId) => {
    const interval = setInterval(async () => {
      try {
        const res = await api.get(`/whatsapp/status/${toolId}`)
        if (res.data?.connected) {
          clearInterval(interval)
          setQrCode(null)
          setWhatsappInfo(res.data)
          setSettings(prev => ({ ...prev, system_whatsapp_number: res.data.number || prev.system_whatsapp_number }))
          // Save number automatically
          await api.put('/admin/ai/settings', { system_whatsapp_number: res.data.number || '' })
          toast.success('WhatsApp système connecté !')
        }
      } catch (e) {
        clearInterval(interval)
      }
    }, 5000)
    
    // Auto clear after 2 minutes
    setTimeout(() => clearInterval(interval), 120000)
  }

  const handleDisconnect = async () => {
    if (!settings.system_whatsapp_tool_id) return
    try {
        await api.post(`/whatsapp/disconnect/${settings.system_whatsapp_tool_id}`)
        setWhatsappInfo(null)
        toast.success('Déconnecté')
    } catch (error) {
        toast.error('Erreur lors de la déconnexion')
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 opacity-50">
        <Loader2 className="w-10 h-10 animate-spin text-gold-500 mb-4" />
        <p className="text-gray-400 font-medium">Chargement de la configuration WhatsApp système...</p>
      </div>
    )
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="bg-space-900/50 border border-space-700/50 rounded-3xl p-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-5">
            <Zap className="w-32 h-32 text-gold-500" />
        </div>
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center gap-8">
          <div className="flex-1 space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-gold-500/10 rounded-2xl">
                <ShieldCheck className="w-8 h-8 text-gold-400" />
              </div>
              <div>
                <h2 className="text-2xl font-display font-bold text-gray-100">WhatsApp Système</h2>
                <p className="text-gray-400 text-sm">Configuration du numéro utilisé pour les relances de paiement et notifications SaaS</p>
              </div>
            </div>

            <div className="flex items-center gap-4 py-2">
              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold border ${
                whatsappInfo?.connected 
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                  : 'bg-red-500/10 text-red-400 border-red-500/20'
              }`}>
                <div className={`w-2 h-2 rounded-full ${whatsappInfo?.connected ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
                {whatsappInfo?.connected ? 'CONNECTÉ' : 'DÉCONNECTÉ'}
              </div>
              {settings.system_whatsapp_number && (
                <div className="text-gray-300 font-mono text-sm">
                  {settings.system_whatsapp_number}
                </div>
              )}
            </div>

            <div className="bg-blue-500/5 border border-blue-500/20 rounded-2xl p-4 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-blue-300 leading-relaxed">
                    Ce numéro sera utilisé exclusivement pour les communications système.
                    <strong> L'IA de réponse automatique ignorera systématiquement ce numéro</strong> pour éviter les boucles infinies.
                </p>
            </div>
          </div>

          <div className="flex flex-col items-center gap-4 min-w-[200px]">
            {qrCode ? (
              <div className="bg-white p-4 rounded-3xl shadow-2xl relative group">
                <img src={qrCode} alt="Scanner pour connecter" className="w-48 h-48" />
                <div className="absolute inset-0 bg-white/90 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-3xl">
                    <QrCode className="w-12 h-12 text-space-900 mb-2" />
                    <p className="text-[10px] text-space-900 font-black tracking-widest text-center px-4 uppercase">
                        Scannez avec WhatsApp
                    </p>
                </div>
              </div>
            ) : whatsappInfo?.connected ? (
              <div className="flex flex-col items-center gap-4">
                <div className="w-32 h-32 rounded-3xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
                    <CheckCircle2 className="w-16 h-16 text-emerald-400" />
                </div>
                <button 
                  onClick={handleDisconnect}
                  className="flex items-center gap-2 px-6 py-2 bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20 rounded-xl text-sm font-bold transition-all"
                >
                    <Power className="w-4 h-4" /> Déconnecter
                </button>
              </div>
            ) : (
              <button 
                onClick={handleCreateSystemTool}
                disabled={connecting}
                className="w-full flex items-center justify-center gap-3 px-8 py-4 bg-gold-500 hover:bg-gold-400 text-space-900 rounded-2xl font-black text-sm uppercase tracking-widest transition-all shadow-xl shadow-gold-500/20 disabled:opacity-50"
              >
                {connecting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Smartphone className="w-5 h-5" />}
                Connecter WhatsApp
              </button>
            )}
            {qrCode && (
                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest text-center animate-pulse">
                    En attente du scan...
                </p>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="card p-6 border-space-700/50 bg-space-900/30">
          <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
            <MessageSquare className="w-4 h-4" /> Message de relance type
          </h3>
          <div className="bg-space-800/50 border border-space-700 rounded-2xl p-4 text-sm text-gray-300 italic">
            "Bonjour {`{{nom}}`}, le paiement de votre abonnement SEVEN T a échoué. Vous disposez de 3 jours de période de grâce avant la suspension de votre service."
          </div>
          <p className="text-[10px] text-gray-500 mt-4 leading-relaxed">
            Ce message est envoyé automatiquement par le CRON système lorsqu'une facture arrive en période de grâce ou à expiration.
          </p>
        </div>

        <div className="card p-6 border-space-700/50 bg-space-900/30">
          <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
            <RefreshCw className="w-4 h-4" /> Tâches planifiées
          </h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
                <span className="text-xs text-gray-400">Vérification des abonnements</span>
                <span className="text-[10px] font-bold px-2 py-0.5 bg-gold-500/10 text-gold-400 rounded-full border border-gold-500/20 uppercase">Quotidien (00:00)</span>
            </div>
            <div className="flex items-center justify-between">
                <span className="text-xs text-gray-400">Période de grâce</span>
                <span className="text-[10px] font-bold text-gray-300 tabular-nums">3 JOURS</span>
            </div>
            <div className="flex items-center justify-between">
                <span className="text-xs text-gray-400">Statut après expiration</span>
                <span className="text-[10px] font-bold px-2 py-0.5 bg-red-500/10 text-red-400 rounded-full border border-red-500/20 uppercase">free_expired</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
