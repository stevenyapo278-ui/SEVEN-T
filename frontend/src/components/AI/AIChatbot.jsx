import { useState, useRef, useEffect, useCallback } from 'react'
import { m, AnimatePresence } from 'framer-motion'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import {
  Bot, X, Send, Sparkles, Loader2,
  CheckCircle2, AlertCircle, Package, UserPlus,
  Megaphone, MessageSquare, Settings,
  ArrowRight, BarChart3, Zap, TrendingUp,
  ShoppingCart, CreditCard, Link2, User, Box
} from 'lucide-react'
import api from '../../services/api'
import { useTheme } from '../../contexts/ThemeContext'
import toast from 'react-hot-toast'

// ─── Clipboard fallback (works without HTTPS) ────────────────────────────────
async function copyToClipboard(text) {
  if (navigator.clipboard && window.isSecureContext) {
    return navigator.clipboard.writeText(text)
  }
  const el = document.createElement('textarea')
  el.value = text
  Object.assign(el.style, { position: 'fixed', left: '-999999px' })
  document.body.appendChild(el)
  el.focus()
  el.select()
  document.execCommand('copy')
  el.remove()
}

// ─── Action executor: routes frontend actions and calls backend ───────────────

async function executeAction(action, navigate, onClose) {
  if (typeof action === 'string') action = { type: action, data: {} }
  if (!action?.type) return null

  const { type, data = {} } = action

  // ── Frontend only actions ──────────────────────────────────────────────────
  switch (type) {
    case 'NAVIGATE': {
      if (data.to) {
        navigate(data.to)
        return { ok: true, navigated: true }
      }
      return null
    }

    case 'CREATE_PRODUCT': {
      const { name, price = 0, description = '' } = data
      await api.post('/products', {
        name,
        price: parseFloat(price) || 0,
        description: description || 'Créé via l\'assistant IA',
        status: 'active'
      })
      return {
        ok: true, icon: Package, color: 'emerald',
        label: `Produit "${name}" créé`,
        to: '/dashboard/products'
      }
    }

    case 'CREATE_LEAD': {
      const { name, phone = null, status = 'new' } = data
      await api.post('/leads', { name, phone, source: 'AI Chatbot', status })
      return {
        ok: true, icon: UserPlus, color: 'blue',
        label: `Contact "${name}" ajouté`,
        to: '/dashboard/leads'
      }
    }

    case 'SHOW_STATS': {
      const res = await api.get('/stats/dashboard')
      const s = res.data.stats
      return {
        ok: true, stats: s, icon: BarChart3, color: 'gold',
        label: 'Tableau de bord'
      }
    }

    // ── Backend-delegated actions ──────────────────────────────────────────────
    case 'SHOW_ORDERS': {
      const res = await api.post('/chatbot/action', { type, data })
      return {
        ok: true, icon: ShoppingCart, color: 'blue',
        label: `${res.data.count} commande(s)`,
        orders: res.data.orders,
        to: '/dashboard/orders'
      }
    }

    case 'SHOW_LEADS': {
      const res = await api.post('/chatbot/action', { type, data })
      return {
        ok: true, icon: User, color: 'blue',
        label: `${res.data.count} contact(s)`,
        leads: res.data.leads,
        to: '/dashboard/leads'
      }
    }

    case 'SHOW_PRODUCTS': {
      const res = await api.post('/chatbot/action', { type, data })
      return {
        ok: true, icon: Box, color: 'emerald',
        label: `${res.data.count} produit(s)`,
        products: res.data.products,
        to: '/dashboard/products'
      }
    }

    case 'SHOW_PAYMENTS': {
      const res = await api.post('/chatbot/action', { type, data })
      return {
        ok: true, icon: CreditCard, color: 'gold',
        label: `${res.data.count} lien(s) de paiement`,
        payments: res.data.payments,
        to: '/dashboard/payments'
      }
    }

    case 'SEARCH_PRODUCT': {
      const res = await api.post('/chatbot/action', { type, data })
      return {
        ok: true, icon: Box, color: 'emerald',
        label: `Produits trouvés : ${res.data.products?.length || 0}`,
        products: res.data.products,
        to: '/dashboard/products'
      }
    }

    case 'SEARCH_ORDER': {
      const res = await api.post('/chatbot/action', { type, data })
      return {
        ok: true, icon: ShoppingCart, color: 'blue',
        label: `Commandes trouvées : ${res.data.orders?.length || 0}`,
        orders: res.data.orders,
        to: '/dashboard/orders'
      }
    }

    case 'CREATE_ORDER': {
      const res = await api.post('/chatbot/action', { type, data })
      const order = res.data.order
      return {
        ok: true, icon: ShoppingCart, color: 'emerald',
        label: `Commande créée pour ${order.customer_name}`,
        order,
        to: '/dashboard/orders'
      }
    }

    case 'CREATE_PAYMENT_LINK': {
      const res = await api.post('/chatbot/action', { type, data })
      const payment = res.data.payment
      return {
        ok: true, icon: Link2, color: 'gold',
        label: `Lien de paiement créé`,
        payment,
        to: '/dashboard/payments'
      }
    }

    case 'VALIDATE_ORDER': {
      const res = await api.post('/chatbot/action', { type, data })
      const order = res.data.order
      return {
        ok: true, icon: CheckCircle2, color: 'emerald',
        label: `Commande de ${order.customer_name} validée`,
        to: '/dashboard/orders'
      }
    }

    case 'UPDATE_PRODUCT_STOCK': {
      const res = await api.post('/chatbot/action', { type, data })
      const { product, previousStock, newStock } = res.data
      return {
        ok: true, icon: Package, color: 'emerald',
        label: `Stock mis à jour : ${previousStock} → ${newStock}`,
        to: '/dashboard/products'
      }
    }

    default:
      return null
  }
}

// ─── Markdown renderer ────────────────────────────────────────────────────────

const MarkdownLine = ({ line, index }) => {
  const parts = line.split(/\*\*(.+?)\*\*/g)
  return (
    <p className={index > 0 ? 'mt-1' : ''}>
      {parts.map((part, j) =>
        j % 2 === 1
          ? <strong key={`part-${j}`} className="font-bold text-white">{part}</strong>
          : part
      )}
    </p>
  )
}

const MarkdownRenderer = ({ text }) => {
  if (!text) return null
  return text.split('\n').map((line, i) => (
    <MarkdownLine key={`line-${i}-${line.substring(0, 10)}`} line={line} index={i} />
  ))
}

// ─── Data table renderers ─────────────────────────────────────────────────────

const STATUS_LABELS = {
  pending: 'En attente', validated: 'Validée', delivered: 'Livrée',
  rejected: 'Rejetée', completed: 'Terminée', cancelled: 'Annulée',
  new: 'Nouveau', active: 'Actif', paid: 'Payé'
}

const STATUS_COLORS = {
  pending: 'text-amber-400', validated: 'text-green-400', delivered: 'text-emerald-400',
  rejected: 'text-red-400', completed: 'text-blue-400', cancelled: 'text-zinc-400',
  new: 'text-blue-400', active: 'text-emerald-400', paid: 'text-emerald-400'
}

function OrdersTable({ orders }) {
  if (!orders?.length) return <p className="text-xs text-zinc-500 italic">Aucune commande trouvée</p>
  return (
    <div className="space-y-1.5 mt-2">
      {orders.map(o => (
        <div key={o.id} className="flex items-center justify-between gap-2 px-2 py-1.5 bg-white/5 rounded-lg border border-white/5">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-zinc-100 truncate">{o.customer_name}</p>
            <p className="text-[10px] text-zinc-500">{o.customer_phone || '—'}</p>
          </div>
          <div className="flex-shrink-0 text-right">
            <p className={`text-[10px] font-bold ${STATUS_COLORS[o.status] || 'text-zinc-400'}`}>{STATUS_LABELS[o.status] || o.status}</p>
            <p className="text-[10px] text-zinc-500 font-mono">{Number(o.total_amount || 0).toLocaleString()} {o.currency}</p>
          </div>
        </div>
      ))}
    </div>
  )
}

function LeadsTable({ leads }) {
  if (!leads?.length) return <p className="text-xs text-zinc-500 italic">Aucun contact trouvé</p>
  return (
    <div className="space-y-1.5 mt-2">
      {leads.map(l => (
        <div key={l.id} className="flex items-center justify-between gap-2 px-2 py-1.5 bg-white/5 rounded-lg border border-white/5">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-zinc-100 truncate">{l.name}</p>
            <p className="text-[10px] text-zinc-500">{l.phone || '—'}</p>
          </div>
          <span className={`text-[10px] font-bold flex-shrink-0 ${STATUS_COLORS[l.status] || 'text-zinc-400'}`}>{STATUS_LABELS[l.status] || l.status}</span>
        </div>
      ))}
    </div>
  )
}

function ProductsTable({ products }) {
  if (!products?.length) return <p className="text-xs text-zinc-500 italic">Aucun produit trouvé</p>
  return (
    <div className="space-y-1.5 mt-2">
      {products.map(p => (
        <div key={p.id} className="flex items-center justify-between gap-2 px-2 py-1.5 bg-white/5 rounded-lg border border-white/5">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-zinc-100 truncate">{p.name}</p>
            <p className="text-[10px] text-zinc-500 font-mono">{Number(p.price || 0).toLocaleString()} XOF</p>
          </div>
          <div className="flex-shrink-0 text-right">
            <p className={`text-[10px] font-bold ${p.stock_quantity > 0 ? 'text-emerald-400' : 'text-red-400'}`}>Stock: {p.stock_quantity ?? '—'}</p>
          </div>
        </div>
      ))}
    </div>
  )
}

function PaymentsTable({ payments }) {
  if (!payments?.length) return <p className="text-xs text-zinc-500 italic">Aucun lien trouvé</p>
  return (
    <div className="space-y-1.5 mt-2">
      {payments.map(p => (
        <div key={p.id} className="flex items-center justify-between gap-2 px-2 py-1.5 bg-white/5 rounded-lg border border-white/5">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-zinc-100 truncate">{p.description || 'Lien de paiement'}</p>
            <p className="text-[10px] text-zinc-500 font-mono truncate">{p.payment_url}</p>
          </div>
          <div className="flex-shrink-0 text-right">
            <p className="text-[10px] font-bold text-gold-400 font-mono">{Number(p.amount).toLocaleString()} {p.currency}</p>
            <p className={`text-[10px] ${STATUS_COLORS[p.status] || 'text-zinc-400'}`}>{STATUS_LABELS[p.status] || p.status}</p>
          </div>
        </div>
      ))}
    </div>
  )
}

function PaymentCard({ payment }) {
  if (!payment) return null
  return (
    <div className="mt-2 p-3 bg-gold-400/10 rounded-xl border border-gold-400/20">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-bold text-gold-400">{Number(payment.amount).toLocaleString()} {payment.currency}</p>
        <button
          onClick={() => { copyToClipboard(payment.payment_url); toast.success('Lien copié !') }}
          className="text-[10px] px-2 py-0.5 bg-gold-400/20 text-gold-400 rounded-md hover:bg-gold-400/30 transition-colors font-bold"
        >
          Copier le lien
        </button>
      </div>
      <p className="text-[10px] text-zinc-400 font-mono truncate">{payment.payment_url}</p>
    </div>
  )
}

// ─── Message Bubble ───────────────────────────────────────────────────────────

function BotBubble({ msg, navigate, isDark }) {
  const { text, actionResult, isError } = msg

  const colorMap = {
    emerald: { border: 'border-emerald-500/30', bg: 'bg-emerald-500/10', icon: 'text-emerald-400' },
    blue:    { border: 'border-blue-500/30',    bg: 'bg-blue-500/10',    icon: 'text-blue-400' },
    gold:    { border: 'border-gold-400/30',    bg: 'bg-gold-400/10',    icon: 'text-gold-400' },
    red:     { border: 'border-red-500/30',     bg: 'bg-red-500/10',     icon: 'text-red-400' },
    default: { border: 'border-white/10',       bg: 'bg-white/5',        icon: 'text-zinc-400' },
  }

  const color = isError ? colorMap.red : (actionResult?.color ? colorMap[actionResult.color] : colorMap.default)
  const Icon = isError ? AlertCircle : (actionResult?.icon || Bot)

  return (
    <div className="flex justify-start">
      <div className="flex gap-2.5 max-w-[92%]">
        <div className={`flex-shrink-0 size-7 rounded-lg flex items-center justify-center mt-0.5 ${isDark ? 'bg-space-700' : 'bg-zinc-100'}`}>
          <Bot className="size-4 text-gold-400" />
        </div>
        <div className={`flex-1 rounded-2xl rounded-tl-sm border px-4 py-3 ${color.bg} ${color.border}`}>
          {/* Action badge */}
          {actionResult?.label && (
            <div className={`flex items-center gap-1.5 mb-2 ${color.icon}`}>
              <CheckCircle2 className="size-3.5 flex-shrink-0" />
              <span className="text-xs font-bold">{actionResult.label}</span>
            </div>
          )}

          {/* Stats display */}
          {actionResult?.stats && (
            <div className="grid grid-cols-2 gap-1.5 mb-2">
              {[
                { label: 'Agents IA', value: actionResult.stats.agents?.total ?? 0 },
                { label: 'Conversations', value: actionResult.stats.conversations?.total ?? 0 },
                { label: 'Messages', value: actionResult.stats.messages?.total ?? 0 },
                { label: 'Crédits', value: actionResult.stats.credits ?? 0 },
              ].map(item => (
                <div key={item.label} className={`rounded-lg px-2 py-1.5 border ${isDark ? 'bg-space-800 border-space-700' : 'bg-white border-zinc-200'}`}>
                  <p className="text-[10px] text-zinc-500 uppercase tracking-wider">{item.label}</p>
                  <p className={`text-sm font-bold ${isDark ? 'text-white' : 'text-zinc-900'}`}>{item.value}</p>
                </div>
              ))}
            </div>
          )}

          {/* Data tables */}
          {actionResult?.orders && <OrdersTable orders={actionResult.orders} />}
          {actionResult?.leads && <LeadsTable leads={actionResult.leads} />}
          {actionResult?.products && <ProductsTable products={actionResult.products} />}
          {actionResult?.payments && <PaymentsTable payments={actionResult.payments} />}
          {actionResult?.payment && <PaymentCard payment={actionResult.payment} />}

          {/* Text response */}
          <div className={`text-sm text-zinc-400 leading-relaxed ${actionResult?.orders || actionResult?.leads || actionResult?.products || actionResult?.payments || actionResult?.payment ? 'mt-2' : ''}`}>
            <MarkdownRenderer text={text} />
          </div>

          {/* CTA link */}
          {actionResult?.to && !actionResult.navigated && (
            <button
              onClick={() => navigate(actionResult.to)}
              className="mt-2.5 flex items-center gap-1 text-xs font-bold text-gold-400 hover:text-gold-300 transition-colors"
            >
              Voir <ArrowRight className="size-3" />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

function UserBubble({ text }) {
  return (
    <div className="flex justify-end">
      <div className="max-w-[80%] bg-gold-400 text-black px-4 py-2.5 rounded-2xl rounded-tr-sm text-sm font-medium shadow-sm">
        {text}
      </div>
    </div>
  )
}

// ─── Main Chatbot Component ────────────────────────────────────────────────────

const WELCOME = {
  id: 'welcome',
  role: 'bot',
  text: `Bonjour ! Je suis votre assistant IA alimenté par vos modèles configurés.

Dites-moi ce que vous voulez faire :
- **Créer** un produit, une commande, un contact ou un lien de paiement
- **Consulter** vos commandes, produits, contacts ou paiements
- **Naviguer** vers une page
- **Consulter** vos statistiques
- Ou posez-moi simplement une question !`,
  actionResult: null
}

const SUGGESTIONS = [
  'Mes statistiques',
  'Mes commandes en attente',
  'Mes produits',
  'Créer un produit',
  'Voir mes contacts',
  'Créer un lien de paiement',
]

export default function AIChatbot({ isOpen, onClose }) {
  const { isDark } = useTheme()
  const navigate = useNavigate()
  const [messages, setMessages] = useState([WELCOME])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef(null)
  const inputRef = useRef(null)
  const historyRef = useRef([])

  useEffect(() => {
    let timeoutId;
    if (isOpen) {
      timeoutId = setTimeout(() => inputRef.current?.focus(), 150)
    }
    return () => clearTimeout(timeoutId)
  }, [isOpen])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const send = useCallback(async (overrideText) => {
    const text = (overrideText ?? input).trim()
    if (!text || loading) return

    const userMsg = { id: Date.now(), role: 'user', text }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setLoading(true)

    const historyPayload = historyRef.current.slice(-8)

    try {
      const { data } = await api.post('/chatbot/message', {
        message: text,
        history: historyPayload
      })

      const botText = data.response || 'Je n\'ai pas pu répondre.'
      let actionResult = null

      if (data.action) {
        try {
          actionResult = await executeAction(data.action, navigate, onClose)
          if (actionResult?.navigated) {
            setTimeout(onClose, 600)
          }
        } catch (actionErr) {
          const errMsg = actionErr?.response?.data?.error || actionErr.message
          toast.error(`Action échouée : ${errMsg}`)
          actionResult = { ok: false, isError: true, label: `Erreur: ${errMsg}` }
        }
      }

      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        role: 'bot',
        text: botText,
        actionResult,
        isError: actionResult?.ok === false
      }])

      historyRef.current = [
        ...historyRef.current,
        { role: 'user', content: text },
        { role: 'assistant', content: botText }
      ].slice(-16)

    } catch (err) {
      const errMsg = err?.response?.data?.response || err?.response?.data?.error || 'Erreur inattendue. Réessayez.'
      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        role: 'bot',
        text: errMsg,
        actionResult: null,
        isError: true
      }])
    } finally {
      setLoading(false)
    }
  }, [input, loading, navigate, onClose])

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  const handleSuggestion = (s) => {
    setInput(s)
    setTimeout(() => send(s), 50)
  }

  if (!isOpen) return null

  return createPortal(
    <div className="fixed inset-0 z-[998] pointer-events-none">
      <m.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 pointer-events-auto lg:pointer-events-none"
        onClick={onClose}
      />

      <m.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
        onClick={e => e.stopPropagation()}
        className={`
          pointer-events-auto
          fixed bottom-24 right-6
          w-[420px] max-w-[calc(100vw-2rem)]
          flex flex-col
          rounded-2xl shadow-2xl border overflow-hidden
          ${isDark
            ? 'bg-space-900 border-space-700 shadow-black/60'
            : 'bg-white border-zinc-200 shadow-gray-400/20'
          }
        `}
        style={{ maxHeight: 'min(640px, calc(100vh - 80px))', zIndex: 50 }}
      >
        {/* Header */}
        <div className={`flex items-center justify-between px-4 py-3 border-b flex-shrink-0 ${isDark ? 'border-space-700 bg-space-800/50' : 'border-gray-100 bg-gray-50'}`}>
          <div className="flex items-center gap-2.5">
            <div className="relative">
              <div className="size-8 rounded-xl bg-gold-400/20 flex items-center justify-center">
                <Bot className="size-4 text-gold-400" />
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 size-2.5 bg-emerald-400 rounded-full border-2 border-space-900" />
            </div>
            <div>
              <p className={`text-sm font-bold leading-none ${isDark ? 'text-white' : 'text-zinc-900'}`}>
                Assistant IA
              </p>
              <p className="text-[10px] text-emerald-400 font-medium mt-0.5">● En ligne · Alimenté par vos modèles IA</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className={`p-1.5 rounded-lg transition-colors ${isDark ? 'hover:bg-space-700 text-zinc-400' : 'hover:bg-zinc-100 text-zinc-500'}`}
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar" style={{ minHeight: 0 }}>
          <AnimatePresence initial={false}>
            {messages.map(msg => (
              <m.div
                key={msg.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
              >
                {msg.role === 'user'
                  ? <UserBubble text={msg.text} />
                  : <BotBubble msg={msg} navigate={navigate} isDark={isDark} />
                }
              </m.div>
            ))}

            {loading && (
              <m.div
                key="typing"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="flex items-center gap-2.5"
              >
                <div className={`size-7 rounded-lg flex items-center justify-center ${isDark ? 'bg-space-700' : 'bg-zinc-100'}`}>
                  <Bot className="size-4 text-gold-400" />
                </div>
                <div className={`px-4 py-3 rounded-2xl rounded-tl-sm border ${isDark ? 'border-space-700 bg-space-800' : 'border-zinc-200 bg-gray-50'}`}>
                  <div className="flex items-center gap-1.5">
                    {[0, 150, 300].map(delay => (
                      <m.div
                        key={delay}
                        animate={{ y: [0, -6, 0] }}
                        transition={{ 
                          duration: 0.8, 
                          repeat: Infinity, 
                          delay: delay / 1000, 
                          ease: [0.16, 1, 0.3, 1] 
                        }}
                        className="size-1.5 rounded-full bg-gold-400"
                      />
                    ))}
                  </div>
                </div>
              </m.div>
            )}
          </AnimatePresence>
          <div ref={bottomRef} />
        </div>

        {/* Quick suggestions */}
        {messages.length === 1 && !loading && (
          <div className={`px-4 pb-2 flex gap-2 flex-wrap flex-shrink-0 border-t pt-3 ${isDark ? 'border-space-700' : 'border-gray-100'}`}>
            {SUGGESTIONS.map(suggestion => (
              <button
                key={suggestion}
                onClick={() => handleSuggestion(suggestion)}
                className={`text-xs px-2.5 py-1 rounded-full border transition-all ${
                  isDark
                    ? 'border-space-700 text-zinc-400 hover:border-gold-400/40 hover:text-white'
                    : 'border-zinc-200 text-zinc-500 hover:border-gold-400/60 hover:text-zinc-900'
                }`}
              >
                {suggestion}
              </button>
            ))}
          </div>
        )}

        {/* Input */}
        <div className={`flex-shrink-0 px-3 py-3 border-t ${isDark ? 'border-space-700 bg-space-800/30' : 'border-gray-100 bg-gray-50/50'}`}>
          <div className={`flex items-end gap-2 rounded-xl border px-3 py-2 ${isDark ? 'border-space-700 bg-space-800' : 'border-zinc-200 bg-white'}`}>
            <Sparkles className="size-4 text-gold-400 flex-shrink-0 mb-1" />
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Que voulez-vous faire ?"
              rows={1}
              disabled={loading}
              className={`flex-1 resize-none bg-transparent text-sm outline-none leading-relaxed max-h-24 ${isDark ? 'text-white placeholder-gray-500' : 'text-zinc-900 placeholder-gray-400'}`}
              style={{ scrollbarWidth: 'none' }}
            />
            <button
              onClick={() => send()}
              disabled={!input.trim() || loading}
              className="flex-shrink-0 size-7 rounded-lg bg-gold-400 flex items-center justify-center transition-all hover:bg-gold-300 disabled:opacity-40 disabled:cursor-not-allowed mb-0.5"
            >
              {loading
                ? <Loader2 className="size-3.5 text-black animate-spin" />
                : <Send className="size-3.5 text-black" />
              }
            </button>
          </div>
          <p className={`text-[10px] text-center mt-1.5 ${isDark ? 'text-zinc-600' : 'text-zinc-400'}`}>
            Entrée pour envoyer · Shift+Entrée pour nouvelle ligne
          </p>
        </div>
      </m.div>
    </div>,
    document.body
  )
}
