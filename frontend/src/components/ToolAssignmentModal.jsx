import { createPortal } from 'react-dom'
import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { 
  X, 
  Wrench, 
  Settings, 
  Phone, 
  Check, 
  Ban 
} from 'lucide-react'
import api from '../services/api'
import toast from 'react-hot-toast'
import { useTranslation } from 'react-i18next'
import { useLockBodyScroll } from '../hooks/useLockBodyScroll'

export default function ToolAssignmentModal({ agentId, currentToolId, onClose, onAssigned }) {
  const { t } = useTranslation()
  useLockBodyScroll(true)
  const [tools, setTools] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    loadTools()
  }, [])

  const loadTools = async () => {
    try {
      const response = await api.get('/tools')
      const toolsList = (response.data?.tools || []).map(tool => ({
        ...tool,
        meta: (typeof tool.meta === 'string' && tool.meta) ? JSON.parse(tool.meta) : (tool.meta || {})
      })).sort((a, b) => {
        if (a.status === 'connected' && b.status !== 'connected') return -1
        if (a.status !== 'connected' && b.status === 'connected') return 1
        return 0
      })
      setTools(toolsList)
    } catch (error) {
      toast.error('Erreur lors du chargement des outils')
    } finally {
      setLoading(false)
    }
  }

  const handleSelectTool = async (toolId) => {
    if (saving) return
    setSaving(true)
    try {
      await api.put(`/agents/${agentId}`, { tool_id: toolId })
      toast.success(t('agents.detail.settings.success', 'Paramètres sauvegardés'))
      onAssigned()
    } catch (error) {
      toast.error(t('agents.detail.settings.error', 'Erreur lors de la sauvegarde'))
    } finally {
      setSaving(false)
    }
  }

  return createPortal(
    <div 
      className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-sm"
      onClick={onClose}
      style={{ paddingLeft: 'env(safe-area-inset-left)', paddingRight: 'env(safe-area-inset-right)' }}
    >
      <div 
        className="relative z-10 w-full max-w-lg max-h-[92dvh] sm:max-h-[85vh] flex flex-col bg-[#0B0F1A] border border-white/10 rounded-t-[2.5rem] sm:rounded-3xl shadow-[0_32px_128px_-16px_rgba(0,0,0,0.8)] animate-fadeIn overflow-hidden" 
        role="dialog" 
        aria-modal="true" 
        aria-labelledby="tool-modal-title"
        onClick={e => e.stopPropagation()}
      >
        {/* Mobile Handle */}
        <div className="flex-shrink-0 w-full flex justify-center pt-2 pb-1 sm:hidden">
          <div className="w-12 h-1.5 rounded-full bg-white/10" />
        </div>

        <div className="flex-shrink-0 p-6 sm:p-8" style={{ paddingTop: 'max(1.5rem, env(safe-area-inset-top))' }}>
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 id="tool-modal-title" className="text-2xl font-display font-bold text-gray-100">{t('agents.detail.tool.assign')}</h2>
              <p className="text-sm text-gray-500 mt-1">Choisissez un outil WhatsApp pour cet agent</p>
            </div>
            <button type="button" onClick={onClose} className="p-2 -mr-2 min-w-[44px] min-h-[44px] flex items-center justify-center text-gray-500 hover:text-white transition-colors flex-shrink-0 rounded-xl hover:bg-white/5">
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto min-h-0 p-6 sm:p-8 pt-0 space-y-4 overscroll-contain custom-scrollbar">
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-24 bg-white/5 rounded-2xl animate-pulse" />
              ))}
            </div>
          ) : tools.length === 0 ? (
            <div className="text-center py-12 flex flex-col items-center gap-4">
              <div className="w-20 h-20 rounded-3xl bg-white/5 flex items-center justify-center text-gray-600">
                <Wrench className="w-10 h-10" />
              </div>
              <div>
                <p className="text-gray-100 font-bold">Aucun outil disponible</p>
                <Link to="/dashboard/tools" className="text-gold-400 hover:text-gold-300 text-sm font-bold mt-2 inline-flex items-center gap-2">
                  Créer un outil WhatsApp →
                </Link>
              </div>
            </div>
          ) : (
            <div className="grid gap-3">
              <button
                onClick={() => handleSelectTool(null)}
                className={`flex items-center gap-4 p-5 rounded-2xl border-2 transition-all text-left group min-h-[48px] ${
                  !currentToolId 
                    ? 'border-gold-400 bg-gold-400/5' 
                    : 'border-white/5 hover:border-white/10 bg-white/[0.02]'
                }`}
              >
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 transition-colors ${!currentToolId ? 'bg-gold-400 text-black' : 'bg-white/5 text-gray-500'}`}>
                  <Ban className="w-7 h-7" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-gray-100 group-hover:text-white transition-colors">Aucun outil</p>
                  <p className="text-xs text-gray-500">Désactiver les réponses de cet agent</p>
                </div>
                {!currentToolId && <Check className="w-6 h-6 text-gold-400 flex-shrink-0" />}
              </button>

              {tools.map((tool) => {
                const isSelected = currentToolId === tool.id
                const isConnected = tool.status === 'connected'
                const phone = tool.meta?.phone || tool.meta?.number
                
                return (
                  <button
                    key={tool.id}
                    onClick={() => handleSelectTool(tool.id)}
                    disabled={saving}
                    className={`flex items-center gap-4 p-5 rounded-2xl border-2 transition-all text-left group min-h-[48px] ${
                      isSelected 
                        ? 'border-gold-400 bg-gold-400/5' 
                        : 'border-white/5 hover:border-white/10 bg-white/[0.02]'
                    } ${saving ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 transition-colors ${
                      isConnected ? 'bg-emerald-500 text-black' : 'bg-white/5 text-gray-500'
                    }`}>
                      <Phone className="w-7 h-7" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-gray-100 group-hover:text-white transition-colors truncate">
                          {tool.label || tool.type}
                        </p>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest ${
                          isConnected ? 'bg-emerald-500/20 text-emerald-400' : 'bg-white/5 text-gray-500'
                        }`}>
                          {isConnected ? 'Connecté' : 'Déconnecté'}
                        </span>
                      </div>
                      {phone && <p className="text-[10px] font-mono font-bold text-gray-500 mt-1 uppercase tracking-wider">{phone}</p>}
                    </div>
                    {isSelected && <Check className="w-6 h-6 text-gold-400 flex-shrink-0" />}
                  </button>
                )
              })}
            </div>
          )}
        </div>

        <div className="flex-shrink-0 p-6 sm:p-8 pt-4 border-t border-white/5" style={{ paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))' }}>
          <Link
            to="/dashboard/tools"
            className="flex items-center justify-center gap-3 w-full py-4 px-6 rounded-xl bg-white/5 hover:bg-white/10 text-gray-200 font-bold transition-all border border-white/5 min-h-[48px] touch-target"
          >
            <Settings className="w-5 h-5" />
            {t('common.tabs.tools')}
          </Link>
        </div>
      </div>
    </div>,
    document.body
  )
}
