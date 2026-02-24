import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../services/api'
import { useTheme } from '../contexts/ThemeContext'
import { useConfirm } from '../contexts/ConfirmContext'
import toast from 'react-hot-toast'
import {
  Plus,
  Search,
  GitBranch,
  Trash2,
  Edit2,
  Play,
  Pause,
  Copy,
  X,
  Loader2,
  Settings,
  Zap,
  LayoutTemplate
} from 'lucide-react'

export default function Flows() {
  const navigate = useNavigate()
  const { isDark } = useTheme()
  const { showConfirm } = useConfirm()
  const [flows, setFlows] = useState([])
  const [templates, setTemplates] = useState([])
  const [agents, setAgents] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const [flowsRes, templatesRes, agentsRes] = await Promise.all([
        api.get('/flows'),
        api.get('/flows/config/templates'),
        api.get('/agents')
      ])
      setFlows(Array.isArray(flowsRes.data?.flows) ? flowsRes.data.flows : [])
      setTemplates(Array.isArray(templatesRes.data?.templates) ? templatesRes.data.templates : [])
      setAgents(Array.isArray(agentsRes.data?.agents) ? agentsRes.data.agents : [])
    } catch (error) {
      console.error('Error loading flows:', error)
      toast.error(error.response?.data?.error || 'Erreur lors du chargement des flows')
      setFlows([])
      setTemplates([])
      setAgents([])
    } finally {
      setLoading(false)
    }
  }

  const handleToggle = async (id, isActive) => {
    try {
      await api.post(`/flows/${id}/toggle`)
      toast.success(isActive ? 'Flow désactivé' : 'Flow activé')
      loadData()
    } catch (error) {
      toast.error('Erreur')
    }
  }

  const handleDuplicate = async (id) => {
    try {
      await api.post(`/flows/${id}/duplicate`)
      toast.success('Flow dupliqué')
      loadData()
    } catch (error) {
      toast.error('Erreur lors de la duplication')
    }
  }

  const handleDelete = async (id) => {
    const ok = await showConfirm({
      title: 'Supprimer ce flow',
      message: 'Cette action est irréversible.',
      variant: 'danger',
      confirmLabel: 'Supprimer'
    })
    if (!ok) return
    try {
      await api.delete(`/flows/${id}`)
      toast.success('Flow supprimé')
      loadData()
    } catch (error) {
      toast.error('Erreur lors de la suppression')
    }
  }

  const filteredFlows = flows.filter(f =>
    f.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const activeFlows = flows.filter(f => f.is_active).length

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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className={`text-2xl font-display font-bold ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>
            🔀 Flow Builder
          </h1>
          <p className={isDark ? 'text-gray-400' : 'text-gray-600'}>
            Créez des parcours conversationnels visuels
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="btn-primary flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Nouveau flow
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className={`p-4 rounded-xl border ${isDark ? 'bg-space-800 border-space-700' : 'bg-white border-gray-200'}`}>
          <p className={`text-2xl font-bold ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>
            {flows.length}
          </p>
          <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Total flows</p>
        </div>
        <div className={`p-4 rounded-xl border ${isDark ? 'bg-space-800 border-space-700' : 'bg-white border-gray-200'}`}>
          <p className="text-2xl font-bold text-emerald-500">{activeFlows}</p>
          <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Actifs</p>
        </div>
        <div className={`p-4 rounded-xl border ${isDark ? 'bg-space-800 border-space-700' : 'bg-white border-gray-200'}`}>
          <p className={`text-2xl font-bold ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>
            {flows.reduce((sum, f) => sum + (f.nodes?.length || 0), 0)}
          </p>
          <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Noeuds total</p>
        </div>
        <div className={`p-4 rounded-xl border ${isDark ? 'bg-space-800 border-space-700' : 'bg-white border-gray-200'}`}>
          <p className={`text-2xl font-bold text-blue-500`}>{templates.length}</p>
          <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Templates</p>
        </div>
      </div>

      {/* Search */}
      <div className="input-with-icon">
        <div className="pl-3 flex items-center justify-center flex-shrink-0 text-icon">
          <Search className="w-5 h-5" />
        </div>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Rechercher un flow..."
        />
      </div>

      {/* Flows Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredFlows.length === 0 ? (
          <div className={`col-span-full text-center py-12 rounded-xl border ${
            isDark ? 'bg-space-800 border-space-700' : 'bg-white border-gray-200'
          }`}>
            <GitBranch className="w-12 h-12 mx-auto mb-4 text-icon" />
            <h3 className={`text-lg font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
              Aucun flow
            </h3>
            <p className={isDark ? 'text-gray-500' : 'text-gray-600'}>
              Créez votre premier flow pour guider vos conversations
            </p>
          </div>
        ) : (
          filteredFlows.map((flow, index) => (
            <div
              key={flow.id}
              className={`p-4 rounded-xl border cursor-pointer transition-all hover:shadow-lg animate-fadeIn ${
                isDark ? 'bg-space-800 border-space-700 hover:border-space-600' : 'bg-white border-gray-200 hover:border-gray-300'
              }`}
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    flow.is_active
                      ? 'bg-emerald-500/20 text-emerald-400'
                      : isDark ? 'bg-space-700 text-gray-500' : 'bg-gray-100 text-gray-400'
                  }`}>
                    <GitBranch className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className={`font-medium ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>
                      {flow.name}
                    </h3>
                    <span className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
                      {flow.nodes?.length || 0} noeuds
                    </span>
                  </div>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                  flow.is_active
                    ? 'bg-emerald-500/20 text-emerald-400'
                    : 'bg-gray-500/20 text-gray-400'
                }`}>
                  {flow.is_active ? 'Actif' : 'Inactif'}
                </span>
              </div>

              {flow.description && (
                <p className={`text-sm mb-3 line-clamp-2 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                  {flow.description}
                </p>
              )}

              {/* Mini preview */}
              <div className={`h-20 rounded-lg mb-3 flex items-center justify-center ${
                isDark ? 'bg-space-900' : 'bg-gray-50'
              }`}>
                <div className="flex items-center gap-1">
                  {(flow.nodes || []).slice(0, 5).map((node, i) => (
                    <div
                      key={i}
                      className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs ${
                        isDark ? 'bg-space-800' : 'bg-white border'
                      }`}
                      title={node.data?.label}
                    >
                      {node.type === 'start' ? '▶' : 
                       node.type === 'message' ? '💬' : 
                       node.type === 'question' ? '❓' :
                       node.type === 'end' ? '⏹' : '•'}
                    </div>
                  ))}
                  {(flow.nodes?.length || 0) > 5 && (
                    <span className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                      +{(flow.nodes?.length || 0) - 5}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className={`text-xs truncate min-w-0 ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
                  {flow.agent_name || 'Tous les agents'}
                </span>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    onClick={(e) => { e.stopPropagation(); handleToggle(flow.id, flow.is_active); }}
                    className={`p-1.5 rounded-lg transition-colors ${
                      flow.is_active
                        ? 'bg-emerald-500/20 text-emerald-400'
                        : isDark ? 'bg-space-700 text-gray-400' : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {flow.is_active ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); navigate(`/dashboard/flows/${flow.id}`); }}
                    className={`p-1.5 rounded-lg text-icon ${isDark ? 'hover:bg-space-700' : 'hover:bg-gray-100'}`}
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDuplicate(flow.id); }}
                    className={`p-1.5 rounded-lg text-icon ${isDark ? 'hover:bg-space-700' : 'hover:bg-gray-100'}`}
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDelete(flow.id); }}
                    className="p-1.5 rounded-lg hover:bg-red-500/20 text-red-400"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <CreateFlowModal
          agents={agents}
          templates={templates}
          onClose={() => setShowCreateModal(false)}
          onSuccess={loadData}
          isDark={isDark}
        />
      )}
    </div>
  )
}

function CreateFlowModal({ agents, templates, onClose, onSuccess, isDark }) {
  const navigate = useNavigate()
  const [form, setForm] = useState({
    name: '',
    description: '',
    agent_id: '',
    template: null
  })
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      const template = templates.find(t => t.id === form.template)
      
      const res = await api.post('/flows', {
        name: form.name,
        description: form.description,
        agent_id: form.agent_id || null,
        nodes: template?.nodes || [],
        edges: template?.edges || []
      })
      
      toast.success('Flow créé')
      onSuccess()
      onClose()
      navigate(`/dashboard/flows/${res.data.flow.id}`)
    } catch (error) {
      toast.error(error.response?.data?.error || 'Erreur')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      
      <div className={`relative w-full max-w-lg rounded-2xl border ${
        isDark ? 'bg-space-900 border-space-700' : 'bg-white border-gray-200'
      }`}>
        <div className={`p-4 border-b flex items-center justify-between ${
          isDark ? 'border-space-700' : 'border-gray-200'
        }`}>
          <h2 className={`text-lg font-display font-bold ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>
            Nouveau flow
          </h2>
          <button onClick={onClose} className="text-icon hover:opacity-80">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
              Nom du flow
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className={`w-full px-4 py-2 rounded-lg border ${
                isDark ? 'bg-space-800 border-space-700 text-gray-100' : 'bg-white border-gray-200'
              }`}
              placeholder="Ex: Accueil et qualification"
              required
            />
          </div>

          <div>
            <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
              Description (optionnel)
            </label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className={`w-full px-4 py-2 rounded-lg border h-20 ${
                isDark ? 'bg-space-800 border-space-700 text-gray-100' : 'bg-white border-gray-200'
              }`}
              placeholder="Décrivez le but de ce flow..."
            />
          </div>

          <div>
            <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
              Agent (optionnel)
            </label>
            <select
              value={form.agent_id}
              onChange={(e) => setForm({ ...form, agent_id: e.target.value })}
              className={`w-full px-4 py-2 rounded-lg border ${
                isDark ? 'bg-space-800 border-space-700 text-gray-100' : 'bg-white border-gray-200'
              }`}
            >
              <option value="">Tous les agents</option>
              {agents.map(agent => (
                <option key={agent.id} value={agent.id}>{agent.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
              Commencer avec un template
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setForm({ ...form, template: null })}
                className={`p-3 rounded-lg border-2 text-left transition-all ${
                  form.template === null
                    ? 'border-gold-400 bg-gold-400/10'
                    : isDark ? 'border-space-700 hover:border-space-600' : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <Zap className={`w-5 h-5 mb-1 ${form.template === null ? 'text-gold-400' : isDark ? 'text-gray-500' : 'text-gray-400'}`} />
                <p className={`text-sm font-medium ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>Vide</p>
                <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>Partir de zéro</p>
              </button>
              
              {templates.map(template => (
                <button
                  key={template.id}
                  type="button"
                  onClick={() => setForm({ ...form, template: template.id })}
                  className={`p-3 rounded-lg border-2 text-left transition-all ${
                    form.template === template.id
                      ? 'border-gold-400 bg-gold-400/10'
                      : isDark ? 'border-space-700 hover:border-space-600' : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <LayoutTemplate className={`w-5 h-5 mb-1 ${form.template === template.id ? 'text-gold-400' : isDark ? 'text-gray-500' : 'text-gray-400'}`} />
                  <p className={`text-sm font-medium ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>{template.name}</p>
                  <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>{template.description}</p>
                </button>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button type="button" onClick={onClose} className="btn-secondary">
              Annuler
            </button>
            <button type="submit" disabled={saving} className="btn-primary flex items-center gap-2">
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              Créer
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
