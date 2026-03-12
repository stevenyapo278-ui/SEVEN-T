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
      // Filter for tools that can be assigned (usually WhatsApp tools)
      // and sort to put connected ones first
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

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="fixed inset-0 bg-space-950/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 card w-full max-w-lg max-h-[90vh] sm:max-h-[85vh] flex flex-col rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden animate-fadeIn">
        <div className="flex-shrink-0 p-5 sm:p-6 border-b border-space-700 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-display font-semibold text-gray-100">{t('agents.detail.tool.assign', 'Assigner un outil')}</h2>
            <p className="text-sm text-gray-400 mt-1">Choisissez un outil WhatsApp pour cet agent</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-space-800 rounded-full transition-colors text-gray-500">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3">
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-20 bg-space-800/50 rounded-2xl animate-pulse" />
              ))}
            </div>
          ) : tools.length === 0 ? (
            <div className="text-center py-12">
              <Wrench className="w-12 h-12 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400">Aucun outil disponible</p>
              <Link to="/dashboard/tools" className="text-gold-400 hover:text-gold-300 text-sm mt-4 inline-flex items-center gap-2">
                Créer un outil WhatsApp →
              </Link>
            </div>
          ) : (
            <div className="grid gap-3">
              {/* Option to remove tool */}
              <button
                onClick={() => handleSelectTool(null)}
                className={`flex items-center gap-4 p-4 rounded-2xl border-2 transition-all text-left group ${
                  !currentToolId 
                    ? 'border-gold-400 bg-gold-400/5' 
                    : 'border-space-700 hover:border-space-600 bg-space-800/50'
                }`}
              >
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${!currentToolId ? 'bg-gold-400/20 text-gold-400' : 'bg-space-700 text-gray-500'}`}>
                  <Ban className="w-6 h-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-100 group-hover:text-white transition-colors">Aucun outil</p>
                  <p className="text-xs text-gray-500">Désactiver les réponses de cet agent</p>
                </div>
                {!currentToolId && <Check className="w-5 h-5 text-gold-400 flex-shrink-0" />}
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
                    className={`flex items-center gap-4 p-4 rounded-2xl border-2 transition-all text-left group ${
                      isSelected 
                        ? 'border-gold-400 bg-gold-400/5' 
                        : 'border-space-700 hover:border-space-600 bg-space-800/50'
                    } ${saving ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
                      isConnected ? 'bg-emerald-500/20 text-emerald-400' : 'bg-space-700 text-gray-500'
                    }`}>
                      <Phone className="w-6 h-6" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-gray-100 group-hover:text-white transition-colors truncate">
                          {tool.label || tool.type}
                        </p>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          isConnected ? 'bg-emerald-500/20 text-emerald-400' : 'bg-gray-500/20 text-gray-400'
                        }`}>
                          {isConnected ? 'Connecté' : 'Déconnecté'}
                        </span>
                      </div>
                      {phone && <p className="text-xs text-gray-500 mt-0.5">{phone}</p>}
                    </div>
                    {isSelected && <Check className="w-5 h-5 text-gold-400 flex-shrink-0" />}
                  </button>
                )
              })}
            </div>
          )}
        </div>

        <div className="flex-shrink-0 p-5 sm:p-6 border-t border-space-700 bg-space-900/50">
          <Link
            to="/dashboard/tools"
            className="flex items-center justify-center gap-2 w-full py-3 px-4 rounded-xl bg-space-800 hover:bg-space-700 text-gray-200 font-medium transition-all border border-space-700"
          >
            <Settings className="w-4 h-4" />
            {t('common.tabs.tools', 'Gérer les outils')}
          </Link>
        </div>
      </div>
    </div>
  )
}
