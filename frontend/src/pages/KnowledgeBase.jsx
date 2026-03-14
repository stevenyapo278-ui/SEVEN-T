import React, { useState, useEffect, useRef, useMemo, forwardRef } from 'react'
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
    case 'pdf': return isDark ? 'text-rose-400' : 'text-rose-600';
    case 'youtube': return isDark ? 'text-red-500' : 'text-red-600';
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
    <div className="max-w-7xl mx-auto w-full space-y-6 px-3 sm:px-4 min-w-0">
      {/* Platform-Aligned Header Hero */}
      <div className={`relative rounded-2xl sm:rounded-3xl border p-4 sm:p-8 mb-4 sm:mb-8 ${
        isDark ? 'bg-gradient-to-br from-space-800 via-space-900 to-space-800 border-space-700/50' : 'bg-gradient-to-br from-gray-50 via-white to-gray-50 border-gray-200'
      }`}>
        <div
          className="absolute inset-0 opacity-50 hero-pattern-overlay"
          style={{ backgroundImage: `url(${isDark ? "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wMiI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMiIvPjwvZz48L2c+PC9zdmc+" : "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgdmlld0JveD0iMCAwIDYwIDYwIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiM2NDc0OGIiIGZpbGwtb3BhY2l0eT0iMC4wNiI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMiIvPjwvZz48L2c+PC9zdmc+"})` }}
          aria-hidden
        />
        
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between min-w-0">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-3 mb-2 min-w-0">
              <div className="p-2 bg-gold-400/10 rounded-xl flex-shrink-0">
                <BookOpen className="w-6 h-6 text-gold-400" />
              </div>
              <h1 className={`text-2xl sm:text-3xl font-display font-bold break-words ${isDark ? 'text-white' : 'text-gray-900'}`}>Base de Connaissances</h1>
              <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase ${isDark ? 'bg-gold-400/20 text-gold-400' : 'bg-gold-50 text-gold-600 border border-gold-200'}`}>
                Cerveau IA
              </span>
            </div>
            <p className={`text-base sm:text-lg break-words ${isDark ? 'text-gray-400' : 'text-gray-700'}`}>Importez vos documents pour donner à vos agents une expertise métier.</p>
          </div>
          
          <div className="flex flex-wrap items-center gap-2 sm:gap-3 flex-shrink-0 relative z-20">
            <button
              onClick={() => loadKnowledge()}
              className={`flex items-center justify-center gap-2 px-4 py-2 rounded-xl transition-all duration-200 min-h-[44px] ${
                isDark ? 'bg-space-800 text-gray-300 hover:bg-space-700 hover:text-white border border-space-700/50' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Actualiser</span>
            </button>
            <button
              onClick={() => setShowAddModal(true)}
              className="btn-primary flex items-center gap-2 min-h-[44px]"
            >
              <Plus className="w-5 h-5" />
              <span>Nouveau contenu</span>
            </button>
          </div>
        </div>

        {/* Stats Row */}
        <div className="relative grid grid-cols-2 md:grid-cols-4 gap-3 mt-8">
          <div className={`rounded-xl p-4 border transition-all duration-300 ${isDark ? 'bg-space-800/50 border-space-700/50 hover:bg-space-800' : 'bg-white border-gray-100 hover:shadow-md shadow-sm'}`}>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/10 rounded-xl flex-shrink-0">
                <FileText className="w-5 h-5 text-blue-400" />
              </div>
              <div className="min-w-0 flex-1">
                <p className={`text-xl font-bold truncate ${isDark ? 'text-white' : 'text-gray-900'}`}>{stats.total}</p>
                <p className={`text-[10px] uppercase font-bold tracking-wider truncate ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Documents</p>
              </div>
            </div>
          </div>
          <div className={`rounded-xl p-4 border transition-all duration-300 ${isDark ? 'bg-space-800/50 border-space-700/50 hover:bg-space-800' : 'bg-white border-gray-100 hover:shadow-md shadow-sm'}`}>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-500/10 rounded-xl flex-shrink-0">
                <Database className="w-5 h-5 text-emerald-400" />
              </div>
              <div className="min-w-0 flex-1">
                <p className={`text-xl font-bold truncate ${isDark ? 'text-white' : 'text-gray-900'}`}>{(stats.totalChars / 1000).toFixed(1)}k</p>
                <p className={`text-[10px] uppercase font-bold tracking-wider truncate ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Caractères</p>
              </div>
            </div>
          </div>
          <div className={`rounded-xl p-4 border transition-all duration-300 ${isDark ? 'bg-space-800/50 border-space-700/50 hover:bg-space-800' : 'bg-white border-gray-100 hover:shadow-md shadow-sm'}`}>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-500/10 rounded-xl flex-shrink-0">
                <Video className="w-5 h-5 text-red-500" />
              </div>
              <div className="min-w-0 flex-1">
                <p className={`text-xl font-bold truncate ${isDark ? 'text-white' : 'text-gray-900'}`}>{stats.youtube}</p>
                <p className={`text-[10px] uppercase font-bold tracking-wider truncate ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Vidéos</p>
              </div>
            </div>
          </div>
          <div className={`rounded-xl p-4 border transition-all duration-300 ${isDark ? 'bg-space-800/50 border-space-700/50 hover:bg-space-800' : 'bg-white border-gray-100 hover:shadow-md shadow-sm'}`}>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-sky-500/10 rounded-xl flex-shrink-0">
                <Globe className="w-5 h-5 text-sky-400" />
              </div>
              <div className="min-w-0 flex-1">
                <p className={`text-xl font-bold truncate ${isDark ? 'text-white' : 'text-gray-900'}`}>{stats.website}</p>
                <p className={`text-[10px] uppercase font-bold tracking-wider truncate ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Sites Web</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Control Bar - Using exact platform style */}
      <div className="flex flex-col sm:flex-row flex-wrap gap-3 mb-4 sm:mb-6">
        <div className={`flex-1 flex items-center gap-3 px-4 py-2.5 sm:py-3 border rounded-xl transition-all duration-300 focus-within:ring-2 ${
          isDark 
          ? 'bg-space-800 border-space-700 focus-within:border-blue-500/50 focus-within:ring-blue-500/20' 
          : 'bg-white border-gray-300 focus-within:border-blue-500/50 focus-within:ring-blue-500/10 shadow-sm'
        }`}>
          <Search className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400 flex-shrink-0" />
          <input
            type="text"
            placeholder="Rechercher un savoir..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-transparent border-none p-0 focus:ring-0 w-full text-sm sm:text-base placeholder:text-gray-500 text-gray-100"
          />
        </div>

        <div className="flex items-center gap-2">
          <div className={`flex items-center rounded-xl p-1 border ${isDark ? 'bg-space-800 border-space-700' : 'bg-gray-100 border-gray-300'}`}>
            <button 
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-lg transition-colors min-h-[36px] min-w-[36px] flex items-center justify-center ${viewMode === 'grid' ? (isDark ? 'bg-space-700 text-white' : 'bg-white text-gray-900 shadow-sm') : 'text-gray-500 hover:text-gray-200'}`}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button 
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-lg transition-colors min-h-[36px] min-w-[36px] flex items-center justify-center ${viewMode === 'list' ? (isDark ? 'bg-space-700 text-white' : 'bg-white text-gray-900 shadow-sm') : 'text-gray-500 hover:text-gray-200'}`}
            >
              <ListIcon className="w-4 h-4" />
            </button>
          </div>

          <div className={`h-8 w-px mx-1 ${isDark ? 'bg-space-700' : 'bg-gray-200'}`} />

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className={`px-3 py-2 rounded-xl border text-sm transition-all outline-none min-h-[44px] ${
              isDark ? 'bg-space-800 border-space-700 text-gray-300' : 'bg-white border-gray-300 text-gray-700'
            }`}
          >
            <option value="all">Tous les types</option>
            <option value="text">Texte seul</option>
            <option value="pdf">Documents PDF</option>
            <option value="youtube">Vidéos YouTube</option>
            <option value="website">Sites Web</option>
          </select>
        </div>
      </div>

      {/* Content Area */}
      {loadError ? (
        <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-6 text-center">
          <p className="text-red-300 mb-3">{loadError}</p>
          <button onClick={loadKnowledge} className="btn-secondary flex items-center gap-2 mx-auto">
            <RefreshCw className="w-4 h-4" /> Réessayer
          </button>
        </div>
      ) : loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1,2,3,4,5,6].map(i => (
            <div key={i} className={`h-48 rounded-2xl border animate-pulse ${isDark ? 'bg-space-800/50 border-space-700/50' : 'bg-gray-100 border-gray-200'}`} />
          ))}
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="bg-space-800/20 border border-space-700/50 border-dashed rounded-3xl p-16 text-center">
          <div className="w-20 h-20 bg-gold-400/10 rounded-3xl flex items-center justify-center mx-auto mb-6">
            <BookOpen className="w-10 h-10 text-gold-400" />
          </div>
          <h3 className="text-xl font-semibold text-gray-100 mb-3">Votre base est vide</h3>
          <p className="text-gray-500 max-w-sm mx-auto mb-6">Ajoutez du contenu pour rendre vos agents IA plus intelligents et précis.</p>
          <button onClick={() => setShowAddModal(true)} className="btn-primary inline-flex items-center gap-2">
            <Plus className="w-5 h-5" /> Nouveau savoir
          </button>
        </div>
      ) : (
        <div className={viewMode === 'grid' ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4" : "space-y-3"}>
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

      {/* Modals are kept with premium feel but platform-aligned colors */}
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

const KnowledgeCard = forwardRef(({ item, index, viewMode, onEdit, onDelete, isExpanded, onToggleExpand, isDark }, ref) => {
  const metadata = typeof item.metadata === 'string' ? JSON.parse(item.metadata || '{}') : (item.metadata || {})
  
  const cardBase = "card p-4 transition-all hover:bg-space-800/80 group cursor-pointer animate-fadeIn";

  if (viewMode === 'list') {
    return (
      <div ref={ref} className={`${cardBase} flex flex-col sm:flex-row sm:items-center gap-3`} onClick={onToggleExpand}>
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${isDark ? 'bg-space-950/50' : 'bg-gray-50'}`}>
            <KnowledgeTypeIcon type={item.type} className="w-5 h-5" isDark={isDark} />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-100 truncate group-hover:text-gold-400 transition-colors uppercase tracking-tight">{item.title}</h3>
            <div className="flex items-center gap-2 mt-0.5 text-[10px] text-gray-500 font-bold uppercase tracking-wider">
              <span>{getTypeLabel(item.type)}</span>
              <span className="text-gray-700">•</span>
              <span>{(item.content?.length || 0).toLocaleString()} car.</span>
            </div>
          </div>
        </div>
        <div className="flex items-center justify-end gap-2">
          <button onClick={(e) => { e.stopPropagation(); onEdit(); }} className="p-2 text-gray-500 hover:text-gold-400 hover:bg-gold-400/10 rounded-lg"><Edit3 className="w-4 h-4" /></button>
          <button onClick={(e) => { e.stopPropagation(); onDelete(); }} className="p-2 text-gray-500 hover:text-red-500 hover:bg-red-500/10 rounded-lg"><Trash2 className="w-4 h-4" /></button>
          <div className={`w-px h-6 mx-1 ${isDark ? 'bg-space-700' : 'bg-gray-200'}`} />
          <ChevronRight className={`w-4 h-4 text-gray-600 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
        </div>
        {isExpanded && (
          <div className="w-full mt-3 pt-3 border-t border-space-700/50">
            <pre className="text-xs text-gray-400 whitespace-pre-wrap font-sans max-h-60 overflow-y-auto custom-scrollbar italic">{item.content}</pre>
          </div>
        )}
      </div>
    )
  }

  return (
    <div ref={ref} className={`${cardBase} flex flex-col h-full`} onClick={onToggleExpand}>
      <div className="flex items-start justify-between mb-4">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center border ${isDark ? 'bg-space-950/50 border-space-700/50' : 'bg-gray-50 border-gray-100 shadow-sm'}`}>
          <KnowledgeTypeIcon type={item.type} className="w-6 h-6" isDark={isDark} />
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={(e) => { e.stopPropagation(); onEdit(); }} className="p-2 text-gray-500 hover:text-gold-400"><Edit3 className="w-4 h-4" /></button>
          <button onClick={(e) => { e.stopPropagation(); onDelete(); }} className="p-2 text-gray-500 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
        </div>
      </div>

      <div className="mb-3">
        <h3 className="font-bold text-gray-100 line-clamp-2 leading-snug uppercase tracking-tight group-hover:text-gold-400 transition-colors">{item.title}</h3>
        <p className="text-[10px] font-bold text-gray-500 mt-1 uppercase tracking-widest leading-none">{getTypeLabel(item.type)}</p>
      </div>

      <p className="text-xs text-gray-500 line-clamp-3 leading-relaxed flex-1 italic">{item.content}</p>

      <div className="mt-4 pt-4 border-t border-space-700/30 flex items-center justify-between text-[10px] font-bold text-gray-600">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1"><Database className="w-3 h-3" /> {(item.content?.length || 0).toLocaleString()} car.</span>
          <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {new Date(item.created_at).toLocaleDateString()}</span>
        </div>
        <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
      </div>

      {isExpanded && (
        <div className="mt-4 p-3 bg-space-950/50 rounded-xl border border-space-700/50">
          <pre className="text-[11px] text-gray-400 whitespace-pre-wrap font-sans max-h-40 overflow-y-auto custom-scrollbar">{item.content}</pre>
        </div>
      )}
    </div>
  )
})

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
    { id: 'text', label: 'Rédiger', icon: Edit3, color: 'gold' },
    { id: 'pdf', label: 'PDF', icon: FileText, color: 'rose' },
    { id: 'youtube', label: 'Vidéos', icon: Video, color: 'red' },
    { id: 'website', label: 'Web', icon: Globe, color: 'blue' },
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
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="fixed inset-0 bg-space-950/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-xl bg-space-900 border border-space-700 rounded-t-2xl sm:rounded-3xl shadow-2xl max-h-[90vh] sm:max-h-[80vh] flex flex-col animate-fadeIn">
        <div className="flex-shrink-0 p-4 sm:p-6 border-b border-space-700">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg sm:text-xl font-display font-semibold text-gray-100">
              {isEditing ? 'Modifier le savoir' : 'Ajouter un savoir'}
            </h2>
            <button onClick={onClose} className="p-2 -m-2 text-gray-500 hover:text-gray-300"><X className="w-5 h-5" /></button>
          </div>
          {!isEditing && (
            <div className="grid grid-cols-4 gap-2">
              {typeOptions.map(opt => (
                <button
                  key={opt.id}
                  onClick={() => setActiveType(opt.id)}
                  className={`flex flex-col items-center gap-1.5 p-2 rounded-xl border transition-all ${
                    activeType === opt.id ? 'bg-gold-400/10 border-gold-400/30 ring-2 ring-gold-400/10' : 'bg-space-950/50 border-transparent hover:border-space-700'
                  }`}
                >
                  <opt.icon className={`w-5 h-5 ${activeType === opt.id ? 'text-gold-400' : 'text-gray-500'}`} />
                  <span className={`text-[10px] font-bold uppercase tracking-wider ${activeType === opt.id ? 'text-gray-100' : 'text-gray-500'}`}>{opt.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 custom-scrollbar">
          {activeType === 'text' || isEditing ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Titre du sujet</label>
                <input
                  type="text" required value={title} onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ex: Politique de livraison" className="input-dark w-full"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Contenu textuel</label>
                <textarea
                  required value={content} onChange={(e) => setContent(e.target.value)}
                  placeholder="Décrivez votre savoir ici..." rows={10} className="input-dark w-full resize-none"
                />
              </div>
              <button disabled={loading} className="btn-primary w-full py-4 text-base shadow-xl active:scale-[0.98]">
                {loading ? <Loader2 className="w-6 h-6 animate-spin mx-auto" /> : 'Enregistrer dans le cerveau'}
              </button>
            </form>
          ) : activeType === 'pdf' ? (
            <div className="space-y-6">
               <button onClick={() => fileInputRef.current?.click()} className="w-full py-20 border-2 border-dashed border-space-700 rounded-3xl bg-space-950/50 hover:bg-space-800 transition-all flex flex-col items-center justify-center gap-4">
                  <input ref={fileInputRef} type="file" accept=".pdf" onChange={handleFileUpload} className="hidden" />
                  <Upload className="w-12 h-12 text-gold-400" />
                  <div className="text-center">
                    <p className="text-lg font-bold text-gray-100">Importer un PDF</p>
                    <p className="text-xs text-gray-500">Maximum 10 Mo</p>
                  </div>
               </button>
            </div>
          ) : (
            <form onSubmit={handleUrlSubmit} className="space-y-6">
               <div className="p-4 bg-blue-500/10 rounded-2xl border border-blue-500/20">
                 <p className="text-xs font-bold text-blue-400 uppercase tracking-widest mb-1">Extraction intelligente</p>
                 <p className="text-sm text-gray-400">Nous allons analyser cette source pour en extraire le savoir pertinent.</p>
               </div>
               <input
                 type="url" required value={url} onChange={(e) => setUrl(e.target.value)}
                 placeholder={activeType === 'youtube' ? "Lien de la vidéo YouTube" : "Lien de la page web"} 
                 className="input-dark w-full"
               />
               <button disabled={loading} className="btn-primary w-full py-4 text-base">
                 {loading ? <Loader2 className="w-6 h-6 animate-spin mx-auto" /> : 'Extraire le contenu'}
               </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
