import { useState, useEffect, useRef } from 'react'
import api from '../services/api'
import { useConfirm } from '../contexts/ConfirmContext'
import { useTheme } from '../contexts/ThemeContext'
import { useLockBodyScroll } from '../hooks/useLockBodyScroll'
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
  RefreshCw
} from 'lucide-react'
import toast from 'react-hot-toast'

// Icon for knowledge types
const KnowledgeTypeIcon = ({ type, className = "w-5 h-5" }) => {
  switch (type) {
    case 'pdf':
      return <FileText className={`${className} text-red-400`} />
    case 'youtube':
      return <Video className={`${className} text-red-500`} />
    case 'website':
      return <Globe className={`${className} text-blue-400`} />
    default:
      return <FileText className={`${className} text-blue-400`} />
  }
}

export default function KnowledgeBase() {
  const { showConfirm } = useConfirm()
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [showAddModal, setShowAddModal] = useState(false)
  const [expandedItem, setExpandedItem] = useState(null)

  useEffect(() => {
    loadKnowledge()
  }, [])

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

  const getTypeLabel = (type) => {
    switch (type) {
      case 'pdf': return 'PDF'
      case 'youtube': return 'YouTube'
      case 'website': return 'Site web'
      default: return 'Texte'
    }
  }

  const filteredItems = items.filter(item => {
    const matchesSearch = item.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         item.content?.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesType = typeFilter === 'all' || item.type === typeFilter
    return matchesSearch && matchesType
  })

  // Stats
  const stats = {
    total: items.length,
    text: items.filter(i => i.type === 'text').length,
    pdf: items.filter(i => i.type === 'pdf').length,
    youtube: items.filter(i => i.type === 'youtube').length,
    website: items.filter(i => i.type === 'website').length,
    totalChars: items.reduce((sum, i) => sum + (i.content?.length || 0), 0)
  }

  const patternDark = "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wMiI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMiIvPjwvZz48L2c+PC9zdmc+"
  const patternLight = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgdmlld0JveD0iMCAwIDYwIDYwIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiM2NDc0OGIiIGZpbGwtb3BhY2l0eT0iMC4wNiI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMiIvPjwvZz48L2c+PC9zdmc+"

  return (
    <div className="space-y-6">
      {/* Header Hero - theme-aware */}
      <div className={`relative overflow-hidden rounded-3xl border p-4 sm:p-8 ${
        isDark ? 'bg-gradient-to-br from-space-800 via-space-900 to-space-950 border-space-700' : 'bg-gradient-to-br from-gray-50 via-white to-gray-50 border-gray-200'
      }`}>
        <div
          className="absolute inset-0 opacity-50"
          style={{ backgroundImage: `url(${isDark ? patternDark : patternLight})` }}
          aria-hidden
        />
        <div className="relative z-10">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div className="min-w-0">
              <h1 className={`text-3xl font-display font-bold mb-2 truncate ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>
                Base de Connaissances
              </h1>
              <p className={isDark ? 'text-gray-400' : 'text-gray-700'}>
                Centralisez les informations partagées par tous vos agents
              </p>
            </div>
            <button
              onClick={() => setShowAddModal(true)}
              className="btn-primary inline-flex items-center justify-center gap-2 flex-shrink-0 touch-target"
            >
              <Plus className="w-5 h-5" />
              Ajouter du contenu
            </button>
          </div>

          {/* Stats - theme-aware */}
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mt-8">
            <div className={`backdrop-blur-sm rounded-2xl p-4 border ${isDark ? 'bg-space-800/50 border-space-700' : 'bg-white/80 border-gray-200'}`}>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-500/20 rounded-xl">
                  <Database className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <p className={`text-2xl font-bold ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>{stats.total}</p>
                  <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-600'}`}>Total</p>
                </div>
              </div>
            </div>
            <div className={`backdrop-blur-sm rounded-2xl p-4 border ${isDark ? 'bg-space-800/50 border-space-700' : 'bg-white/80 border-gray-200'}`}>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-500/20 rounded-xl">
                  <FileText className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <p className={`text-2xl font-bold ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>{stats.text}</p>
                  <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-600'}`}>Texte</p>
                </div>
              </div>
            </div>
            <div className={`backdrop-blur-sm rounded-2xl p-4 border ${isDark ? 'bg-space-800/50 border-space-700' : 'bg-white/80 border-gray-200'}`}>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-500/20 rounded-xl">
                  <FileText className="w-5 h-5 text-red-400" />
                </div>
                <div>
                  <p className={`text-2xl font-bold ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>{stats.pdf}</p>
                  <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-600'}`}>PDF</p>
                </div>
              </div>
            </div>
            <div className={`backdrop-blur-sm rounded-2xl p-4 border ${isDark ? 'bg-space-800/50 border-space-700' : 'bg-white/80 border-gray-200'}`}>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-500/20 rounded-xl">
                  <Video className="w-5 h-5 text-red-500" />
                </div>
                <div>
                  <p className={`text-2xl font-bold ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>{stats.youtube}</p>
                  <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-600'}`}>YouTube</p>
                </div>
              </div>
            </div>
            <div className={`backdrop-blur-sm rounded-2xl p-4 border ${isDark ? 'bg-space-800/50 border-space-700' : 'bg-white/80 border-gray-200'}`}>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-500/20 rounded-xl">
                  <Globe className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <p className={`text-2xl font-bold ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>{stats.website}</p>
                  <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-600'}`}>Sites web</p>
                </div>
              </div>
            </div>
            <div className={`backdrop-blur-sm rounded-2xl p-4 border ${isDark ? 'bg-space-800/50 border-space-700' : 'bg-white/80 border-gray-200'}`}>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gold-400/20 rounded-xl">
                  <BookOpen className="w-5 h-5 text-gold-400" />
                </div>
                <div>
                  <p className={`text-2xl font-bold ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>{(stats.totalChars / 1000).toFixed(0)}k</p>
                  <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-600'}`}>Caractères</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filters - theme-aware */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-icon" />
          <input
            type="text"
            placeholder="Rechercher dans la base de connaissances..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`w-full pl-12 py-2.5 rounded-xl border focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/50 ${
              isDark ? 'input-dark bg-space-800 border-space-700' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
            }`}
          />
        </div>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className={`min-w-[150px] py-2.5 rounded-xl border focus:outline-none focus:ring-2 focus:ring-blue-500/20 ${
            isDark ? 'input-dark bg-space-800 border-space-700' : 'bg-white border-gray-300 text-gray-900'
          }`}
        >
          <option value="all">Tous types</option>
          <option value="text">Texte</option>
          <option value="pdf">PDF</option>
          <option value="youtube">YouTube</option>
          <option value="website">Site web</option>
        </select>
      </div>

      {/* Load error + Retry */}
      {loadError && (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-6 text-center mb-6">
          <p className="text-red-300 mb-3">{loadError}</p>
          <button
            type="button"
            onClick={() => loadKnowledge()}
            className="inline-flex items-center gap-2 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-200 rounded-xl font-medium transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Réessayer
          </button>
        </div>
      )}

      {/* Knowledge Items List */}
      {!loadError && loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
        </div>
      ) : !loadError && filteredItems.length === 0 ? (
        <div className="text-center py-20">
          <div className={`w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-6 ${isDark ? 'bg-space-800' : 'bg-gray-100'}`}>
            <BookOpen className="w-10 h-10 text-icon" />
          </div>
          <h3 className={`text-xl font-semibold mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
            {items.length === 0 ? 'Base de connaissances vide' : 'Aucun résultat'}
          </h3>
          <p className={`mb-6 ${isDark ? 'text-gray-500' : 'text-gray-600'}`}>
            {items.length === 0 
              ? 'Ajoutez du contenu pour enrichir vos agents IA'
              : 'Essayez de modifier vos filtres de recherche'}
          </p>
          {items.length === 0 && (
            <button
              onClick={() => setShowAddModal(true)}
              className="btn-primary inline-flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              Ajouter du contenu
            </button>
          )}
        </div>
      ) : !loadError ? (
        <div className="space-y-3">
          {filteredItems.map((item, index) => {
            const metadata = typeof item.metadata === 'string' ? JSON.parse(item.metadata || '{}') : (item.metadata || {})
            return (
              <div 
                key={item.id} 
                className={`p-4 rounded-2xl border transition-colors animate-fadeIn ${
                  isDark ? 'card hover:border-space-600 bg-space-800/30 border-space-700' : 'bg-white border-gray-200 hover:border-gray-300'
                }`}
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div className="flex items-start gap-4">
                  <div className={`p-2 rounded-xl flex-shrink-0 ${isDark ? 'bg-space-800' : 'bg-gray-100'}`}>
                    <KnowledgeTypeIcon type={item.type} className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <div>
                        <h3 className={`font-medium ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>{item.title}</h3>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={`text-xs px-2 py-0.5 rounded-full ${isDark ? 'bg-space-800 text-gray-400' : 'bg-gray-100 text-gray-600'}`}>
                            {getTypeLabel(item.type)}
                          </span>
                          <span className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-600'}`}>
                            {item.content?.length?.toLocaleString()} caractères
                          </span>
                          {metadata?.sourceUrl && (
                            <a 
                              href={metadata.sourceUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <ExternalLink className="w-3 h-3" />
                              Source
                            </a>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setExpandedItem(expandedItem === item.id ? null : item.id)}
                          className={`p-1.5 transition-colors ${isDark ? 'text-gray-500 hover:text-gray-300' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                          {expandedItem === item.id ? (
                            <ChevronUp className="w-4 h-4" />
                          ) : (
                            <ChevronDown className="w-4 h-4" />
                          )}
                        </button>
                        <button
                          onClick={() => handleDelete(item.id)}
                          className="p-1.5 text-gray-500 hover:text-red-400 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    
                    {/* Preview */}
                    {expandedItem !== item.id && (
                      <p className={`text-sm line-clamp-2 mt-2 ${isDark ? 'text-gray-500' : 'text-gray-600'}`}>
                        {item.content}
                      </p>
                    )}
                    
                    {/* Full content */}
                    {expandedItem === item.id && (
                      <div className={`mt-3 p-4 rounded-xl max-h-80 overflow-y-auto ${isDark ? 'bg-space-800' : 'bg-gray-50'}`}>
                        <pre className={`text-sm whitespace-pre-wrap font-sans ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                          {item.content}
                        </pre>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      ) : null}

      {/* Add Modal */}
      {showAddModal && (
        <AddKnowledgeModal
          onClose={() => setShowAddModal(false)}
          onAdded={() => {
            setShowAddModal(false)
            loadKnowledge()
          }}
        />
      )}
    </div>
  )
}

function AddKnowledgeModal({ onClose, onAdded }) {
  useLockBodyScroll(true)
  const [activeType, setActiveType] = useState('text')
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const fileInputRef = useRef(null)

  const typeOptions = [
    { id: 'text', label: 'Texte', icon: FileText, color: 'blue' },
    { id: 'pdf', label: 'PDF', icon: FileText, color: 'red' },
    { id: 'youtube', label: 'YouTube', icon: Video, color: 'red' },
    { id: 'website', label: 'Site web', icon: Globe, color: 'blue' },
  ]

  const handleTextSubmit = async (e) => {
    e.preventDefault()
    if (!title.trim() || !content.trim()) {
      toast.error('Titre et contenu requis')
      return
    }
    setLoading(true)
    try {
      await api.post('/knowledge/global', { title, content, type: 'text' })
      toast.success('Ajouté à la base de connaissances')
      onAdded()
    } catch (error) {
      toast.error(error.response?.data?.error || 'Erreur')
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
      toast.success('Contenu extrait et ajouté')
      onAdded()
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
      toast.success('Fichier ajouté')
      onAdded()
    } catch (error) {
      toast.error(error.response?.data?.error || 'Erreur lors de l\'upload')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="fixed inset-0 bg-space-950/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-2xl bg-space-900 border border-space-700 rounded-t-2xl sm:rounded-3xl shadow-2xl max-h-[90vh] sm:max-h-[80vh] flex flex-col animate-fadeIn">
        <div className="flex-shrink-0 p-4 sm:p-6 border-b border-space-700">
          <div className="flex items-center justify-between">
            <h2 className="text-lg sm:text-xl font-display font-semibold text-gray-100">
              Ajouter à la base de connaissances
            </h2>
            <button onClick={onClose} className="p-2 -m-2 text-gray-500 hover:text-gray-300 touch-target" aria-label="Fermer">
              <X className="w-5 h-5" />
            </button>
          </div>
          
          {/* Type selector */}
          <div className="grid grid-cols-4 gap-2 mt-4">
            {typeOptions.map((option) => {
              const Icon = option.icon
              const isActive = activeType === option.id
              const colorClasses = {
                blue: isActive ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' : '',
                red: isActive ? 'bg-red-500/20 text-red-400 border-red-500/30' : '',
              }
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setActiveType(option.id)}
                  className={`flex flex-col items-center gap-1.5 px-3 py-3 rounded-xl text-sm font-medium transition-all border ${
                    isActive
                      ? colorClasses[option.color]
                      : 'bg-space-800 text-gray-400 hover:text-gray-300 border-transparent hover:border-space-600'
                  }`}
                >
                  <Icon className={`w-5 h-5 ${
                    option.id === 'youtube' ? 'text-red-500' : 
                    option.id === 'pdf' ? 'text-red-400' : 
                    option.id === 'website' ? 'text-blue-400' : ''
                  }`} />
                  {option.label}
                </button>
              )
            })}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto min-h-0 p-4 sm:p-6">
          {/* Text input */}
          {activeType === 'text' && (
            <form onSubmit={handleTextSubmit} className="space-y-4">
              <div className="flex items-center gap-3 p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl mb-4">
                <FileText className="w-6 h-6 text-blue-400" />
                <div>
                  <p className="text-sm font-medium text-blue-400">Texte personnalisé</p>
                  <p className="text-xs text-gray-400">Ajoutez des informations pour vos agents</p>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Titre *</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ex: Politique de retour"
                  className="input-dark w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Contenu *</label>
                <textarea
                  required
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Informations..."
                  rows={8}
                  className="input-dark w-full resize-none"
                />
                <p className="text-xs text-gray-500 mt-1">{content.length.toLocaleString()} caractères</p>
              </div>
              <div className="flex flex-col-reverse sm:flex-row gap-3 pt-2">
                <button type="button" onClick={onClose} className="btn-secondary flex-1 sm:flex-none min-h-[44px] touch-target">
                  Annuler
                </button>
                <button type="submit" disabled={loading} className="btn-primary flex-1 sm:flex-none min-h-[44px] touch-target disabled:opacity-50">
                  {loading ? 'Ajout...' : 'Ajouter'}
                </button>
              </div>
            </form>
          )}

          {/* YouTube input */}
          {activeType === 'youtube' && (
            <form onSubmit={handleUrlSubmit} className="space-y-4">
              <div className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-xl mb-4">
                <Video className="w-6 h-6 text-red-500" />
                <div>
                  <p className="text-sm font-medium text-red-400">Vidéo YouTube</p>
                  <p className="text-xs text-gray-400">La transcription sera automatiquement extraite</p>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">URL YouTube *</label>
                <input
                  type="url"
                  required
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://youtube.com/watch?v=..."
                  className="input-dark w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Titre (optionnel)</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Sera extrait automatiquement"
                  className="input-dark w-full"
                />
              </div>
              <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                <p className="text-xs text-amber-400">
                  <strong>Note :</strong> Seules les vidéos avec sous-titres peuvent être extraites.
                </p>
              </div>
              <div className="flex flex-col-reverse sm:flex-row gap-3 pt-2">
                <button type="button" onClick={onClose} className="btn-secondary flex-1 sm:flex-none min-h-[44px] touch-target">
                  Annuler
                </button>
                <button type="submit" disabled={loading} className="btn-primary flex-1 sm:flex-none min-h-[44px] touch-target disabled:opacity-50">
                  {loading ? 'Extraction...' : 'Extraire'}
                </button>
              </div>
            </form>
          )}

          {/* Website input */}
          {activeType === 'website' && (
            <form onSubmit={handleUrlSubmit} className="space-y-4">
              <div className="flex items-center gap-3 p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl mb-4">
                <Globe className="w-6 h-6 text-blue-500" />
                <div>
                  <p className="text-sm font-medium text-blue-400">Page web</p>
                  <p className="text-xs text-gray-400">Le contenu textuel sera extrait</p>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">URL *</label>
                <input
                  type="url"
                  required
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://example.com/page"
                  className="input-dark w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Titre (optionnel)</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Sera extrait automatiquement"
                  className="input-dark w-full"
                />
              </div>
              <div className="flex flex-col-reverse sm:flex-row gap-3 pt-2">
                <button type="button" onClick={onClose} className="btn-secondary flex-1 sm:flex-none min-h-[44px] touch-target">
                  Annuler
                </button>
                <button type="submit" disabled={loading} className="btn-primary flex-1 sm:flex-none min-h-[44px] touch-target disabled:opacity-50">
                  {loading ? 'Extraction...' : 'Extraire'}
                </button>
              </div>
            </form>
          )}

          {/* PDF upload */}
          {activeType === 'pdf' && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-xl mb-4">
                <FileText className="w-6 h-6 text-red-400" />
                <div>
                  <p className="text-sm font-medium text-red-400">Document PDF</p>
                  <p className="text-xs text-gray-400">Le texte sera extrait automatiquement</p>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Titre (optionnel)</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Sera extrait du nom de fichier"
                  className="input-dark w-full"
                />
              </div>
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-red-500/30 hover:border-red-500/50 rounded-2xl p-8 text-center cursor-pointer transition-colors bg-red-500/5"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <div className="w-16 h-16 bg-red-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <FileText className="w-8 h-8 text-red-400" />
                </div>
                <p className="text-gray-300 font-medium mb-2">
                  {loading ? 'Extraction en cours...' : 'Cliquez pour sélectionner un PDF'}
                </p>
                <p className="text-sm text-gray-500">Maximum 10 MB</p>
              </div>
              <div className="flex flex-col-reverse sm:flex-row gap-3 pt-2">
                <button type="button" onClick={onClose} className="btn-secondary flex-1 sm:flex-none min-h-[44px] touch-target">
                  Annuler
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
