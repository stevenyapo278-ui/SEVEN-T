import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Search, XCircle, Users, Loader2, Check, Phone, UserPlus, ChevronRight, User } from 'lucide-react'
import api from '../services/api'
import { useTheme } from '../contexts/ThemeContext'
import toast from 'react-hot-toast'

function normalizePhoneForCompare(phone) {
  return String(phone || '').replace(/\D/g, '')
}

export default function ImportedContactsPicker({
  open,
  onClose,
  agentId = '',
  title = 'Contacts importés',
  mode = 'single', // 'single' | 'multi'
  initialSelected = null,
  minMessages = 0,
  onSelect
}) {
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [contacts, setContacts] = useState([])
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState(() => new Map())
  const lastFetchKeyRef = useRef('')
  const debounceRef = useRef(null)

  // Manual entry states
  const [activeTab, setActiveTab] = useState('list') // 'list' | 'manual'
  const [manualPhone, setManualPhone] = useState('')
  const [manualName, setManualName] = useState('')
  const [manualAgentId, setManualAgentId] = useState(agentId || '')
  const [agents, setAgents] = useState([])
  const [fetchingAgents, setFetchingAgents] = useState(false)

  const selectedCount = selected.size
  const initialSelectedKey = useMemo(() => {
    const list = Array.isArray(initialSelected) ? initialSelected : []
    if (list.length === 0) return ''
    return list
      .map((c) => normalizePhoneForCompare(c?.contact_number || c?.phone_number || c?.number))
      .filter(Boolean)
      .sort()
      .join('|')
  }, [initialSelected])

  useEffect(() => {
    if (!open) {
      setSelected(new Map())
      setManualPhone('')
      setManualName('')
      setActiveTab('list')
      return
    }
    const map = new Map()
    ;(initialSelected || []).forEach((c) => {
      const key = normalizePhoneForCompare(c.contact_number || c.phone_number || c.number)
      if (!key) return
      map.set(key, {
        contact_number: c.contact_number || c.phone_number || c.number,
        contact_name: c.contact_name || c.name || null,
        agent_id: c.agent_id || agentId || null,
        agent_name: c.agent_name || null,
        jid: c.jid || null
      })
    })
    setSelected(map)

    // Load agents if in single mode (for manual entry)
    if (mode === 'single' && open) {
      setFetchingAgents(true)
      api.get('/agents')
        .then(res => {
          const activeAgents = (res.data.agents || []).filter(a => a.whatsapp_connected)
          setAgents(activeAgents)
          if (activeAgents.length > 0 && !manualAgentId) {
            setManualAgentId(activeAgents[0].id)
          }
        })
        .finally(() => setFetchingAgents(false))
    }
  }, [open, initialSelectedKey, agentId, mode])

  const fetchContacts = async (qValue) => {
    if (!open) return
    const key = `${agentId || 'all'}|${minMessages || 0}|${qValue || ''}`.trim()
    if (lastFetchKeyRef.current === key && contacts.length > 0) return
    lastFetchKeyRef.current = key
    setLoading(true)
    setError(null)
    try {
      const res = await api.get('/whatsapp/imported-contacts', {
        params: {
          agent_id: agentId || undefined,
          q: qValue || undefined,
          limit: 2000
        }
      })
      let finalContacts = res.data?.contacts || []

      try {
        const fallback = await api.get('/conversations/imported-contacts', {
          params: {
            agent_id: agentId || undefined,
            q: qValue || undefined,
            min_messages: minMessages || undefined,
            limit: 2000
          }
        })
        
        const fallbackContacts = fallback.data?.contacts || []
        const existingKeys = new Set(finalContacts.map(c => normalizePhoneForCompare(c.contact_number)).filter(Boolean))
        
        for (const fc of fallbackContacts) {
          const key = normalizePhoneForCompare(fc.contact_number)
          if (key && !existingKeys.has(key)) {
            finalContacts.push(fc)
            existingKeys.add(key)
          }
        }
      } catch (fallbackErr) {
        console.warn('Fallback contacts fetch failed', fallbackErr)
      }

      setContacts(finalContacts)
    } catch (e) {
      setError(e.response?.data?.error || 'Erreur lors du chargement des contacts')
      setContacts([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!open) return
    fetchContacts('')
  }, [open, agentId, minMessages])

  useEffect(() => {
    if (!open) return
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      fetchContacts(query)
    }, 250)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [query])

  const list = useMemo(() => {
    if (!query.trim()) return contacts
    const q = query.trim().toLowerCase()
    return (contacts || []).filter((c) => {
      const n = String(c.contact_name || '').toLowerCase()
      const p = String(c.contact_number || '').toLowerCase()
      return n.includes(q) || p.includes(q)
    })
  }, [contacts, query])

  const toggle = (c) => {
    const key = normalizePhoneForCompare(c.contact_number)
    if (!key) return
    setSelected((prev) => {
      const next = new Map(prev)
      if (mode === 'single') {
        next.clear()
        next.set(key, c)
        return next
      }
      if (next.has(key)) next.delete(key)
      else next.set(key, c)
      return next
    })
  }

  const toggleAll = () => {
    if (mode === 'single') return
    const allVisibleSelected = list.every(c => {
      const key = normalizePhoneForCompare(c.contact_number)
      return key && selected.has(key)
    })

    setSelected(prev => {
      const next = new Map(prev)
      if (allVisibleSelected) {
        list.forEach(c => {
          const key = normalizePhoneForCompare(c.contact_number)
          if (key) next.delete(key)
        })
      } else {
        list.forEach(c => {
          const key = normalizePhoneForCompare(c.contact_number)
          if (key) next.set(key, c)
        })
      }
      return next
    })
  }

  const confirm = () => {
    if (activeTab === 'manual') {
      if (!manualPhone) return toast.error('Le numéro est requis')
      if (!manualAgentId) return toast.error('Veuillez sélectionner un agent')
      
      const cleanPhone = manualPhone.replace(/\D/g, '')
      if (cleanPhone.length < 8) return toast.error('Numéro invalide')

      const manualContact = {
        agent_id: manualAgentId,
        contact_number: cleanPhone,
        contact_name: manualName || cleanPhone,
        jid: `${cleanPhone}@s.whatsapp.net`
      }
      onSelect?.(manualContact)
      onClose?.()
      return
    }

    const items = Array.from(selected.values()).map((c) => ({
      agent_id: c.agent_id,
      agent_name: c.agent_name,
      contact_number: c.contact_number,
      contact_name: c.contact_name || null,
      jid: c.jid || null
    }))
    if (mode === 'single') {
      onSelect?.(items[0] || null)
    } else {
      onSelect?.(items)
    }
    onClose?.()
  }

  if (!open) return null

  return createPortal(
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center p-4 sm:p-4 bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative z-10 w-full max-w-2xl max-h-[92dvh] sm:max-h-[85vh] flex flex-col bg-[#0B0F1A] border border-white/10 rounded-t-[2.5rem] sm:rounded-3xl shadow-[0_32px_128px_-16px_rgba(0,0,0,0.8)] animate-fadeIn overflow-hidden"
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex-shrink-0 w-full flex justify-center pt-2 pb-1 sm:hidden">
          <div className="w-12 h-1.5 rounded-full bg-white/10" />
        </div>

        <div className="flex-shrink-0 p-6 sm:p-8">
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <h2 className="text-2xl font-display font-bold text-gray-100 truncate flex items-center gap-3">
                <Users className="w-6 h-6 text-blue-400 flex-shrink-0" />
                {title}
              </h2>
              <p className="text-sm text-gray-500 mt-1 truncate">
                {activeTab === 'list' 
                  ? `Sélectionnez ${mode === 'single' ? 'un contact' : 'des contacts'} existants`
                  : 'Saisissez un nouveau numéro WhatsApp'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {activeTab === 'list' && (
                <button
                  type="button"
                  onClick={() => fetchContacts(query)}
                  disabled={loading}
                  className="p-2 text-gray-500 hover:text-white transition-colors rounded-xl hover:bg-white/5"
                  title="Actualiser"
                >
                  <Loader2 className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                className="p-2 -mr-2 text-gray-500 hover:text-white transition-colors rounded-xl hover:bg-white/5"
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>
          </div>

          {/* Tabs UI */}
          {mode === 'single' && (
            <div className="mt-6 flex p-1 bg-space-900/50 rounded-2xl border border-white/5">
              <button
                onClick={() => setActiveTab('list')}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all ${
                  activeTab === 'list' ? 'bg-white text-black shadow-lg' : 'text-gray-400 hover:text-gray-100'
                }`}
              >
                <Users className="w-4 h-4" />
                Répertoire
              </button>
              <button
                onClick={() => setActiveTab('manual')}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all ${
                  activeTab === 'manual' ? 'bg-white text-black shadow-lg' : 'text-gray-400 hover:text-gray-100'
                }`}
              >
                <Phone className="w-4 h-4" />
                Saisie manuelle
              </button>
            </div>
          )}

          {activeTab === 'list' && (
            <div
              className={`mt-6 flex items-center gap-3 px-4 py-3 rounded-2xl border transition-all duration-300 ${
                isDark ? 'bg-space-800/50 border-space-700/50 focus-within:border-space-600' : 'bg-white border-gray-200'
              }`}
            >
              <Search className="w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Rechercher (nom ou numéro)..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="bg-transparent border-none p-0 focus:ring-0 w-full text-base placeholder:text-gray-500"
              />
            </div>
          )}
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto p-6 sm:p-8 pt-0 custom-scrollbar overscroll-contain">
          {activeTab === 'manual' ? (
            <div className="space-y-6 animate-fadeIn">
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-2">Numéro de téléphone</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <Phone className="w-5 h-5 text-gray-500" />
                    </div>
                    <input
                      type="tel"
                      value={manualPhone}
                      onChange={(e) => setManualPhone(e.target.value.replace(/\D/g, ''))}
                      placeholder="Ex: 2250707070707"
                      className="w-full pl-12 pr-4 py-4 bg-white/5 border border-white/10 rounded-2xl text-white placeholder:text-gray-600 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 outline-none transition-all"
                    />
                  </div>
                  <p className="mt-2 text-[10px] text-gray-500 italic">Incluez l'indicatif pays sans le + (ex: 225 pour la Côte d'Ivoire)</p>
                </div>

                <div>
                  <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-2">Nom du contact (optionnel)</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <UserPlus className="w-5 h-5 text-gray-500" />
                    </div>
                    <input
                      type="text"
                      value={manualName}
                      onChange={(e) => setManualName(e.target.value)}
                      placeholder="Ex: Jean Dupont"
                      className="w-full pl-12 pr-4 py-4 bg-white/5 border border-white/10 rounded-2xl text-white placeholder:text-gray-600 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 outline-none transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-2">Envoyer via l'agent</label>
                  {fetchingAgents ? (
                    <div className="h-14 bg-white/5 rounded-2xl animate-pulse" />
                  ) : agents.length === 0 ? (
                    <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-sm">
                      Aucun agent WhatsApp connecté. Veuillez connecter un agent dans les paramètres.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-2">
                      {agents.map(agent => (
                        <button
                          key={agent.id}
                          onClick={() => setManualAgentId(agent.id)}
                          className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${
                            manualAgentId === agent.id 
                              ? 'bg-blue-500/20 border-blue-500 text-blue-100 shadow-lg' 
                              : 'bg-white/5 border-white/10 text-gray-400 hover:border-white/20'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg ${manualAgentId === agent.id ? 'bg-blue-500 text-white' : 'bg-white/10'}`}>
                              <User className="w-4 h-4" />
                            </div>
                            <span className="font-bold">{agent.name}</span>
                          </div>
                          {manualAgentId === agent.id && <Check className="w-5 h-5 text-blue-500" />}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : loading ? (
            <div className="flex flex-col items-center justify-center py-16">
              <Loader2 className="w-10 h-10 animate-spin text-gold-400 mb-4" />
              <p className="text-gray-500 text-xs font-black uppercase tracking-widest">Chargement...</p>
            </div>
          ) : error ? (
            <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-6 text-center">
              <p className="text-red-300">{error}</p>
            </div>
          ) : list.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-gray-500">Aucun contact trouvé.</p>
              <button 
                onClick={() => setActiveTab('manual')}
                className="mt-4 text-blue-400 font-bold flex items-center gap-2 mx-auto hover:underline"
              >
                Saisir un numéro manuellement <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {list.map((c) => {
                const key = normalizePhoneForCompare(c.contact_number)
                const isSelected = key ? selected.has(key) : false
                return (
                  <button
                    key={`${c.agent_id || 'a'}-${c.contact_number}`}
                    type="button"
                    onClick={() => toggle(c)}
                    className={`text-left p-4 rounded-2xl border transition-all ${
                      isSelected ? 'bg-white text-black border-white' : 'bg-white/[0.02] border-white/5 hover:border-white/15'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className={`font-bold truncate ${isSelected ? 'text-black' : 'text-gray-100'}`}>
                          {c.contact_name || c.contact_number}
                        </div>
                        <div className={`text-[10px] font-black font-mono truncate mt-1 ${isSelected ? 'text-black/70' : 'text-gray-500'}`}>
                          {c.contact_number}
                        </div>
                        <div className={`text-[10px] font-black uppercase tracking-widest truncate mt-2 ${isSelected ? 'text-black/60' : 'text-gray-600'}`}>
                          {c.agent_name ? `Agent: ${c.agent_name}` : 'Agent: —'}
                        </div>
                      </div>
                      <div className={`w-7 h-7 rounded-xl border flex items-center justify-center flex-shrink-0 ${
                        isSelected ? 'bg-black/10 border-black/10' : 'bg-black/40 border-white/10'
                      }`}>
                        {isSelected && <Check className={`w-4 h-4 ${isSelected ? 'text-black' : 'text-gray-400'}`} />}
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        <div className="flex-shrink-0 p-6 sm:p-8 pt-4 border-t border-white/5 bg-black/20 flex flex-col sm:flex-row gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-4 px-6 rounded-2xl font-bold text-gray-400 hover:text-white transition-all"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={confirm}
            disabled={activeTab === 'manual' ? !manualPhone || !manualAgentId : (mode === 'single' ? selectedCount !== 1 : selectedCount === 0)}
            className="flex-1 py-4 px-6 rounded-2xl font-syne font-black italic bg-white text-black hover:bg-gold-400 transition-all hover:scale-[1.02] active:scale-[0.98] shadow-xl disabled:opacity-50"
          >
            {activeTab === 'manual' 
              ? 'Démarrer la discussion'
              : (mode === 'single' ? 'Choisir ce contact' : `Ajouter ${selectedCount} contact(s)`)}
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}

