import { useState, useEffect, useRef, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import api from '../services/api'
import { useOnboardingTour } from '../components/Onboarding'
import { useConfirm } from '../contexts/ConfirmContext'
import { useTheme } from '../contexts/ThemeContext'
import { useLockBodyScroll } from '../hooks/useLockBodyScroll'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  BookOpen, 
  Plus, 
  Search, 
  FileText,
  Globe,
  Video,
  Trash2,
  X,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Upload,
  Loader2,
  Database,
  Link2,
  Copy,
  Check,
  RefreshCw,
  Edit3,
  Filter,
  ArrowRight,
  Info,
  Calendar,
  Sparkles,
  LayoutGrid,
  List as ListIcon,
  Clock,
  ChevronRight
} from 'lucide-react'
import toast from 'react-hot-toast'

// Utility to get consistent icon colors based on type
const getTypeColor = (type, isDark) => {
  switch (type) {
    case 'pdf': return isDark ? 'text-red-400' : 'text-red-600';
    case 'youtube': return isDark ? 'text-red-500' : 'text-red-700';
    case 'website': return isDark ? 'text-blue-400' : 'text-blue-600';
    default: return isDark ? 'text-gold-400' : 'text-gold-600';
  }
}

const getTypeLabel = (type) => {
  switch (type) {
    case 'pdf': return 'PDF'
    case 'youtube': return 'YouTube'
    case 'website': return 'Site web'
    default: return 'Texte'
  }
}

// Icon for knowledge types
const KnowledgeTypeIcon = ({ type, className = "w-5 h-5", isDark }) => {
  const colorClass = getTypeColor(type, isDark);
  switch (type) {
    case 'pdf':
      return <FileText className={`${className} ${colorClass}`} />
    case 'youtube':
      return <Video className={`${className} ${colorClass}`} />
    case 'website':
      return <Globe className={`${className} ${colorClass}`} />
    default:
      return <FileText className={`${className} ${colorClass}`} />
  }
}

export default function KnowledgeBase() {
  const { t } = useTranslation()
  const { startTour, completedTours } = useOnboardingTour()
  const { showConfirm } = useConfirm()
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [viewMode, setViewMode] = useState('grid') // 'grid' or 'list'
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingItem, setEditingItem] = useState(null)
  const [expandedItem, setExpandedItem] = useState(null)

  useEffect(() => {
    loadKnowledge()
  }, [])

  useEffect(() => {
    if (!completedTours.includes('add_knowledge')) {
      startTour('add_knowledge')
    }
  }, [completedTours, startTour])

  const loadKnowledge = async () => {
    setLoadError(null)
    setLoading(true)
    try {
      const response = await api.get('/knowledge/global')
      setItems(response.data.items || [])
    } catch (error) {
      const message = error.response?.data?.error || error.message || 'Erreur de chargement'
      setLoadError(message)
      console.error('Error loading knowledge:', error)
      toast.error('Erreur lors du chargement')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id) => {
    const ok = await showConfirm({
      title: 'Supprimer l\'élément',
      message: 'Supprimer définitivement cet élément de la base de connaissances ?',
      variant: 'danger',
      confirmLabel: 'Supprimer'
    })
    if (!ok) return
    try {
      await api.delete(`/knowledge/${id}`)
      toast.success('Élément supprimé')
      loadKnowledge()
    } catch (error) {
      toast.error('Erreur lors de la suppression')
    }
  }

  const filteredItems = useMemo(() => {
    return items.filter(item => {
      const matchesSearch = item.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           item.content?.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesType = typeFilter === 'all' || item.type === typeFilter
      return matchesSearch && matchesType
    })
  }, [items, searchQuery, typeFilter])

  // Stats
  const stats = useMemo(() => ({
    total: items.length,
    text: items.filter(i => i.type === 'text').length,
    pdf: items.filter(i => i.type === 'pdf').length,
    youtube: items.filter(i => i.type === 'youtube').length,
    website: items.filter(i => i.type === 'website').length,
    totalChars: items.reduce((sum, i) => sum + (i.content?.length || 0), 0)
  }), [items])

  const emptyStateImage = "/home/styapo/.gemini/antigravity/brain/49851c83-10b6-4846-b0d6-b6a4c8496585/knowledge_base_empty_state_premium_1773417080252.png";

  return (
    <div className="max-w-7xl mx-auto w-full space-y-8 px-4 sm:px-6 pb-20">
      {/* Platform-Aligned Header */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className={`relative overflow-hidden rounded-[2.5rem] border p-8 sm:p-12 mb-8 ${
          isDark 
          ? 'bg-gradient-to-br from-space-800 via-space-900 to-space-800 border-space-700/50' 
          : 'bg-gradient-to-br from-gray-50 via-white to-gray-50 border-gray-200 shadow-sm'
        }`}
      >
        {/* Pattern Overlay following index.css logic */}
        <div className="absolute inset-0 opacity-20 pointer-events-none" 
             style={{ backgroundImage: `url("data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiM2NDc0OGIiIGZpbGwtb3BhY2l0eT0iMC4xIj48Y2lyY2xlIGN4PSIzMCIgY3k9IjMwIiByPSIyIi8+PC9nPjwvZz48L3N2Zz4=")` }} />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
          <div className="space-y-4 max-w-2xl">
            <div className={`inline-flex items-center gap-3 px-4 py-1.5 rounded-full border backdrop-blur-md ${
              isDark ? 'bg-gold-400/10 border-gold-400/20' : 'bg-gold-50 border-gold-200'
            }`}>
              <Sparkles className="w-4 h-4 text-gold-400" />
              <span className={`text-sm font-semibold tracking-wider uppercase ${isDark ? 'text-gold-300' : 'text-gold-600'}`}>Base de Connaissances</span>
            </div>
            <h1 className={`text-4xl sm:text-5xl lg:text-6xl font-display font-bold leading-[1.1] ${isDark ? 'text-white' : 'text-gray-900'}`}>
              Le moteur de vos <span className="text-gradient">Agents SEVEN T</span>
            </h1>
            <p className={`text-lg max-w-xl leading-relaxed ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              Importez vos documents pour donner à vos agents une expertise métier. Ils utiliseront ces données pour répondre avec précision à vos clients.
            </p>
          </div>

          <div className="flex flex-col gap-4 min-w-[240px]">
            <button
              onClick={() => setShowAddModal(true)}
              className="btn-primary flex items-center justify-center gap-3 shadow-xl"
            >
              <Plus className="w-5 h-5" />
              <span>Nouveau contenu</span>
            </button>
            <div className={`flex items-center justify-center gap-6 px-4 py-3 border rounded-2xl ${
              isDark ? 'bg-space-950/50 border-space-700/50 backdrop-blur-md' : 'bg-white border-gray-100 shadow-sm'
            }`}>
              <div className="text-center">
                <p className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{stats.total}</p>
                <p className={`text-[10px] uppercase font-bold tracking-wider ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Documents</p>
              </div>
              <div className={`w-px h-10 ${isDark ? 'bg-space-700' : 'bg-gray-100'}`} />
              <div className="text-center">
                <p className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{(stats.totalChars / 1000).toFixed(1)}k</p>
                <p className={`text-[10px] uppercase font-bold tracking-wider ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Caractères</p>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Control Bar - Using platform variables */}
      <div className={`flex flex-col lg:flex-row gap-4 items-center justify-between sticky top-4 z-40 p-3 border rounded-3xl shadow-xl transition-all ${
        isDark ? 'bg-space-950/90 border-space-700/50 backdrop-blur-xl' : 'bg-white/95 border-gray-200 backdrop-blur-xl shadow-gray-200/50'
      }`}>
        <div className="relative w-full lg:max-w-md group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 group-focus-within:text-gold-400 transition-colors" />
          <input
            type="text"
            placeholder="Rechercher une expertise..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`w-full rounded-2xl pl-12 pr-4 py-3 text-base transition-all outline-none focus:ring-2 ${
              isDark 
              ? 'bg-space-900 border-space-700 text-white placeholder:text-gray-600 focus:ring-gold-400/20' 
              : 'bg-gray-50 border-gray-200 text-gray-900 placeholder:text-gray-400 focus:ring-gold-400/10'
            }`}
          />
        </div>

        <div className="flex items-center gap-2 w-full lg:w-auto overflow-x-auto pb-1 sm:pb-0 scrollbar-hide">
          <div className={`flex items-center p-1 border rounded-2xl mr-2 ${isDark ? 'bg-space-900 border-space-700' : 'bg-gray-50 border-gray-100'}`}>
            <button 
              onClick={() => setViewMode('grid')}
              className={`p-2.5 rounded-xl transition-all ${viewMode === 'grid' ? (isDark ? 'bg-space-700 text-gold-400' : 'bg-white text-gold-600 shadow-sm') : 'text-gray-500 hover:text-gray-300'}`}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button 
              onClick={() => setViewMode('list')}
              className={`p-2.5 rounded-xl transition-all ${viewMode === 'list' ? (isDark ? 'bg-space-700 text-gold-400' : 'bg-white text-gold-600 shadow-sm') : 'text-gray-500 hover:text-gray-300'}`}
            >
              <ListIcon className="w-4 h-4" />
            </button>
          </div>

          <div className={`h-8 w-px mx-2 ${isDark ? 'bg-space-700' : 'bg-gray-200'}`} />

          {['all', 'text', 'pdf', 'youtube', 'website'].map((type) => (
            <button
              key={type}
              onClick={() => setTypeFilter(type)}
              className={`whitespace-nowrap px-4 py-2.5 rounded-2xl text-sm font-semibold transition-all border ${
                typeFilter === type 
                ? (isDark ? 'bg-gold-400/10 text-gold-400 border-gold-400/30' : 'bg-gold-50 text-gold-600 border-gold-200') 
                : (isDark ? 'text-gray-500 hover:text-gray-300 border-transparent hover:bg-space-900' : 'text-gray-500 hover:text-gray-700 border-transparent hover:bg-gray-50')
              }`}
            >
              {type === 'all' ? 'Tout voir' : getTypeLabel(type)}
            </button>
          ))}
        </div>
      </div>

      {/* Content Area */}
      {loadError ? (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className={`flex flex-col items-center justify-center p-12 rounded-[2.5rem] border text-center ${
            isDark ? 'bg-rose-500/5 border-rose-500/20' : 'bg-rose-50 border-rose-100'
          }`}
        >
          <div className="w-16 h-16 bg-rose-500/10 rounded-2xl flex items-center justify-center mb-6">
            <Info className="w-8 h-8 text-rose-500" />
          </div>
          <h3 className={`text-xl font-bold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>Impossible de charger la base</h3>
          <p className="text-gray-500 mb-8 max-w-sm">{loadError}</p>
          <button onClick={loadKnowledge} className="btn-secondary">Réessayer maintenant</button>
        </motion.div>
      ) : loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1,2,3,4,5,6].map(i => (
            <div key={i} className={`h-64 rounded-[2.5rem] border animate-pulse ${isDark ? 'bg-space-800 border-space-700/50' : 'bg-gray-100 border-gray-200'}`} />
          ))}
        </div>
      ) : filteredItems.length === 0 ? (
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className={`relative flex flex-col items-center justify-center py-20 px-6 rounded-[3rem] border border-dashed text-center ${
            isDark ? 'bg-space-900 border-space-700/50' : 'bg-gray-50 border-gray-200'
          }`}
        >
          <img src={emptyStateImage} alt="Base vide" className="w-full max-w-md h-auto mb-10 mix-blend-screen opacity-80" />
          <h3 className={`text-3xl font-display font-bold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>Votre base est prête à apprendre</h3>
          <p className="text-gray-500 mb-8 max-w-md">Importez vos premiers documents pour donner vie à vos agents IA. Ils pourront s'en servir pour répondre avec précision.</p>
          <button onClick={() => setShowAddModal(true)} className="btn-primary flex items-center gap-3">
            <Plus className="w-5 h-5" />
            <span>Commencer l'importation</span>
          </button>
        </motion.div>
      ) : (
        <div className={viewMode === 'grid' ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" : "space-y-4"}>
          <AnimatePresence mode='popLayout'>
            {filteredItems.map((item, index) => (
              <KnowledgeCard 
                key={item.id} 
                item={item} 
                index={index}
                viewMode={viewMode}
                onEdit={() => setEditingItem(item)}
                onDelete={() => handleDelete(item.id)}
                isExpanded={expandedItem === item.id}
                onToggleExpand={() => setExpandedItem(expandedItem === item.id ? null : item.id)}
                isDark={isDark}
              />
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Modals */}
      <AnimatePresence>
        {(showAddModal || editingItem) && (
          <KnowledgeModal
            item={editingItem}
            onClose={() => {
              setShowAddModal(false)
              setEditingItem(null)
            }}
            onSaved={() => {
              setShowAddModal(false)
              setEditingItem(null)
              loadKnowledge()
            }}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

function KnowledgeCard({ item, index, viewMode, onEdit, onDelete, isExpanded, onToggleExpand, isDark }) {
  const metadata = typeof item.metadata === 'string' ? JSON.parse(item.metadata || '{}') : (item.metadata || {})
  
  const cardClasses = isDark 
    ? 'bg-space-900 border-space-700/50 hover:border-gold-400/30' 
    : 'bg-white border-gray-100 hover:border-gold-200 shadow-sm hover:shadow-md';

  if (viewMode === 'list') {
    return (
      <motion.div
        layout
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        className={`group relative p-4 rounded-2xl border transition-all duration-300 ${cardClasses}`}
      >
        <div className="flex items-center gap-4">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${isDark ? 'bg-space-950' : 'bg-gray-50'}`}>
            <KnowledgeTypeIcon type={item.type} className="w-6 h-6" isDark={isDark} />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className={`font-bold truncate ${isDark ? 'text-white' : 'text-gray-900'}`}>{item.title}</h3>
            <div className="flex items-center gap-3 mt-1">
              <span className={`text-[10px] uppercase font-bold tracking-wider ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>
                {getTypeLabel(item.type)}
              </span>
              <span className="text-[10px] text-gray-700">•</span>
              <span className={`text-[10px] ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>
                {(item.content?.length || 0).toLocaleString()} caractères
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={onEdit} className="p-2 text-gray-500 hover:text-gold-500 transition-colors"><Edit3 className="w-4 h-4" /></button>
            <button onClick={onDelete} className="p-2 text-gray-500 hover:text-rose-500 transition-colors"><Trash2 className="w-4 h-4" /></button>
            <div className={`w-px h-6 mx-1 ${isDark ? 'bg-space-700' : 'bg-gray-100'}`} />
            <button onClick={onToggleExpand} className="p-2 text-gold-500 hover:text-gold-400">
              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <AnimatePresence>
          {isExpanded && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} className="mt-4 p-4 rounded-xl bg-black/5 border border-black/5">
              <pre className={`text-sm whitespace-pre-wrap font-sans max-h-60 overflow-y-auto custom-scrollbar ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                {item.content}
              </pre>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    )
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ y: -4 }}
      className={`group relative flex flex-col h-full overflow-hidden rounded-[2.5rem] border transition-all duration-300 ${cardClasses}`}
    >
      <div className="p-8 flex-1 flex flex-col space-y-5">
        <div className="flex items-start justify-between">
          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110 duration-500 border shadow-sm ${
            isDark ? 'bg-space-950 border-space-700/50' : 'bg-gray-50 border-gray-100'
          }`}>
            <KnowledgeTypeIcon type={item.type} className="w-7 h-7" isDark={isDark} />
          </div>
          <div className="flex items-center gap-1">
            <button onClick={onEdit} className="p-2.5 rounded-xl text-gray-500 hover:text-gold-500 hover:bg-gold-500/5">
              <Edit3 className="w-4 h-4" />
            </button>
            <button onClick={onDelete} className="p-2.5 rounded-xl text-gray-500 hover:text-rose-500 hover:bg-rose-500/5">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="space-y-2">
          <h3 className={`text-xl font-bold line-clamp-2 leading-snug ${isDark ? 'text-white' : 'text-gray-900'}`}>{item.title}</h3>
          <div className={`text-[10px] font-bold tracking-[0.2em] uppercase ${isDark ? 'text-gold-400' : 'text-gold-600'}`}>{getTypeLabel(item.type)}</div>
        </div>

        <p className={`text-sm line-clamp-3 leading-relaxed ${isDark ? 'text-gray-500' : 'text-gray-600'}`}>{item.content}</p>

        {metadata?.sourceUrl && (
          <a href={metadata.sourceUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-xs text-gold-500 hover:text-gold-400 font-bold">
            <Link2 className="w-3 h-3" />
            Consulter la source
            <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
          </a>
        )}
      </div>

      <div className={`px-8 py-5 border-t flex items-center justify-between ${isDark ? 'bg-space-950/20 border-space-700/50' : 'bg-gray-50 border-gray-100'}`}>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 ">
            <Database className="w-3 h-3 text-gray-500" />
            <span className={`text-[10px] font-bold ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>{(item.content?.length || 0).toLocaleString()} ch.</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Calendar className="w-3 h-3 text-gray-500" />
            <span className={`text-[10px] font-bold ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>{new Date(item.created_at).toLocaleDateString()}</span>
          </div>
        </div>
        <button onClick={onToggleExpand} className="p-2 text-gold-500 hover:text-gold-400 bg-gold-400/5 rounded-xl transition-all">
          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      <AnimatePresence>
        {isExpanded && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} className="px-8 pb-8">
            <div className={`p-5 rounded-2xl border ${isDark ? 'bg-space-950 border-space-700/50' : 'bg-white border-gray-200 shadow-inner'}`}>
              <pre className={`text-xs whitespace-pre-wrap font-sans max-h-52 overflow-y-auto custom-scrollbar ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                {item.content}
              </pre>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

function KnowledgeModal({ item, onClose, onSaved }) {
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  useLockBodyScroll(true)
  const isEditing = !!item
  const [activeType, setActiveType] = useState(item?.type || 'text')
  const [title, setTitle] = useState(item?.title || '')
  const [content, setContent] = useState(item?.content || '')
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const fileInputRef = useRef(null)

  const typeOptions = [
    { id: 'text', label: 'Rédiger', icon: Edit3, color: 'gold', desc: 'Saisie manuelle rapide' },
    { id: 'pdf', label: 'Document', icon: FileText, color: 'red', desc: 'Extraire depuis un PDF' },
    { id: 'youtube', label: 'Vidéo', icon: Video, color: 'rose', desc: 'Transcription YouTube' },
    { id: 'website', label: 'Web', icon: Globe, color: 'blue', desc: 'Aspirer une page web' },
  ]

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!title.trim() || !content.trim()) {
      toast.error('Titre et contenu requis')
      return
    }
    setLoading(true)
    try {
      if (isEditing) {
        await api.put(`/knowledge/global/${item.id}`, { title, content, type: activeType })
        toast.success('Savoir mis à jour')
      } else {
        await api.post('/knowledge/global', { title, content, type: activeType })
        toast.success('Appris avec succès !')
      }
      onSaved()
    } catch (error) {
      toast.error(error.response?.data?.error || 'Une erreur est survenue')
    } finally {
      setLoading(false)
    }
  }

  const handleUrlSubmit = async (e) => {
    e.preventDefault()
    if (!url.trim()) {
      toast.error('URL requise')
      return
    }
    setLoading(true)
    try {
      await api.post('/knowledge/global/extract-url', { url, title: title || undefined })
      toast.success('Contenu extrait et intégré')
      onSaved()
    } catch (error) {
      toast.error(error.response?.data?.error || 'Erreur lors de l\'extraction')
    } finally {
      setLoading(false)
    }
  }

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    const formData = new FormData()
    formData.append('file', file)
    if (title) formData.append('title', title)

    setLoading(true)
    try {
      await api.post('/knowledge/global/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      toast.success('Fichier traité avec succès')
      onSaved()
    } catch (error) {
      toast.error(error.response?.data?.error || 'Erreur lors de l\'upload')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} 
                  className={`fixed inset-0 backdrop-blur-md ${isDark ? 'bg-space-950/90' : 'bg-gray-900/60'}`} 
                  onClick={onClose} />
      <motion.div initial={{ opacity: 0, scale: 0.96, y: 15 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96 }}
                  className={`relative z-10 w-full max-w-2xl border rounded-[3rem] shadow-2xl flex flex-col max-h-[90vh] overflow-hidden ${
                    isDark ? 'bg-space-900 border-space-700/50' : 'bg-white border-gray-100'
                  }`}>
        <div className={`p-8 border-b ${isDark ? 'border-white/5' : 'border-gray-50'}`}>
          <div className="flex items-center justify-between mb-8">
            <h2 className={`text-3xl font-display font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
              {isEditing ? 'Éditer le savoir' : 'Nouveau savoir'}
            </h2>
            <button onClick={onClose} className={`p-3 rounded-2xl transition-all ${isDark ? 'bg-white/5 text-gray-500 hover:text-white' : 'bg-gray-100 text-gray-500 hover:text-gray-900'}`}>
              <X className="w-6 h-6" />
            </button>
          </div>
          
          {!isEditing && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {typeOptions.map((opt) => (
                <button
                  key={opt.id}
                  disabled={loading}
                  onClick={() => setActiveType(opt.id)}
                  className={`flex flex-col items-center gap-3 p-4 rounded-[1.8rem] border transition-all ${
                    activeType === opt.id
                      ? (isDark ? 'bg-gold-400/10 border-gold-400/50 ring-2 ring-gold-400/10' : 'bg-gold-50 border-gold-400/40 ring-2 ring-gold-400/5')
                      : (isDark ? 'bg-white/5 border-transparent hover:border-white/10' : 'bg-gray-50 border-transparent hover:border-gray-200')
                  }`}
                >
                  <opt.icon className={`w-8 h-8 ${opt.id === activeType ? 'text-gold-400' : 'text-gray-400'}`} />
                  <div className="text-center">
                    <p className={`text-sm font-bold ${activeType === opt.id ? (isDark ? 'text-white' : 'text-gray-900') : 'text-gray-500'}`}>{opt.label}</p>
                    <p className="text-[10px] text-gray-400 mt-0.5 sm:block hidden">{opt.desc}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
          {activeType === 'text' || isEditing ? (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <label className={`text-xs font-bold uppercase tracking-widest pl-1 ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>Intitulé du sujet</label>
                <input
                  type="text" required value={title} onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ex: Politique de retour standard"
                  className={`w-full border rounded-2xl px-6 py-4 outline-none transition-all ${
                    isDark ? 'bg-space-950 border-white/5 text-white placeholder:text-gray-700' : 'bg-gray-50 border-gray-100 text-gray-900 placeholder:text-gray-300'
                  }`}
                />
              </div>
              <div className="space-y-2">
                <label className={`text-xs font-bold uppercase tracking-widest pl-1 ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>Corps du savoir</label>
                <textarea
                  required value={content} onChange={(e) => setContent(e.target.value)}
                  placeholder="Détaillez ici tout ce que l'agent doit savoir..." rows={8}
                  className={`w-full border rounded-[1.8rem] px-6 py-4 outline-none transition-all resize-none custom-scrollbar ${
                    isDark ? 'bg-space-950 border-white/5 text-white' : 'bg-gray-50 border-gray-100 text-gray-900'
                  }`}
                />
              </div>
              <button disabled={loading} className="btn-primary w-full py-5 text-lg shadow-xl shadow-gold-400/10 active:scale-[0.98]">
                {loading ? <Loader2 className="w-6 h-6 animate-spin mx-auto" /> : 'Enregistrer dans le cerveau'}
              </button>
            </form>
          ) : (
            <div className="space-y-8 animate-fadeIn">
               {/* Same form logic as before but with platform colors */}
               <form onSubmit={activeType === 'pdf' ? undefined : handleUrlSubmit} className="space-y-6">
                  <div className={`p-6 rounded-2xl flex items-start gap-4 ${isDark ? 'bg-space-950' : 'bg-gray-50'}`}>
                    <div className={`p-3 rounded-xl ${isDark ? 'bg-space-900' : 'bg-white shadow-sm'}`}>
                       <KnowledgeTypeIcon type={activeType} isDark={isDark} />
                    </div>
                    <div>
                      <p className={`font-bold uppercase tracking-wide text-xs ${isDark ? 'text-gold-400' : 'text-gold-600'}`}>Importation Automatisée</p>
                      <p className="text-sm text-gray-500 mt-1">SEVEN T va analyser et restructurer les données pour vos agents.</p>
                    </div>
                  </div>
                  
                  {activeType === 'pdf' ? (
                     <button onClick={() => fileInputRef.current?.click()} className={`w-full py-16 border-2 border-dashed rounded-[2.5rem] transition-all flex flex-col items-center justify-center gap-6 ${
                        isDark ? 'border-space-700 bg-space-950 hover:bg-space-800' : 'border-gray-200 bg-gray-50 hover:bg-gray-100'
                     }`}>
                        <input ref={fileInputRef} type="file" accept=".pdf" onChange={handleFileUpload} className="hidden" />
                        <Upload className="w-12 h-12 text-gold-400" />
                        <div className="text-center">
                           <p className={`text-xl font-bold mb-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>Cliquez pour importer</p>
                           <p className="text-xs text-gray-500">Document PDF • Maximum 10 Mo</p>
                        </div>
                     </button>
                  ) : (
                    <div className="space-y-6">
                      <input type="url" required value={url} onChange={(e) => setUrl(e.target.value)} 
                             placeholder="https://..." className={`w-full border rounded-2xl px-6 py-4 outline-none ${isDark ? 'bg-space-950 border-white/5 text-white' : 'bg-gray-50 border-gray-100 text-gray-900'}`} />
                      <button disabled={loading} className="btn-primary w-full py-5 text-lg shadow-xl shadow-gold-400/10">
                         {loading ? <Loader2 className="w-6 h-6 animate-spin mx-auto" /> : 'Lancer l\'extraction'}
                      </button>
                    </div>
                  )}
               </form>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  )
}
