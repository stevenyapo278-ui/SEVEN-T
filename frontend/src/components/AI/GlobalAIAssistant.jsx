import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { 
  Search, Sparkles, Megaphone, UserPlus, 
  ShoppingCart, Bot, MessageSquare, X, Wrench 
} from 'lucide-react'
import { useTheme } from '../../contexts/ThemeContext'
import { createPortal } from 'react-dom'

const ACTIONS = [
  { id: 'campaign', icon: Megaphone, label: 'Lancer une campagne', desc: 'Envoyer un message à plusieurs contacts', to: '/dashboard/campaigns' },
  { id: 'agent', icon: Bot, label: 'Créer un agent', desc: 'Configurer une nouvelle IA', to: '/dashboard/agents?create=true' },
  { id: 'product', icon: ShoppingCart, label: 'Ajouter un produit', desc: 'Compléter votre catalogue', to: '/dashboard/products' },
  { id: 'contact', icon: UserPlus, label: 'Importer des contacts', desc: 'Ajouter une cible (CSV)', to: '/dashboard/leads' },
  { id: 'message', icon: MessageSquare, label: 'Voir les messages', desc: 'Ouvrir la boîte de réception', to: '/dashboard/conversations' },
  { id: 'repair', icon: Wrench, label: 'Réparer les connexions', desc: 'Relancer WhatsApp en 1 clic', to: '/dashboard/whatsapp-status' },
]

export default function GlobalAIAssistant() {
  const [isOpen, setIsOpen] = useState(false)
  const [query, setQuery] = useState('')
  const { isDark } = useTheme()
  const navigate = useNavigate()
  const inputRef = useRef(null)

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setIsOpen(true)
      }
      if (e.key === 'Escape') {
        setIsOpen(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current.focus(), 100)
    } else {
      setQuery('')
    }
  }, [isOpen])

  const filteredActions = ACTIONS.filter(a => 
    a.label.toLowerCase().includes(query.toLowerCase()) || 
    a.desc.toLowerCase().includes(query.toLowerCase())
  )

  const handleSelect = (to) => {
    navigate(to)
    setIsOpen(false)
  }

  return (
    <>
      {/* Desktop Search Bar */}
      <button
        onClick={() => setIsOpen(true)}
        className={`hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all ${
          isDark 
            ? 'bg-space-800 border-space-700 text-gray-400 hover:text-gray-200 hover:bg-space-700' 
            : 'bg-white border-gray-200 text-gray-500 hover:text-gray-800 hover:bg-gray-50'
        }`}
      >
        <Search className="w-4 h-4" />
        <span className="text-xs font-medium mr-4">Demander à l'IA...</span>
        <div className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-mono ${isDark ? 'bg-space-900 border-space-700' : 'bg-gray-100 border-gray-200'} border`}>
          <span>⌘</span><span>K</span>
        </div>
      </button>

      {/* Mobile Icon Button */}
      <button
        onClick={() => setIsOpen(true)}
        className={`md:hidden flex items-center justify-center w-8 h-8 rounded-lg transition-all ${
          isDark ? 'hover:bg-space-800 text-gray-400' : 'hover:bg-gray-100 text-gray-500'
        }`}
      >
        <Search className="w-5 h-5" />
      </button>

      <AnimatePresence>
        {isOpen && createPortal(
          <div className="fixed inset-0 z-[999] flex items-start justify-center pt-[10vh] sm:pt-[15vh]">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setIsOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className={`relative w-full max-w-xl mx-4 rounded-2xl shadow-2xl border overflow-hidden ${
                isDark ? 'bg-space-900 border-space-700' : 'bg-white border-gray-200'
              }`}
            >
              <div className="flex items-center border-b p-4 gap-3 relative">
                <Sparkles className="w-5 h-5 text-gold-400" />
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Que voulez-vous faire ?"
                  className={`flex-1 bg-transparent border-none outline-none text-lg ${
                    isDark ? 'text-white placeholder-gray-500' : 'text-gray-900 placeholder-gray-400'
                  }`}
                />
                <button onClick={() => setIsOpen(false)} className={`p-1 rounded-md ${isDark ? 'hover:bg-space-800' : 'hover:bg-gray-100'}`}>
                  <X className="w-4 h-4 text-gray-400" />
                </button>
              </div>

              <div className="max-h-[60vh] overflow-y-auto p-2 overscroll-contain">
                 {query.trim() && (
                   <div className="px-3 py-2 mb-2">
                       <p className="text-[10px] font-bold uppercase tracking-widest text-gold-400 mb-2">Génération IA</p>
                       <button className="w-full flex items-center gap-3 p-3 rounded-lg text-left bg-gradient-to-r from-gold-400/10 to-amber-500/10 border border-gold-400/20 hover:from-gold-400/20 hover:to-amber-500/20 transition-all">
                          <Sparkles className="w-5 h-5 text-gold-400" />
                          <div>
                              <p className={`text-sm font-semibold ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>"{query}"</p>
                              <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>Demander à l'assistant de configurer ça pour vous</p>
                          </div>
                       </button>
                   </div>
                 )}

                <div className="px-1 pb-2">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-2 px-3">Actions rapides</p>
                  {filteredActions.length === 0 ? (
                    <div className="py-6 text-center text-sm text-gray-500">Aucune action trouvée</div>
                  ) : (
                    filteredActions.map(action => (
                      <button
                        key={action.id}
                        onClick={() => handleSelect(action.to)}
                        className={`w-full flex items-center gap-3 p-3 rounded-xl text-left transition-colors ${
                          isDark ? 'hover:bg-space-800' : 'hover:bg-gray-50'
                        }`}
                      >
                        <div className={`p-2 rounded-lg ${isDark ? 'bg-space-800' : 'bg-gray-100'}`}>
                          <action.icon className="w-4 h-4 text-gray-400" />
                        </div>
                        <div>
                          <h4 className={`text-sm font-semibold ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>{action.label}</h4>
                          <p className={`text-[10px] ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>{action.desc}</p>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </div>
            </motion.div>
          </div>,
          document.body
        )}
      </AnimatePresence>
    </>
  )
}
