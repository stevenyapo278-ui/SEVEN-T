import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Search, XCircle, Users, Loader2, Check } from 'lucide-react'
import api from '../services/api'
import { useTheme } from '../contexts/ThemeContext'

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
  }, [open, initialSelectedKey, agentId])

  const fetchContacts = async (qValue) => {
    if (!open) return
    const key = `${agentId || 'all'}|${minMessages || 0}|${qValue || ''}`.trim()
    if (lastFetchKeyRef.current === key && contacts.length > 0) return
    lastFetchKeyRef.current = key
    setLoading(true)
    setError(null)
    try {
      // Prefer Baileys store contacts (full list). Fallbacks based on conversations are incomplete.
      const res = await api.get('/whatsapp/imported-contacts', {
        params: {
          agent_id: agentId || undefined,
          q: qValue || undefined,
          limit: 2000
        }
      })
      const storeContacts = res.data?.contacts || []
      if (storeContacts.length > 0) {
        setContacts(storeContacts)
        return
      }

      // Fallback: contacts based on conversations (always available even when Baileys store is empty)
      const fallback = await api.get('/conversations/imported-contacts', {
        params: {
          agent_id: agentId || undefined,
          q: qValue || undefined,
          min_messages: minMessages || undefined,
          limit: 300
        }
      })
      setContacts(fallback.data?.contacts || [])
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      style={{ paddingLeft: 'env(safe-area-inset-left)', paddingRight: 'env(safe-area-inset-right)' }}
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

        <div className="flex-shrink-0 p-6 sm:p-8" style={{ paddingTop: 'max(1.5rem, env(safe-area-inset-top))' }}>
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <h2 className="text-2xl font-display font-bold text-gray-100 truncate flex items-center gap-3">
                <Users className="w-6 h-6 text-blue-400 flex-shrink-0" />
                {title}
              </h2>
              <p className="text-sm text-gray-500 mt-1 truncate">
                Sélectionnez {mode === 'single' ? 'un contact' : 'des contacts'} depuis vos conversations
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-2 -mr-2 text-gray-500 hover:text-white transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl hover:bg-white/5"
              aria-label="Fermer"
            >
              <XCircle className="w-6 h-6" />
            </button>
          </div>

          <div
            className={`mt-6 flex items-center gap-3 px-4 py-3 rounded-2xl border transition-all duration-300 ${
              isDark ? 'bg-space-800/50 border-space-700/50 focus-within:border-space-600' : 'bg-white border-gray-200'
            }`}
          >
            <Search className="w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher (nom ou numéro)…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="bg-transparent border-none p-0 focus:ring-0 w-full text-base placeholder:text-gray-500"
            />
          </div>

          {!loading && !error && list.length > 0 && mode === 'multi' && (
            <div className="mt-4 px-1 flex justify-end">
              <button
                type="button"
                onClick={toggleAll}
                className="text-[10px] font-black text-blue-400 hover:text-white uppercase tracking-widest transition-colors flex items-center gap-2"
              >
                {list.every(c => selected.has(normalizePhoneForCompare(c.contact_number))) 
                  ? 'Désélectionner tout' 
                  : 'Tout sélectionner'}
              </button>
            </div>
          )}
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto p-6 sm:p-8 pt-0 custom-scrollbar overscroll-contain">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16">
              <Loader2 className="w-10 h-10 animate-spin text-gold-400 mb-4" />
              <p className="text-gray-500 text-xs font-black uppercase tracking-widest">Chargement…</p>
            </div>
          ) : error ? (
            <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-6 text-center">
              <p className="text-red-300">{error}</p>
            </div>
          ) : list.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-gray-500">Aucun contact importé trouvé.</p>
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
                      isSelected ? 'bg-gold-400 text-black border-gold-400' : 'bg-white/[0.02] border-white/5 hover:border-white/15'
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

        <div className="flex-shrink-0 p-6 sm:p-8 pt-4 border-t border-white/5 bg-black/20 flex flex-col sm:flex-row gap-3" style={{ paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))' }}>
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-4 px-6 rounded-2xl font-bold text-gray-400 hover:text-white hover:bg-white/5 transition-all min-h-[48px]"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={confirm}
            disabled={mode === 'single' ? selectedCount !== 1 : selectedCount === 0}
            className="flex-1 py-4 px-6 rounded-2xl font-syne font-black italic bg-white text-black hover:bg-gold-400 transition-all hover:scale-[1.02] active:scale-[0.98] shadow-xl min-h-[48px] disabled:opacity-50 disabled:grayscale disabled:scale-100"
          >
            {mode === 'single'
              ? 'Choisir ce contact'
              : `Ajouter ${selectedCount > 0 ? selectedCount : 'des'} contact(s)`}
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}

