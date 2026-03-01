import { useState, useEffect } from 'react'
import api from '../services/api'
import { useConfirm } from '../contexts/ConfirmContext'
import {
  Plus,
  FileText,
  Edit,
  Trash2,
  Copy,
  Star,
  Search,
  Tag,
  Clock,
  TrendingUp,
  MessageSquare,
  RefreshCw,
  Loader2
} from 'lucide-react'
import { useTheme } from '../contexts/ThemeContext'
import toast from 'react-hot-toast'

export default function Templates() {
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const { showConfirm } = useConfirm()
  const [loading, setLoading] = useState(true)
  const [templates, setTemplates] = useState([])
  const [categories, setCategories] = useState([])
  const [popular, setPopular] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterCategory, setFilterCategory] = useState('')

  const [form, setForm] = useState({
    name: '',
    content: '',
    category: '',
    shortcut: ''
  })

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const [templatesRes, categoriesRes, popularRes] = await Promise.all([
        api.get('/templates'),
        api.get('/templates/categories'),
        api.get('/templates/popular')
      ])
      setTemplates(templatesRes.data.templates || [])
      setCategories(categoriesRes.data.categories || [])
      setPopular(popularRes.data.templates || [])
    } catch (error) {
      console.error('Error loading templates:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!form.name.trim() || !form.content.trim()) {
      toast.error('Nom et contenu requis')
      return
    }

    try {
      if (selectedTemplate) {
        await api.put(`/templates/${selectedTemplate.id}`, form)
        toast.success('Template mis à jour')
      } else {
        await api.post('/templates', form)
        toast.success('Template créé')
      }
      setShowModal(false)
      resetForm()
      loadData()
    } catch (error) {
      toast.error('Erreur lors de la sauvegarde')
    }
  }

  const handleDelete = async (id) => {
    const ok = await showConfirm({
      title: 'Supprimer le template',
      message: 'Supprimer définitivement ce template ? Cette action est irréversible.',
      variant: 'danger',
      confirmLabel: 'Supprimer'
    })
    if (!ok) return
    try {
      await api.delete(`/templates/${id}`)
      toast.success('Template supprimé')
      loadData()
    } catch (error) {
      toast.error('Erreur lors de la suppression')
    }
  }

  const copyToClipboard = async (template) => {
    const content = typeof template === 'string' ? template : template.content
    try {
      if (typeof template === 'object' && template?.id) {
        await api.post(`/templates/${template.id}/use`, { variables: {} })
      }
    } catch (_) { /* ignore */ }
    navigator.clipboard.writeText(content)
    toast.success('Copié dans le presse-papier')
  }

  const openEditModal = (template) => {
    setSelectedTemplate(template)
    setForm({
      name: template.name,
      content: template.content,
      category: template.category || '',
      shortcut: template.shortcut || ''
    })
    setShowModal(true)
  }

  const resetForm = () => {
    setForm({ name: '', content: '', category: '', shortcut: '' })
    setSelectedTemplate(null)
  }

  const filteredTemplates = templates.filter((t) => {
    const matchesSearch = t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.content.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = !filterCategory || t.category === filterCategory
    return matchesSearch && matchesCategory
  })

  const getCategoryColor = (category) => {
    const colors = {
      greeting: 'bg-emerald-500/20 text-emerald-400',
      closing: 'bg-blue-500/20 text-blue-400',
      followup: 'bg-blue-500/20 text-blue-400',
      faq: 'bg-orange-500/20 text-orange-400',
      sales: 'bg-gold-500/20 text-gold-400'
    }
    return colors[category] || 'bg-gray-500/20 text-gray-400'
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gold-400"></div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto w-full space-y-6 px-3 sm:px-4 min-w-0">
      {/* Header Hero */}
      <div className={`relative rounded-2xl sm:rounded-3xl border p-4 sm:p-8 mb-4 sm:mb-8 ${
        isDark ? 'bg-gradient-to-br from-space-800 via-space-900 to-space-800 border-space-700/50' : 'bg-gradient-to-br from-gray-50 via-white to-gray-50 border-gray-200'
      }`}>
        <div
          className="absolute inset-0 opacity-50"
          style={{ backgroundImage: `url(${isDark ? "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wMiI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMiIvPjwvZz48L2c+PC9zdmc+" : "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgdmlld0JveD0iMCAwIDYwIDYwIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiM2NDc0OGIiIGZpbGwtb3BhY2l0eT0iMC4wNiI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMiIvPjwvZz48L2c+PC9zdmc+"})` }}
          aria-hidden
        />
        <div className="relative z-10">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div className="min-w-0">
              <div className="flex items-center gap-3 mb-2 min-w-0">
                <div className="p-2 bg-blue-500/10 rounded-xl flex-shrink-0">
                  <FileText className="w-6 h-6 text-blue-400" />
                </div>
                <h1 className={`text-2xl sm:text-3xl font-display font-bold break-words ${isDark ? 'text-white' : 'text-gray-900'}`}>Modèles de messages</h1>
              </div>
              <p className={`text-base sm:text-lg break-words ${isDark ? 'text-gray-400' : 'text-gray-700'}`}>
                Réponses rapides et templates personnalisés
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 sm:gap-3 flex-shrink-0 relative z-20">
              <button
                type="button"
                onClick={() => loadData()}
                className={`flex items-center justify-center gap-2 px-4 py-2 rounded-xl transition-all duration-200 min-h-[44px] ${
                  isDark ? 'bg-space-800 text-gray-300 hover:bg-space-700 hover:text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">Actualiser</span>
              </button>
              <button
                onClick={() => {
                  resetForm()
                  setShowModal(true)
                }}
                className="btn-primary flex items-center gap-2 min-h-[44px]"
              >
                <Plus className="w-5 h-5" />
                <span>Nouveau template</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Popular Templates */}
      {popular.length > 0 && (
        <div className="card p-6">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-5 h-5 text-gold-400" />
            <h3 className="font-semibold text-gray-100">Templates populaires</h3>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {popular.slice(0, 5).map((t) => (
              <div
                key={t.id}
                onClick={() => copyToClipboard(t)}
                className="flex-shrink-0 p-3 bg-space-800 rounded-xl cursor-pointer hover:bg-space-700 transition-colors min-w-[200px] max-w-[250px]"
              >
                <p className="font-medium text-gray-100 text-sm mb-1 truncate">{t.name}</p>
                <p className="text-xs text-gray-400 line-clamp-2">{t.content}</p>
                <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
                  <Star className="w-3 h-3 text-gold-400" />
                  <span>{t.usage_count} utilisations</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-3 min-w-0 mb-6">
        <div className={`flex-1 flex items-center gap-3 px-4 py-3 sm:py-3.5 rounded-2xl border transition-all duration-300 ${
          isDark ? 'bg-space-800/50 border-space-700/50 focus-within:border-space-600' : 'bg-white border-gray-200 focus-within:border-gray-300 shadow-sm'
        }`}>
          <Search className="w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Rechercher un template..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="bg-transparent border-none p-0 focus:ring-0 w-full text-base sm:text-lg placeholder:text-gray-500"
          />
        </div>
        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          className={`px-4 py-3 sm:py-3.5 rounded-2xl border min-w-[150px] transition-all duration-300 ${
            isDark ? 'bg-space-800 focus:bg-space-700 border-space-700 text-gray-200' : 'bg-white border-gray-200 text-gray-700 shadow-sm'
          }`}
        >
          <option value="">Toutes les catégories</option>
          {categories.map((cat) => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
      </div>

      {/* Templates Grid */}
      {filteredTemplates.length === 0 ? (
        <div className="card p-12 text-center">
          <div className="w-16 h-16 rounded-2xl bg-gold-400/20 flex items-center justify-center mx-auto mb-4">
            <FileText className="w-8 h-8 text-gold-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-100 mb-2">Aucun template</h3>
          <p className="text-gray-400 mb-4">Créez des réponses types pour gagner du temps</p>
          <button onClick={() => setShowModal(true)} className="btn-primary">
            Créer un template
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTemplates.map((template) => (
            <div key={template.id} className="card p-5 hover:border-space-600 transition-colors group">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-xl bg-gold-400/20 flex items-center justify-center">
                    <MessageSquare className="w-5 h-5 text-gold-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-100">{template.name}</h3>
                    {template.shortcut && (
                      <code className="text-xs text-gray-500">/{template.shortcut}</code>
                    )}
                  </div>
                </div>
                <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                  <button
                    onClick={() => copyToClipboard(template)}
                    className="p-1.5 text-gray-400 hover:text-blue-400 hover:bg-blue-400/10 rounded-lg"
                    title="Copier"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => openEditModal(template)}
                    className="p-1.5 text-gray-400 hover:text-gold-400 hover:bg-gold-400/10 rounded-lg"
                    title="Modifier"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(template.id)}
                    className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-red-400/10 rounded-lg"
                    title="Supprimer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <p className="text-sm text-gray-400 line-clamp-3 mb-3">{template.content}</p>

              <div className="flex items-center justify-between text-xs">
                {template.category && (
                  <span className={`px-2 py-1 rounded-lg ${getCategoryColor(template.category)}`}>
                    {template.category}
                  </span>
                )}
                <span className="text-gray-500 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {template.usage_count || 0} utilisations
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
          <div className="relative z-10 card p-4 sm:p-6 w-full max-w-lg max-h-[90vh] sm:max-h-[85vh] flex flex-col rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden animate-fadeIn">
            <h2 className="text-xl font-display font-bold text-gray-100 mb-6">
              {selectedTemplate ? 'Modifier le template' : 'Nouveau template'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Nom *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="input"
                  placeholder="Ex: Message de bienvenue"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Catégorie</label>
                  <select
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    className="input"
                  >
                    <option value="">Aucune</option>
                    <option value="greeting">Accueil</option>
                    <option value="closing">Clôture</option>
                    <option value="followup">Suivi</option>
                    <option value="faq">FAQ</option>
                    <option value="sales">Vente</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Raccourci</label>
                  <div className="input-with-icon">
                    <div className="pl-3 flex items-center justify-center flex-shrink-0 text-gray-500">/</div>
                    <input
                      type="text"
                      value={form.shortcut}
                      onChange={(e) => setForm({ ...form, shortcut: e.target.value.replace(/[^a-z0-9]/g, '') })}
                      placeholder="bienvenue"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Contenu *</label>
                <textarea
                  value={form.content}
                  onChange={(e) => setForm({ ...form, content: e.target.value })}
                  className="input min-h-[150px]"
                  placeholder="Votre message ici..."
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  Variables: {'{{nom}}'}, {'{{telephone}}'}, {'{{produit}}'}
                </p>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false)
                    resetForm()
                  }}
                  className="btn-secondary"
                >
                  Annuler
                </button>
                <button type="submit" className="btn-primary">
                  {selectedTemplate ? 'Enregistrer' : 'Créer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
