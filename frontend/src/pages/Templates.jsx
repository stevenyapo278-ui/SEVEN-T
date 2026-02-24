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
  MessageSquare
} from 'lucide-react'
import toast from 'react-hot-toast'

export default function Templates() {
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
      followup: 'bg-violet-500/20 text-violet-400',
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-display font-bold text-gray-100">Modèles de messages</h1>
          <p className="text-gray-400 text-sm sm:text-base">Réponses rapides et templates personnalisés</p>
        </div>
        <button
          onClick={() => {
            resetForm()
            setShowModal(true)
          }}
          className="btn-primary flex items-center justify-center gap-2 flex-shrink-0 touch-target"
        >
          <Plus className="w-5 h-5" />
          Nouveau template
        </button>
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

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="input-with-icon flex-1 max-w-md">
          <div className="pl-3 flex items-center justify-center flex-shrink-0 text-gray-400">
            <Search className="w-5 h-5" />
          </div>
          <input
            type="text"
            placeholder="Rechercher un template..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          className="input max-w-[200px]"
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
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="card p-6 w-full max-w-lg">
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
