import { useState, useEffect, useRef, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { 
  Search, Sparkles, Megaphone, UserPlus, 
  ShoppingCart, Bot, MessageSquare, X, Wrench,
  BarChart3, FileBarChart, HelpCircle,
  FileText, Workflow, Zap, BookOpen, Package, 
  Briefcase, Target, Wallet, Settings, Users, Activity,
  LayoutDashboard, Bell, Radio
} from 'lucide-react'
import { useTheme } from '../../contexts/ThemeContext'
import { useModuleAvailability } from '../../hooks/useModuleAvailability'
import { createPortal } from 'react-dom'
import { useLocation } from 'react-router-dom'
import api from '../../services/api'
import toast from 'react-hot-toast'

const ACTIONS = [
  // ─── PRINCIPAL ───
  { id: 'dashboard', category: 'Principal', icon: LayoutDashboard, label: 'Tableau de bord', desc: 'Retourner à l\'accueil', to: '/dashboard' },
  { id: 'notifications', category: 'Principal', icon: Bell, label: 'Mes notifications', desc: 'Voir les alertes récentes', to: '/dashboard/notifications' },
  { id: 'message', category: 'Principal', icon: MessageSquare, label: 'Boîte de réception', desc: 'Ouvrir les conversations', to: '/dashboard/conversations' },
  { id: 'campaign', category: 'Principal', icon: Megaphone, label: 'Lancer une campagne', desc: 'Envoyer des messages groupés', to: '/dashboard/campaigns' },
  { id: 'templates', category: 'Principal', icon: FileText, label: 'Modèles de messages', desc: 'Réponses rapides enregistrées', to: '/dashboard/templates' },
  
  // ─── CRM & VENTES ───
  { id: 'contact', category: 'CRM & Ventes', icon: UserPlus, label: 'Mes contacts (Leads)', desc: 'Gérer vos prospects clients', to: '/dashboard/leads', module: 'leads' },
  { id: 'services', category: 'CRM & Ventes', icon: Briefcase, label: 'Catalogue services', desc: 'Gérer vos prestations', to: '/dashboard/services' },
  { id: 'product', category: 'CRM & Ventes', icon: Package, label: 'Mon catalogue produits', desc: 'Gérer vos articles physiques', to: '/dashboard/products' },
  { id: 'deals', category: 'CRM & Ventes', icon: Target, label: 'Suivi des deals', desc: 'Opportunités commerciales', to: '/dashboard/deals' },
  { id: 'orders', category: 'CRM & Ventes', icon: ShoppingCart, label: 'Toutes les commandes', desc: 'Suivre les achats clients', to: '/dashboard/orders' },
  
  // ─── INTELLIGENCE ARTIFICIELLE ───
  { id: 'agent', category: 'Intelligence Artificielle', icon: Bot, label: 'Gérer mes équipes IA', desc: 'Configurer vos assistantes IA', to: '/dashboard/agents' },
  { id: 'knowledge', category: 'Intelligence Artificielle', icon: BookOpen, label: 'Base de connaissance', desc: 'Apprendre des choses à l\'IA', to: '/dashboard/knowledge', module: 'knowledgeBase' },
  { id: 'flows', category: 'Intelligence Artificielle', icon: Workflow, label: 'Leur comportement (Flows)', desc: 'Scénarios de réponse', to: '/dashboard/flows', module: 'flows' },
  { id: 'workflows', category: 'Intelligence Artificielle', icon: Zap, label: 'Règles automatiques', desc: 'Actions programmées', to: '/dashboard/workflows' },
  
  // ─── PERFORMANCE & CHIFFRES ───
  { id: 'analytics', category: 'Performance & Chiffres', icon: BarChart3, label: 'Statistiques & Analytics', desc: 'Analyse des performances', to: '/dashboard/analytics', module: 'analytics' },
  { id: 'expenses', category: 'Performance & Chiffres', icon: Wallet, label: 'Mes dépenses', desc: 'Gestion du budget', to: '/dashboard/expenses' },
  { id: 'reports', category: 'Performance & Chiffres', icon: FileBarChart, label: 'Générer un bilan', desc: 'Rapports PDF complets', to: '/dashboard/reports', module: 'reports' },
  
  // ─── CONFIGURATION & SUPPORT ───
  { id: 'tools', category: 'Configuration & Support', icon: Wrench, label: 'Téléphones (WhatsApp)', desc: 'Connecter un nouveau numéro', to: '/dashboard/tools' },
  { id: 'repair', category: 'Configuration & Support', icon: Radio, label: 'Statuts des connexions', desc: 'Vérifier la santé des numéros', to: '/dashboard/whatsapp-status', module: 'whatsappStatus' },
  { id: 'settings', category: 'Configuration & Support', icon: Settings, label: 'Mon compte & Profil', desc: 'Paramètres personnels', to: '/dashboard/settings' },
  { id: 'team', category: 'Configuration & Support', icon: Users, label: 'Gérer mon équipe', desc: 'Ajouter des collaborateurs', to: '/dashboard/team' },
  { id: 'logs', category: 'Configuration & Support', icon: Activity, label: 'Journal d\'activité', desc: 'Historique technique', to: '/dashboard/logs' },
  { id: 'help', category: 'Configuration & Support', icon: HelpCircle, label: 'Besoin d\'aide ?', desc: 'Support et documentation', to: '/dashboard/help' },
]

export default function GlobalAIAssistantModal({ isOpen, onClose }) {
  const [query, setQuery] = useState('')
  const { isDark } = useTheme()
  const navigate = useNavigate()
  const location = useLocation()
  const inputRef = useRef(null)
  const [activeIndex, setActiveIndex] = useState(0)
  const [isExecuting, setIsExecuting] = useState(false)
  const [magicAction, setMagicAction] = useState(null)
  const [records, setRecords] = useState({ products: [], leads: [], agents: [] })
  const [isLoadingRecords, setIsLoadingRecords] = useState(false)

  useEffect(() => {
    if (isOpen) {
      if (inputRef.current) setTimeout(() => inputRef.current.focus(), 100)
      fetchRecords()
    } else {
      setQuery('')
      setActiveIndex(0)
    }
  }, [isOpen])

  const fetchRecords = async () => {
    setIsLoadingRecords(true)
    try {
      const [prodRes, leadRes, agentRes] = await Promise.all([
        api.get('/products').catch(() => ({ data: { products: [] } })),
        api.get('/leads').catch(() => ({ data: { leads: [] } })),
        api.get('/agents').catch(() => ({ data: { agents: [] } }))
      ])
      setRecords({
        products: prodRes.data.products || [],
        leads: leadRes.data.leads || [],
        agents: agentRes.data.agents || []
      })
    } catch (e) {
      console.error("Failed to fetch records for search", e)
    } finally {
      setIsLoadingRecords(false)
    }
  }

  // Intent Analyzer (Simple Client-side logic for "Actions")
  useEffect(() => {
    const q = query.trim().toLowerCase();
    if (q.length < 3) {
      setMagicAction(null);
      return;
    }

    // Intent: Create Product
    const productMatch = q.match(/(?:créer|ajouter|nouveau|vendre)\s+(?:le\s+|un\s+)?produit\s+(.+?)(?:\s+à\s+(\d+)(?:\s*(?:fcfa|xof|f|cfa))?)?$/i);
    if (productMatch) {
      let name = productMatch[1].trim().replace(/^["'](.+)["']$/g, '$1');
      const price = productMatch[2] || "";
      setMagicAction({
        id: 'magic-product',
        type: 'product',
        label: `📦 Créer le produit "${name}"`,
        desc: price ? `Prix : ${price} FCFA` : "Ajouter instantanément au catalogue",
        data: { name, price }
      });
      return;
    }

    // Intent: Create Lead (Contact)
    const leadMatch = q.match(/(?:ajouter|créer|nouveau)\s+(?:le\s+|un\s+)?contact\s+([^0-9\s]+)(?:\s+(?:au|tel|num|numéro)?\s*(\d+))?$/i);
    if (leadMatch) {
       let name = leadMatch[1].trim().replace(/^["'](.+)["']$/g, '$1');
       const phone = leadMatch[2] || "";
       setMagicAction({
         id: 'magic-lead',
         type: 'lead',
         label: `👤 Ajouter le contact "${name}"`,
         desc: phone ? `Téléphone : ${phone}` : "Enregistrer dans le CRM",
         data: { name, phone }
       });
       return;
    }

    setMagicAction(null);
  }, [query]);

  const availability = useModuleAvailability()

  // Highlighting utility
  const highlightMatch = (text, query) => {
    if (!query.trim()) return text;
    const parts = text.split(new RegExp(`(${query})`, 'gi'));
    return (
      <span>
        {parts.map((part, i) => 
          part.toLowerCase() === query.toLowerCase() 
            ? <b key={i} className="text-gold-400 font-extrabold">{part}</b> 
            : part
        )}
      </span>
    );
  };

  const filteredActions = useMemo(() => {
    const q = query.toLowerCase().trim();
    const matches = ACTIONS.filter(a => {
      if (a.module && !availability[a.module]) return false;
      return a.label.toLowerCase().includes(q) || a.desc.toLowerCase().includes(q);
    });

    // Prioritize actions based on current location
    const currentPath = location.pathname;
    return matches.sort((a, b) => {
      const aMatch = a.to === currentPath;
      const bMatch = b.to === currentPath;
      if (aMatch && !bMatch) return -1;
      if (!aMatch && bMatch) return 1;
      return 0;
    });
  }, [query, availability, location.pathname]);

  const filteredRecords = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return { products: [], leads: [], agents: [] };

    return {
      products: records.products.filter(p => p.name.toLowerCase().includes(q)).slice(0, 3),
      leads: records.leads.filter(l => l.name.toLowerCase().includes(q)).slice(0, 3),
      agents: records.agents.filter(a => a.name.toLowerCase().includes(q)).slice(0, 3)
    };
  }, [query, records]);

  const totalFilteredRecords = filteredRecords.products.length + filteredRecords.leads.length + filteredRecords.agents.length;

  const handleSelect = (to) => {
    navigate(to)
    onClose()
  }

  const handleMagicAction = async () => {
    if (!magicAction || isExecuting) return;
    
    setIsExecuting(true);
    const loadingToast = toast.loading("L'IA prépare votre action...");

    try {
      if (magicAction.type === 'product') {
        const { name, price } = magicAction.data;
        await api.post('/products', {
          name,
          price: parseFloat(price) || 0,
          description: `Produit créé par commande rapide IA`,
          status: 'active'
        });
        toast.success(`Produit "${name}" créé avec succès !`, { id: loadingToast });
      } else if (magicAction.type === 'lead') {
        const { name, phone } = magicAction.data;
        await api.post('/leads', {
          name,
          phone: phone || null,
          source: 'AI Assistant',
          status: 'new'
        });
        toast.success(`Contact "${name}" ajouté !`, { id: loadingToast });
      }
      
      setQuery('');
      setMagicAction(null);
      // Optionnel: On pourrait rediriger, mais rester ici pour d'autres actions est mieux
      onClose();
    } catch (error) {
      console.error("Action error:", error);
      toast.error("Oups, je n'ai pas pu finaliser l'action automatique.", { id: loadingToast });
    } finally {
      setIsExecuting(false);
    }
  }

  const handleAskAI = () => {
    let initialData = { productName: query }

    // If we already parsed it for Magic Action, use that better data
    if (magicAction?.type === 'product') {
      initialData = { 
        productName: magicAction.data.name, 
        productPrice: magicAction.data.price 
      }
    } else if (magicAction?.type === 'lead') {
      initialData = {
        leadName: magicAction.data.name,
        leadPhone: magicAction.data.phone
      }
    } else {
      // One-off try to extract just the name if it looks like a command
      const cleanName = query.replace(/^(crée|ajouter|nouveau|vendre)\s+(le\s+|un\s+)?produit\s+/i, '')
                           .replace(/\s+à\s+\d+.*$/i, '')
                           .replace(/^["'](.+)["']$/g, '$1')
                           .trim();
      if (cleanName && cleanName.length < query.length) {
        initialData.productName = cleanName;
      }
    }

    window.dispatchEvent(new CustomEvent('seven-t:open-assisted-config', { 
      detail: { initialData } 
    }));
    onClose();
  }

  const handleKeyDown = (e) => {
    const hasMagic = !!magicAction;
    const hasAskAI = !!query.trim();
    
    let totalItems = filteredActions.length + totalFilteredRecords;
    if (hasAskAI) totalItems += 1;
    if (hasMagic) totalItems += 1;
    
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex(prev => (prev + 1) % totalItems);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex(prev => (prev - 1 + totalItems) % totalItems);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      
      let currentIdx = 0;
      
      // Check Magic Action
      if (hasMagic) {
        if (activeIndex === currentIdx) {
          handleMagicAction();
          return;
        }
        currentIdx++;
      }
      
      // Check Ask AI
      if (hasAskAI) {
        if (activeIndex === currentIdx) {
          handleAskAI();
          return;
        }
        currentIdx++;
      }
      
      // Check Filtered Actions
      const actionIdx = activeIndex - currentIdx;
      if (filteredActions[actionIdx]) {
        handleSelect(filteredActions[actionIdx].to);
      } else if (query.trim()) {
        handleAskAI();
      }
    } else if (e.key === 'Escape') {
      onClose();
    }
  }

  if (!isOpen) return null

  return createPortal(
    <div className="fixed inset-0 z-[999] flex items-start justify-center pt-[10vh] sm:pt-[15vh]">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
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
            onKeyDown={handleKeyDown}
            placeholder="Que voulez-vous faire ?"
            className={`flex-1 bg-transparent border-none outline-none text-lg ${
              isDark ? 'text-white placeholder-gray-500' : 'text-gray-900 placeholder-gray-400'
            }`}
          />
          <button onClick={onClose} className={`p-1 rounded-md ${isDark ? 'hover:bg-space-800' : 'hover:bg-gray-100'}`}>
            <X className="w-4 h-4 text-gray-400" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto max-h-[60vh] custom-scrollbar p-2">
          {/* Section: Magic Action (Intent detected) */}
          {magicAction && (
             <div className="px-1 mb-4">
                <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-500 mb-2 px-3">Suggestion Magique ✨</p>
                <button 
                  onClick={handleMagicAction}
                  disabled={isExecuting}
                  className={`w-full flex items-center gap-3 p-4 rounded-2xl text-left border transition-all group ${
                    activeIndex === 0 
                      ? 'bg-emerald-500/20 border-emerald-500/30 ring-2 ring-emerald-500/20' 
                      : 'bg-emerald-500/5 border-emerald-500/10'
                  } hover:bg-emerald-500/20 disabled:opacity-50`}
                >
                    <div className={`p-2.5 rounded-xl transition-colors ${activeIndex === 0 ? 'bg-emerald-500/40' : 'bg-emerald-500/20'} group-hover:bg-emerald-500/30`}>
                      <Sparkles className="w-5 h-5 text-emerald-400" />
                    </div>
                    <div className="flex-1">
                        <p className={`text-sm font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{magicAction.label}</p>
                        <p className={`text-xs ${isDark ? 'text-emerald-500/70' : 'text-emerald-600/70'}`}>{magicAction.desc}</p>
                    </div>
                    {isExecuting && <div className="animate-spin rounded-full h-4 w-4 border-2 border-emerald-500 border-t-transparent" />}
                </button>
             </div>
          )}

          {/* Section: AI Assistance */}
          {query.trim() && (
             <div className="px-1 mb-4">
                <p className="text-[10px] font-bold uppercase tracking-widest text-gold-400 mb-2 px-3">Génération IA</p>
                <button 
                  onClick={handleAskAI}
                  className={`w-full flex items-center gap-3 p-3 rounded-lg text-left transition-all group border ${
                    activeIndex === (magicAction ? 1 : 0) 
                      ? 'bg-gold-400/20 border-gold-400/30' 
                      : 'bg-gradient-to-r from-gold-400/10 to-amber-500/10 border-gold-400/20'
                  } hover:from-gold-400/20 hover:to-amber-500/20`}
                >
                    <div className={`p-2 rounded-lg transition-colors ${activeIndex === (magicAction ? 1 : 0) ? 'bg-gold-400/40' : 'bg-gold-400/20'} group-hover:bg-gold-400/30`}>
                      <Sparkles className="w-5 h-5 text-gold-400" />
                    </div>
                    <div>
                        <p className={`text-sm font-semibold ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>"{query}"</p>
                        <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>Demander à l'assistant de configurer ça pour vous</p>
                    </div>
                 </button>
             </div>
          )}

          <div className="px-1 pb-4">
            {filteredActions.length === 0 && !magicAction && totalFilteredRecords === 0 ? (
              <div className="py-12 text-center">
                 <div className={`w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center ${isDark ? 'bg-space-800' : 'bg-gray-100'}`}>
                    <Search className="w-8 h-8 text-gray-500" />
                 </div>
                 <p className="text-sm text-gray-500">Aucune action ou donnée trouvée pour "{query}"</p>
              </div>
            ) : (
              <>
                {/* Actions Section */}
                {filteredActions.reduce((acc, action, idx) => {
                  const showCategory = !query.trim() && (idx === 0 || action.category !== filteredActions[idx - 1].category);
                  if (showCategory) {
                    acc.push(
                      <p key={`cat-${action.category}`} className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-2 mt-4 px-3 first:mt-1">
                        {action.category}
                      </p>
                    );
                  }
                  const itemIdx = idx + (query.trim() ? 1 : 0) + (magicAction ? 1 : 0);
                  acc.push(
                    <button
                      key={action.id}
                      onClick={() => handleSelect(action.to)}
                      className={`w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all ${
                        itemIdx === activeIndex
                          ? (isDark ? 'bg-space-800 ring-1 ring-white/10 shadow-lg' : 'bg-gray-100 ring-1 ring-black/5 shadow-md')
                          : (isDark ? 'hover:bg-space-800/50' : 'hover:bg-gray-50')
                      }`}
                    >
                      <div className={`p-2 rounded-lg flex-shrink-0 transition-colors ${
                        itemIdx === activeIndex 
                          ? (isDark ? 'bg-space-700' : 'bg-white') 
                          : (isDark ? 'bg-space-800' : 'bg-gray-100')
                      }`}>
                        <action.icon className={`w-4 h-4 transition-colors ${
                          itemIdx === activeIndex ? 'text-gold-400' : 'text-gray-400'
                        }`} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4 className={`text-sm font-semibold truncate ${
                          itemIdx === activeIndex ? (isDark ? 'text-white' : 'text-gray-900') : (isDark ? 'text-gray-200' : 'text-gray-800')
                        }`}>{highlightMatch(action.label, query)}</h4>
                        <p className={`text-[10px] truncate ${
                          itemIdx === activeIndex ? 'text-gray-400' : 'text-gray-500'
                        }`}>{highlightMatch(action.desc, query)}</p>
                      </div>
                    </button>
                  );
                  return acc;
                }, [])}

                {/* Records Section: Products */}
                {filteredRecords.products.length > 0 && (
                  <div className="mt-4">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-2 px-3">Produits du catalogue</p>
                    {filteredRecords.products.map((p, i) => {
                      const itemIdx = filteredActions.length + i + (query.trim() ? 1 : 0) + (magicAction ? 1 : 0);
                      return (
                        <button
                          key={p.id}
                          onClick={() => handleSelect(`/dashboard/products?id=${p.id}`)}
                          className={`w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all ${
                            itemIdx === activeIndex ? (isDark ? 'bg-space-800 shadow-lg' : 'bg-gray-100 shadow-md') : 'hover:bg-space-800/20'
                          }`}
                        >
                          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                            <Package className="w-4 h-4 text-emerald-400" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-200">{highlightMatch(p.name, query)}</p>
                            <p className="text-[10px] text-gray-500">{p.price} FCFA — Stock: {p.stock}</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Records Section: Leads */}
                {filteredRecords.leads.length > 0 && (
                  <div className="mt-4">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-2 px-3">Contacts CRM</p>
                    {filteredRecords.leads.map((l, i) => {
                      const itemIdx = filteredActions.length + filteredRecords.products.length + i + (query.trim() ? 1 : 0) + (magicAction ? 1 : 0);
                      return (
                        <button
                          key={l.id}
                          onClick={() => handleSelect(`/dashboard/leads?id=${l.id}`)}
                          className={`w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all ${
                            itemIdx === activeIndex ? (isDark ? 'bg-space-800 shadow-lg' : 'bg-gray-100 shadow-md') : 'hover:bg-space-800/20'
                          }`}
                        >
                          <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                            <UserPlus className="w-4 h-4 text-blue-400" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-200">{highlightMatch(l.name, query)}</p>
                            <p className="text-[10px] text-gray-500">{l.phone || 'Pas de numéro'}</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Records Section: Agents */}
                {filteredRecords.agents.length > 0 && (
                  <div className="mt-4">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-2 px-3">Assistantes IA</p>
                    {filteredRecords.agents.map((a, i) => {
                      const itemIdx = filteredActions.length + filteredRecords.products.length + filteredRecords.leads.length + i + (query.trim() ? 1 : 0) + (magicAction ? 1 : 0);
                      return (
                        <button
                          key={a.id}
                          onClick={() => handleSelect(`/dashboard/agents?id=${a.id}`)}
                          className={`w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all ${
                            itemIdx === activeIndex ? (isDark ? 'bg-space-800 shadow-lg' : 'bg-gray-100 shadow-md') : 'hover:bg-space-800/20'
                          }`}
                        >
                          <div className="w-8 h-8 rounded-lg bg-gold-400/10 flex items-center justify-center">
                            <Bot className="w-4 h-4 text-gold-400" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-200">{highlightMatch(a.name, query)}</p>
                            <p className="text-[10px] text-gray-500">{a.role || 'Agent IA'}</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Footer: Shortcuts */}
        <div className={`px-4 py-2 border-t ${isDark ? 'border-white/5 text-gray-600' : 'border-gray-100 text-gray-400'} flex items-center justify-between text-[10px] font-bold uppercase tracking-widest`}>
           <div className="flex items-center gap-4">
             <span className="flex items-center gap-1"><kbd className="px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-gray-400">↑↓</kbd> Naviguer</span>
             <span className="flex items-center gap-1"><kbd className="px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-gray-400">↵</kbd> Valider</span>
           </div>
           <div className="flex items-center gap-1">
             <kbd className="px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-gray-400">esc</kbd> Fermer
           </div>
        </div>
      </motion.div>
    </div>,
    document.body
  )
}
