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

// Icon for knowledge types
const KnowledgeTypeIcon = ({ type, className = "w-5 h-5" }) => {
  switch (type) {
    case 'pdf':
      return <FileText className={`${className} text-red-500`} />
    case 'youtube':
      return <Video className={`${className} text-rose-500`} />
    case 'website':
      return <Globe className={`${className} text-sky-500`} />
    default:
      return <FileText className={`${className} text-indigo-500`} />
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
      {/* Premium Header */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-[2.5rem] border border-white/5 dark:border-white/10 p-8 sm:p-12 mb-8"
      >
        {/* Animated Background Gradients */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-24 -left-24 w-96 h-96 bg-indigo-600/20 blur-[120px] rounded-full animate-pulse" />
          <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-gold-400/20 blur-[120px] rounded-full animate-pulse" style={{ animationDelay: '2s' }} />
        </div>

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
          <div className="space-y-4 max-w-2xl">
            <div className="inline-flex items-center gap-3 px-4 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 backdrop-blur-md">
              <Sparkles className="w-4 h-4 text-indigo-400" />
              <span className="text-sm font-semibold text-indigo-300 tracking-wider uppercase">Base de Connaissances Intelligente</span>
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-display font-bold text-white leading-[1.1]">
              Le cerveau de vos <span className="text-gradient">Agents IA</span>
            </h1>
            <p className="text-lg text-gray-400 max-w-xl leading-relaxed">
              Centralisez vos documents, liens et vidéos pour donner à vos agents une expertise imbattable et une réponse toujours juste.
            </p>
          </div>

          <div className="flex flex-col gap-4 min-w-[200px]">
            <button
              onClick={() => setShowAddModal(true)}
              className="group relative px-8 py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-bold flex items-center justify-center gap-3 transition-all duration-300 hover:scale-[1.02] shadow-xl shadow-indigo-600/20 overflow-hidden"
            >
              <div className="absolute inset-0 w-1/2 h-full bg-white/10 -skew-x-[45deg] -translate-x-full group-hover:translate-x-[200%] transition-transform duration-700" />
              <Plus className="w-5 h-5" />
              <span>Nouveau contenu</span>
            </button>
            <div className="flex items-center justify-center gap-6 px-4 py-2 bg-white/5 backdrop-blur-md border border-white/10 rounded-xl">
              <div className="text-center">
                <p className="text-xl font-bold text-white">{stats.total}</p>
                <p className="text-[10px] uppercase tracking-tighter text-gray-500">Documents</p>
              </div>
              <div className="w-px h-8 bg-white/10" />
              <div className="text-center">
                <p className="text-xl font-bold text-white">{(stats.totalChars / 1000).toFixed(1)}k</p>
                <p className="text-[10px] uppercase tracking-tighter text-gray-500">Mots approx.</p>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Control Bar */}
      <div className="flex flex-col lg:flex-row gap-4 items-center justify-between sticky top-4 z-40 p-2 bg-space-950/80 backdrop-blur-xl border border-white/5 rounded-[1.5rem] shadow-2xl">
        <div className="relative w-full lg:max-w-md group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 group-focus-within:text-indigo-400 transition-colors" />
          <input
            type="text"
            placeholder="Rechercher une expertise..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-space-900/50 border border-white/5 rounded-xl pl-12 pr-4 py-3 text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-600/50 transition-all"
          />
        </div>

        <div className="flex items-center gap-2 w-full lg:w-auto overflow-x-auto pb-1 sm:pb-0 scrollbar-hide">
          <div className="flex items-center p-1 bg-space-900/50 border border-white/5 rounded-xl mr-2">
            <button 
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-500 hover:text-gray-300'}`}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button 
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-500 hover:text-gray-300'}`}
            >
              <ListIcon className="w-4 h-4" />
            </button>
          </div>

          <div className="h-8 w-px bg-white/5 mx-2" />

          {['all', 'text', 'pdf', 'youtube', 'website'].map((type) => (
            <button
              key={type}
              onClick={() => setTypeFilter(type)}
              className={`whitespace-nowrap px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                typeFilter === type 
                ? 'bg-white/10 text-white border border-white/10' 
                : 'text-gray-500 hover:text-gray-300 hover:bg-white/5 border border-transparent'
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
          className="flex flex-col items-center justify-center p-12 rounded-[2rem] bg-rose-500/5 border border-rose-500/20 text-center"
        >
          <div className="w-16 h-16 bg-rose-500/20 rounded-2xl flex items-center justify-center mb-6">
            <Info className="w-8 h-8 text-rose-500" />
          </div>
          <h3 className="text-xl font-bold text-white mb-2">Impossible de charger la base</h3>
          <p className="text-gray-400 mb-8 max-w-sm">{loadError}</p>
          <button
            onClick={loadKnowledge}
            className="px-6 py-3 bg-rose-600 hover:bg-rose-500 text-white rounded-xl font-bold transition-all"
          >
            Réessayer maintenant
          </button>
        </motion.div>
      ) : loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1,2,3,4,5,6].map(i => (
            <div key={i} className="h-64 rounded-[2rem] bg-white/5 border border-white/5 animate-pulse" />
          ))}
        </div>
      ) : filteredItems.length === 0 ? (
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="relative flex flex-col items-center justify-center py-20 px-6 rounded-[3rem] bg-indigo-600/5 border border-indigo-500/10 text-center border-dashed"
        >
          <img 
            src={emptyStateImage} 
            alt="Base vide" 
            className="w-full max-w-md h-auto mb-10 mix-blend-screen opacity-80"
          />
          <h3 className="text-3xl font-display font-bold text-white mb-4">Votre base est prête à apprendre</h3>
          <p className="text-gray-400 mb-8 max-w-md">
            Importez vos premiers documents pour donner vie à vos agents IA. Ils pourront s'en servir pour répondre avec précision à vos clients.
          </p>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-8 py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-bold flex items-center gap-3 transition-all shadow-xl shadow-indigo-600/20"
          >
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
  
  if (viewMode === 'list') {
    return (
      <motion.div
        layout
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 20 }}
        transition={{ delay: index * 0.05 }}
        className={`group relative p-4 rounded-2xl border transition-all duration-300 ${
          isDark ? 'bg-space-900 hover:bg-space-800 border-white/5' : 'bg-white border-gray-100 shadow-sm'
        }`}
      >
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center flex-shrink-0">
            <KnowledgeTypeIcon type={item.type} className="w-6 h-6" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-white font-bold truncate">{item.title}</h3>
            <div className="flex items-center gap-3 mt-1">
              <span className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">
                {item.type}
              </span>
              <span className="text-[10px] text-gray-600">•</span>
              <span className="text-[10px] text-gray-500">
                {(item.content?.length || 0).toLocaleString()} caractères
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <button onClick={onEdit} className="p-2 text-gray-400 hover:text-white transition-colors"><Edit3 className="w-4 h-4" /></button>
            <button onClick={onDelete} className="p-2 text-gray-400 hover:text-rose-500 transition-colors"><Trash2 className="w-4 h-4" /></button>
            <div className="w-px h-6 bg-white/5 mx-1" />
            <button onClick={onToggleExpand} className="p-2 text-indigo-400 hover:text-indigo-300 transition-colors">
              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="mt-4 p-4 rounded-xl bg-black/20 border border-white/5"
            >
              <pre className="text-sm text-gray-400 whitespace-pre-wrap font-sans max-h-60 overflow-y-auto custom-scrollbar">
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
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ delay: index * 0.05 }}
      whileHover={{ y: -5 }}
      className={`group relative flex flex-col h-full overflow-hidden rounded-[2rem] border transition-all duration-300 ${
        isDark ? 'bg-space-900 border-white/5 hover:border-indigo-500/30' : 'bg-white border-gray-100 shadow-sm'
      }`}
    >
      <div className="p-6 flex-1 flex flex-col space-y-4">
        <div className="flex items-start justify-between">
          <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center transition-transform group-hover:scale-110 duration-500 shadow-xl border border-white/5">
            <KnowledgeTypeIcon type={item.type} className="w-6 h-6" />
          </div>
          <div className="flex items-center gap-1">
            <button 
              onClick={onEdit} 
              className="p-2.5 rounded-xl text-gray-500 hover:text-white hover:bg-white/5 transition-all"
            >
              <Edit3 className="w-4 h-4" />
            </button>
            <button 
              onClick={onDelete} 
              className="p-2.5 rounded-xl text-gray-500 hover:text-rose-500 hover:bg-rose-500/10 transition-all"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="space-y-1">
          <h3 className="text-xl font-bold text-white line-clamp-1 leading-tight">{item.title}</h3>
          <p className="text-[10px] font-bold text-indigo-400 tracking-[0.2em] uppercase opacity-80">{getTypeLabel(item.type)}</p>
        </div>

        <p className="text-sm text-gray-500 line-clamp-3 leading-relaxed">
          {item.content}
        </p>

        {metadata?.sourceUrl && (
          <a 
            href={metadata.sourceUrl} 
            target="_blank" 
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-xs text-indigo-400 hover:text-indigo-300 transition-colors font-semibold"
          >
            <Link2 className="w-3 h-3" />
            Source externe
            <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
          </a>
        )}
      </div>

      <div className="px-6 py-4 bg-white/5 border-t border-white/5 flex items-center justify-between">
        <div className="flex items-center gap-3 text-gray-600">
          <div className="flex items-center gap-1.5 ">
            <Database className="w-3 h-3" />
            <span className="text-[10px] font-bold">{(item.content?.length || 0).toLocaleString()} ch.</span>
          </div>
          <div className="w-1 h-1 rounded-full bg-gray-800" />
          <div className="flex items-center gap-1.5">
            <Calendar className="w-3 h-3" />
            <span className="text-[10px] font-bold">{new Date(item.created_at).toLocaleDateString()}</span>
          </div>
        </div>
        <button 
          onClick={onToggleExpand}
          className="p-2 text-indigo-400 hover:text-indigo-300 hover:bg-indigo-400/10 rounded-lg transition-all"
        >
          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="px-6 pb-6"
          >
            <div className="p-4 rounded-xl bg-black/30 border border-white/5">
              <pre className="text-xs text-gray-400 whitespace-pre-wrap font-sans max-h-40 overflow-y-auto custom-scrollbar">
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
  useLockBodyScroll(true)
  const isEditing = !!item
  const [activeType, setActiveType] = useState(item?.type || 'text')
  const [title, setTitle] = useState(item?.title || '')
  const [content, setContent] = useState(item?.content || '')
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const fileInputRef = useRef(null)

  const typeOptions = [
    { id: 'text', label: 'Rédiger', icon: Edit3, color: 'indigo', desc: 'Saisie manuelle rapide' },
    { id: 'pdf', label: 'Document', icon: FileText, color: 'rose', desc: 'Extraire depuis un PDF' },
    { id: 'youtube', label: 'Vidéo', icon: Video, color: 'rose', desc: 'Transcription YouTube' },
    { id: 'website', label: 'Web', icon: Globe, color: 'sky', desc: 'Aspirer une page web' },
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
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-space-950/90 backdrop-blur-md" 
        onClick={onClose} 
      />
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="relative z-10 w-full max-w-2xl bg-space-900 border border-white/10 rounded-[3rem] shadow-2xl flex flex-col max-h-[90vh] overflow-hidden"
      >
        <div className="p-8 border-b border-white/5">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-3xl font-display font-bold text-white">
              {isEditing ? 'Éditer le savoir' : 'Nouveau savoir'}
            </h2>
            <button onClick={onClose} className="p-3 text-gray-500 hover:text-white transition-all bg-white/5 rounded-2xl">
              <X className="w-6 h-6" />
            </button>
          </div>
          
          {!isEditing && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {typeOptions.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  disabled={loading}
                  onClick={() => setActiveType(opt.id)}
                  className={`flex flex-col items-center gap-3 p-4 rounded-[1.5rem] border transition-all ${
                    activeType === opt.id
                      ? 'bg-indigo-600/20 border-indigo-500/50 ring-2 ring-indigo-500/20'
                      : 'bg-white/5 border-transparent hover:border-white/10'
                  }`}
                >
                  <opt.icon className={`w-8 h-8 ${opt.id === activeType ? 'text-white' : 'text-gray-600'}`} />
                  <div className="text-center">
                    <p className={`text-sm font-bold ${activeType === opt.id ? 'text-white' : 'text-gray-500'}`}>{opt.label}</p>
                    <p className="text-[10px] text-gray-600 mt-0.5 sm:block hidden">{opt.desc}</p>
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
                <label className="text-sm font-bold text-gray-500 uppercase tracking-widest pl-1">Intitulé du sujet</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ex: Conditions de remboursement VIP"
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white placeholder:text-gray-700 outline-none focus:ring-2 focus:ring-indigo-600/50 transition-all"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-500 uppercase tracking-widest pl-1">Corps du savoir</label>
                <textarea
                  required
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Détaillez ici tout ce que l'agent doit savoir..."
                  rows={10}
                  className="w-full bg-white/5 border border-white/10 rounded-[1.5rem] px-6 py-4 text-white placeholder:text-gray-700 outline-none focus:ring-2 focus:ring-indigo-600/50 transition-all resize-none custom-scrollbar"
                />
                <div className="flex justify-end">
                   <span className="text-[10px] font-bold text-gray-600">{content.length.toLocaleString()} caractères saisis</span>
                </div>
              </div>
              <button 
                type="submit" 
                disabled={loading}
                className="w-full py-5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-bold text-lg transition-all shadow-xl shadow-indigo-600/20 disabled:opacity-50"
              >
                {loading ? <Loader2 className="w-6 h-6 animate-spin mx-auto" /> : (isEditing ? 'Enregistrer les modifications' : 'Enregistrer dans le cerveau')}
              </button>
            </form>
          ) : activeType === 'pdf' ? (
            <div className="space-y-8">
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-500 uppercase tracking-widest pl-1">Titre de référence</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Laisser vide pour garder le nom du fichier"
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white placeholder:text-gray-700 outline-none"
                />
              </div>
              <button
                 onClick={() => fileInputRef.current?.click()}
                 className="w-full py-16 border-2 border-dashed border-white/10 rounded-[2.5rem] bg-white/5 hover:bg-white/10 transition-all group flex flex-col items-center justify-center gap-6"
              >
                <input ref={fileInputRef} type="file" accept=".pdf" onChange={handleFileUpload} className="hidden" />
                <div className="w-20 h-20 rounded-[1.5rem] bg-indigo-600/10 flex items-center justify-center group-hover:scale-110 transition-transform shadow-2xl">
                   <Upload className="w-10 h-10 text-indigo-400" />
                </div>
                <div className="text-center">
                   <p className="text-xl font-bold text-white mb-1">Sélectionnez un document</p>
                   <p className="text-sm text-gray-500">PDF uniquement • Max 10Mo</p>
                </div>
              </button>
            </div>
          ) : (
            <form onSubmit={handleUrlSubmit} className="space-y-6">
              <div className={`p-6 rounded-2xl flex items-start gap-4 ${activeType === 'youtube' ? 'bg-rose-500/10 border border-rose-500/20' : 'bg-sky-500/10 border border-sky-500/20'}`}>
                {activeType === 'youtube' ? <Video className="w-8 h-8 text-rose-500 flex-shrink-0" /> : <Globe className="w-8 h-8 text-sky-500 flex-shrink-0" />}
                <div>
                  <p className={`font-bold ${activeType === 'youtube' ? 'text-rose-400' : 'text-sky-400'}`}>
                    {activeType === 'youtube' ? 'Extraction YouTube Intelligence' : 'Aspiration Web Intelligente'}
                  </p>
                  <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                    {activeType === 'youtube' ? 'Nous allons récupérer et analyser la transcription de la vidéo.' : 'Nous allons extraire le contenu textuel pertinent de la page web.'}
                  </p>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-500 uppercase tracking-widest pl-1">URL de la source</label>
                <input
                  type="url"
                  required
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder={activeType === 'youtube' ? "https://youtube.com/watch?v=..." : "https://example.com/blog/article"}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white placeholder:text-gray-700 outline-none"
                />
              </div>
              <button 
                type="submit" 
                disabled={loading}
                className={`w-full py-5 rounded-2xl font-bold text-lg transition-all shadow-xl disabled:opacity-50 ${activeType === 'youtube' ? 'bg-rose-600 shadow-rose-600/20' : 'bg-sky-600 shadow-sky-600/20'}`}
              >
                {loading ? <Loader2 className="w-6 h-6 animate-spin mx-auto" /> : 'Lancer l\'extraction'}
              </button>
            </form>
          )}
        </div>
      </motion.div>
    </div>
  )
}
