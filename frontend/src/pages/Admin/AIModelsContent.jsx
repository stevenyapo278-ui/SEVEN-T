import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { 
  RefreshCw, Plus, Loader2, Database, Clock, CheckCircle, 
  Key, Eye, EyeOff, Settings, TestTube, Cpu, Edit, Trash2, 
  BarChart3, X, Zap, AlertTriangle, AlertCircle
} from 'lucide-react'
import api from '../../services/api'
import toast from 'react-hot-toast'

export default function AIModelsContent({ 
  models, apiKeys, stats, loading, 
  platformSettings = {}, savingMediaModel, onSaveMediaModel, 
  savingEmbeddingModel, onSaveEmbeddingModel,
  reindexingAll, onReindexAll,
  onSaveTrialDays, savingTrialDays,
  onToggleModel, onDeleteModel, onEditModel, onCreateModel,
  onEditKey, onTestKey, onTestModel, onRefresh 
}) {
  const [showKeys, setShowKeys] = useState({})
  const [trialDaysInput, setTrialDaysInput] = useState(platformSettings.default_trial_days || '7')
  const [cbHealth, setCbHealth] = useState(null)
  const [resettingCb, setResettingCb] = useState({})
  const mediaModelValue = platformSettings.default_media_model || 'gemini-1.5-flash'
  const embeddingModelValue = platformSettings.embedding_model || 'gemini-embedding-001'

  const loadCbHealth = async () => {
    try {
      const res = await api.get('/admin/ai/health')
      setCbHealth(res.data)
    } catch (e) { /* silent */ }
  }

  const resetCb = async (provider) => {
    setResettingCb(p => ({ ...p, [provider]: true }))
    try {
      await api.post(`/admin/ai/health/${provider}/reset`)
      toast.success(`Circuit breaker ${provider} réinitialisé ✅`)
      await loadCbHealth()
    } catch (e) {
      toast.error('Erreur lors du reset')
    } finally {
      setResettingCb(p => ({ ...p, [provider]: false }))
    }
  }

  useEffect(() => { loadCbHealth() }, [])

  // Sync input if platformSettings changes externally
  useEffect(() => {
    setTrialDaysInput(platformSettings.default_trial_days || '7')
  }, [platformSettings.default_trial_days])

  const MEDIA_MODEL_OPTIONS = [
    { value: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash - Ultrarapide' },
    { value: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash - Dernier modèle' },
    { value: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash - Très rapide' },
    { value: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro - Plus précis' }
  ]
  const EMBEDDING_MODEL_OPTIONS = [
    { value: 'gemini-embedding-001', label: 'Gemini Embedding 001 (Standard)' },
    { value: 'text-embedding-004', label: 'Text Embedding 004 (Performance)' }
  ]

  const getProviderColor = (provider) => {
    switch (provider) {
      case 'gemini': return 'bg-blue-500/20 text-blue-400 border-blue-500/30'
      case 'openai': return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
      case 'openrouter': return 'bg-blue-500/20 text-blue-400 border-blue-500/30'
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30'
    }
  }

  const getCategoryIcon = (category) => {
    switch (category) {
      case 'fast': return '[Rapide]'
      case 'smart': return '[Intelligent]'
      case 'free': return '[Gratuit]'
      default: return '[Général]'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-display font-semibold text-gray-100">Modèles IA</h2>
          <p className="text-gray-400 text-sm">Gérez les modèles et clés API disponibles</p>
        </div>
        <div className="flex gap-2">
          <button onClick={onRefresh} className="p-2 text-gray-400 hover:text-gray-100 transition-colors">
            <RefreshCw className="w-5 h-5" />
          </button>
          <button onClick={onCreateModel} className="btn-primary inline-flex items-center gap-2">
            <Plus className="w-5 h-5" />
            Nouveau modèle
          </button>
        </div>
      </div>

      {/* Stats Overview */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="card p-4">
            <p className="text-2xl font-bold text-gray-100">{stats.activeModels}</p>
            <p className="text-xs text-gray-500">Modèles actifs</p>
          </div>
          <div className="card p-4">
            <p className="text-2xl font-bold text-blue-400">{stats.overall?.total_requests?.toLocaleString() || 0}</p>
            <p className="text-xs text-gray-500">Requêtes totales</p>
          </div>
          <div className="card p-4">
            <p className="text-2xl font-bold text-gold-400">{stats.overall?.total_credits?.toLocaleString() || 0}</p>
            <p className="text-xs text-gray-500">Crédits utilisés</p>
          </div>
          <div className="card p-4">
            <p className="text-2xl font-bold text-emerald-400">{stats.overall?.avg_response_time || 0}ms</p>
            <p className="text-xs text-gray-500">Temps moyen</p>
          </div>
          <div className="card p-4">
            <p className="text-2xl font-bold text-red-400">{stats.overall?.error_rate || 0}%</p>
            <p className="text-xs text-gray-500">Taux d'erreur</p>
          </div>
        </div>
      )}

      {/* Default model for images & voice */}
      <div className="card p-6">
        <h3 className="text-lg font-semibold text-gray-100 mb-2">Modèle pour images et notes vocales</h3>
        <p className="text-gray-400 text-sm mb-4">
          Modèle IA utilisé par défaut pour l&apos;analyse des photos et des notes vocales envoyées par les clients.
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={MEDIA_MODEL_OPTIONS.some(o => o.value === mediaModelValue) ? mediaModelValue : 'gemini-1.5-flash'}
            onChange={(e) => onSaveMediaModel(e.target.value)}
            disabled={savingMediaModel}
            className="input-dark max-w-md"
          >
            {MEDIA_MODEL_OPTIONS.map(opt => (
               <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          {savingMediaModel && <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />}
        </div>
      </div>

      {/* Embedding model for RAG */}
      <div className="card p-6 border-blue-500/20 bg-blue-500/5">
        <h3 className="text-lg font-semibold text-gray-100 mb-2 flex items-center gap-2">
          <Database className="w-5 h-5 text-blue-400" />
          Modèle d&apos;Embeddings (RAG)
        </h3>
        <p className="text-gray-400 text-sm mb-4">
          Modèle utilisé pour vectoriser la base de connaissance. <span className="text-amber-400">Attention :</span> changer ce modèle nécessitera de ré-indexer toutes les connaissances existantes pour rester compatible.
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={embeddingModelValue}
            onChange={(e) => onSaveEmbeddingModel(e.target.value)}
            disabled={savingEmbeddingModel}
            className="input-dark max-w-md border-blue-500/30"
          >
            {EMBEDDING_MODEL_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          {savingEmbeddingModel && <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />}
          
          <button
            onClick={onReindexAll}
            disabled={reindexingAll}
            className="btn-secondary ml-auto flex items-center gap-2 border-amber-500/30 text-amber-400 hover:bg-amber-500/10"
          >
            {reindexingAll ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            Ré-indexer toute la base
          </button>
        </div>
      </div>

      {/* Trial Duration Setting */}
      <div className="card p-6">
        <h3 className="text-lg font-semibold text-gray-100 mb-2 flex items-center gap-2">
          <Clock className="w-5 h-5 text-amber-400" />
          Durée d&apos;essai gratuit
        </h3>
        <p className="text-gray-400 text-sm mb-4">
          Nombre de jours accordés aux nouveaux inscrits pour tester la plateforme gratuitement. Cette valeur s&apos;applique aux nouvelles inscriptions uniquement.
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <input
            type="number"
            min={1}
            max={365}
            value={trialDaysInput}
            onChange={(e) => setTrialDaysInput(e.target.value)}
            className="input-dark w-32 text-center text-lg font-bold"
          />
          <span className="text-gray-400 text-sm">jours</span>
          <button
            onClick={() => onSaveTrialDays?.(trialDaysInput)}
            disabled={savingTrialDays}
            className="btn-primary flex items-center gap-2 disabled:opacity-50"
          >
            {savingTrialDays ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
            Enregistrer
          </button>
        </div>
        <p className="text-xs text-gray-500 mt-3">
          Valeur actuelle : <span className="text-amber-400 font-semibold">{platformSettings.default_trial_days || 7} jours</span>
        </p>
      </div>

      {/* Circuit Breaker Health Panel */}
      {cbHealth && (
        <div className="card p-6 border-amber-500/20 bg-amber-500/5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-100 flex items-center gap-2">
              État des Circuit Breakers
            </h3>
            <button onClick={loadCbHealth} className="p-1.5 text-gray-500 hover:text-gray-100 transition-colors">
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {['gemini', 'openai', 'openrouter'].map(provider => {
              const state = cbHealth[provider]
              const isOpen = state?.state === 'OPEN'
              const isHalf = state?.state === 'HALF_OPEN'
              return (
                <div key={provider} className={`p-3 rounded-xl border flex items-center justify-between gap-3 ${
                  isOpen ? 'border-red-500/40 bg-red-500/10' : isHalf ? 'border-amber-500/40 bg-amber-500/10' : 'border-emerald-500/30 bg-emerald-500/5'
                }`}>
                  <div>
                    <p className="text-sm font-semibold text-gray-100 capitalize">{provider}</p>
                    <p className={`text-xs font-mono ${isOpen ? 'text-red-400' : isHalf ? 'text-amber-400' : 'text-emerald-400'}`}>
                      {state?.state || 'CLOSED'} {state?.failures > 0 && `(${state.failures} erreurs)`}
                    </p>
                  </div>
                  {(isOpen || isHalf) && (
                    <button
                      onClick={() => resetCb(provider)}
                      disabled={resettingCb[provider]}
                      className="text-xs px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 rounded-lg transition-colors flex items-center gap-1 disabled:opacity-50"
                    >
                      {resettingCb[provider] ? <Loader2 className="w-3 h-3 animate-spin" /> : '↺'} Reset
                    </button>
                  )}
                </div>
              )
            })}
          </div>
          {Object.values(cbHealth).some(v => v?.state === 'OPEN') && (
            <p className="text-xs text-amber-400 mt-3 flex items-center gap-1">
              ⚠️ Un circuit OPEN bloque toutes les requêtes IA. Corrigez d'abord la clé/configuration, puis cliquez Reset.
            </p>
          )}
        </div>
      )}

      {/* API Keys Section */}
      <div className="card p-6">
        <h3 className="text-lg font-semibold text-gray-100 mb-4 flex items-center gap-2">
          <Key className="w-5 h-5 text-gold-400" />
          Clés API
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {['gemini', 'openai', 'openrouter'].map(provider => {
            const keyData = apiKeys.find(k => k.provider === provider)
            const hasKey = keyData?.has_key
            const isActive = keyData?.is_active

            return (
              <div key={provider} className={`p-4 rounded-xl border ${getProviderColor(provider)}`}>
                <div className="flex items-center justify-between mb-3">
                  <span className="font-medium capitalize">{provider}</span>
                  <div className="flex items-center gap-2">
                    {hasKey && (
                      <span className={`text-xs px-2 py-0.5 rounded ${isActive ? 'bg-emerald-500/20 text-emerald-400' : 'bg-gray-500/20 text-gray-400'}`}>
                        {isActive ? 'Active' : 'Inactive'}
                      </span>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center gap-2 mb-3">
                  {hasKey ? (
                    <>
                      <code className="text-xs bg-space-900 px-2 py-1 rounded flex-1">
                        {showKeys[provider] ? keyData.api_key : '••••••••••••••••'}
                      </code>
                      <button 
                        onClick={() => setShowKeys(prev => ({ ...prev, [provider]: !prev[provider] }))}
                        className="p-1 text-gray-500 hover:text-gray-300"
                      >
                        {showKeys[provider] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </>
                  ) : (
                    <span className="text-xs text-gray-500">Non configurée</span>
                  )}
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => onEditKey({ provider, ...keyData })}
                    className="flex-1 text-xs px-3 py-1.5 bg-space-800 hover:bg-space-700 rounded-lg transition-colors"
                  >
                    <Settings className="w-3 h-3 inline mr-1" />
                    {hasKey ? 'Modifier' : 'Configurer'}
                  </button>
                  {hasKey && (
                    <button
                      onClick={() => onTestKey(provider)}
                      className="text-xs px-3 py-1.5 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded-lg transition-colors"
                    >
                      <TestTube className="w-3 h-3 inline mr-1" />
                      Tester
                    </button>
                  )}
                </div>

                {keyData?.last_used_at && (
                  <p className="text-[10px] text-gray-500 mt-2 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    Dernier test : {new Date(keyData.last_used_at).toLocaleString()}
                  </p>
                )}

                {keyData?.error_count > 0 && (
                  <div className="mt-2 p-2 bg-red-500/10 border border-red-500/20 rounded text-[10px] text-red-400">
                    <div className="font-semibold flex items-center gap-1 mb-1">
                      <AlertCircle className="w-3 h-3" />
                      {keyData.error_count} erreur(s) détectée(s)
                    </div>
                    {keyData.last_error && (
                      <p className="italic opacity-80 break-words line-clamp-2" title={keyData.last_error}>
                        {keyData.last_error}
                      </p>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Models List */}
      <div className="card overflow-hidden">
        <div className="p-4 border-b border-space-700">
          <h3 className="text-lg font-semibold text-gray-100 flex items-center gap-2">
            <Cpu className="w-5 h-5 text-blue-400" />
            Catalogue des modèles ({models.length})
          </h3>
        </div>
        <div className="divide-y divide-space-700">
          {models.map(model => (
            <div key={model.id} className={`p-4 hover:bg-space-800/50 transition-colors ${!model.is_active ? 'opacity-50' : ''}`}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-lg">{getCategoryIcon(model.category)}</span>
                    <h4 className="font-medium text-gray-100">{model.name}</h4>
                    <span className={`text-xs px-2 py-0.5 rounded border ${getProviderColor(model.provider)}`}>
                      {model.provider}
                    </span>
                    {model.api_key && (
                      <span className="text-xs px-2 py-0.5 bg-blue-500/20 text-blue-300 rounded flex items-center gap-1">
                        <Key className="w-3 h-3" />
                        Clé spécifique
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-400 mb-2">{model.description}</p>
                  <code className="text-xs text-gray-500 bg-space-900 px-2 py-1 rounded">{model.model_id}</code>
                  
                  {/* Stats */}
                  <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                    <span>{model.stats?.total_requests || 0} requêtes</span>
                    <span>{model.stats?.unique_users || 0} utilisateurs</span>
                    <span>{model.stats?.avg_response_time || 0}ms moy.</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onToggleModel(model)}
                    className={`p-2 rounded-lg transition-colors ${
                      model.is_active 
                        ? 'text-emerald-400 hover:bg-emerald-500/10' 
                        : 'text-gray-500 hover:bg-space-700'
                    }`}
                    title={model.is_active ? 'Désactiver' : 'Activer'}
                  >
                    {model.is_active ? <CheckCircle className="w-5 h-5" /> : <Clock className="w-5 h-5" />}
                  </button>
                  <button
                    onClick={() => onEditModel(model)}
                    className="p-2 text-gray-500 hover:text-gray-100 hover:bg-space-700 rounded-lg transition-colors"
                    title="Modifier"
                  >
                    <Edit className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => onTestModel(model)}
                    className="p-2 text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors"
                    title="Tester ce modèle"
                  >
                    <TestTube className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => onDeleteModel(model.id)}
                    className="p-2 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                    title="Supprimer"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Top Users by Model Usage */}
      {stats?.topUsers?.length > 0 && (
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-gray-100 mb-4 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-gold-400" />
            Top utilisateurs IA
          </h3>
          <div className="space-y-2">
            {stats.topUsers.slice(0, 10).map((user, idx) => (
              <div key={user.id} className="flex items-center justify-between p-3 bg-space-800/50 hover:bg-space-800 border border-space-700/50 rounded-xl transition-all">
                <div className="flex items-center gap-3">
                  <span className="w-8 h-8 bg-gold-400/10 text-gold-400 rounded-lg flex items-center justify-center text-xs font-bold border border-gold-400/20">
                    #{idx + 1}
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-gray-100">{user.name}</p>
                    <p className="text-xs text-gray-500">{user.email}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-gray-100">{(user.total_tokens || 0).toLocaleString()} tokens</p>
                  <div className="flex items-center justify-end gap-2 text-[10px] sm:text-xs">
                    {user.avg_response_time > 0 && <span className="text-emerald-400">{user.avg_response_time}ms</span>}
                    {user.success_rate !== null && <span className={user.success_rate < 90 ? 'text-amber-400' : 'text-emerald-400'}>{user.success_rate}% success</span>}
                    <span className="text-gold-400">{(user.credits_used || 0).toLocaleString()} crédits</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export function AIModelModal({ model, onClose, onSave }) {
  const [formData, setFormData] = useState({
    name: model?.name || '',
    provider: model?.provider || 'gemini',
    model_id: model?.model_id || '',
    description: model?.description || '',
    is_active: model?.is_active !== false,
    category: model?.category || 'general',
    sort_order: model?.sort_order || 0,
    api_key: model?.api_key || ''
  })
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      if (model) {
        await api.put(`/admin/ai/models/${model.id}`, formData)
      } else {
        await api.post('/admin/ai/models', formData)
      }
      toast.success(model ? 'Modèle mis à jour' : 'Modèle créé')
      onSave()
    } catch (error) {
      toast.error(error.response?.data?.error || 'Erreur')
    } finally {
      setSaving(false)
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ paddingLeft: 'env(safe-area-inset-left)', paddingRight: 'env(safe-area-inset-right)' }}>
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" aria-hidden />
      <div className="relative z-10 w-full max-w-lg bg-space-900 border border-space-700 rounded-t-3xl sm:rounded-2xl shadow-2xl animate-fadeIn flex flex-col max-h-[90dvh] sm:max-h-[85vh] max-sm:rounded-b-none overflow-hidden">
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-space-700" style={{ paddingTop: 'max(1rem, env(safe-area-inset-top))' }}>
          <h3 className="text-lg font-display font-semibold text-gray-100">
            {model ? 'Modifier le modèle' : 'Nouveau modèle'}
          </h3>
          <button onClick={onClose} className="p-2 -m-2 text-gray-500 hover:text-gray-100 min-w-[44px] min-h-[44px] flex items-center justify-center">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 overflow-y-auto overscroll-contain" style={{ paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))' }}>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Nom *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="input-dark w-full min-h-[44px]"
              placeholder="Gemini 2.0 Flash"
              required
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Provider *</label>
              <select
                value={formData.provider}
                onChange={(e) => setFormData({ ...formData, provider: e.target.value })}
                className="input-dark w-full min-h-[44px]"
              >
                <option value="gemini">Google Gemini</option>
                <option value="openai">OpenAI</option>
                <option value="openrouter">OpenRouter</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Catégorie</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="input-dark w-full min-h-[44px]"
              >
                <option value="fast">Rapide</option>
                <option value="smart">Intelligent</option>
                <option value="free">Gratuit</option>
                <option value="general">Général</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Model ID *</label>
            <input
              type="text"
              value={formData.model_id}
              onChange={(e) => setFormData({ ...formData, model_id: e.target.value })}
              className="input-dark w-full font-mono text-sm min-h-[44px]"
              placeholder="models/gemini-2.0-flash"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Description</label>
            <input
              type="text"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="input-dark w-full min-h-[44px]"
              placeholder="Description courte"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Ordre d'affichage</label>
            <input
              type="number"
              value={formData.sort_order}
              onChange={(e) => setFormData({ ...formData, sort_order: parseInt(e.target.value) || 0 })}
              className="input-dark w-full min-h-[44px]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Clé API spécifique (Optionnel)
            </label>
            <input
              type="password"
              value={formData.api_key}
              onChange={(e) => setFormData({ ...formData, api_key: e.target.value })}
              className="input-dark w-full min-h-[44px]"
              placeholder={model?.api_key ? '••••••••••••••••' : 'Utiliser la clé globale'}
            />
          </div>

          <div className="flex items-center gap-4 py-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                className="w-5 h-5 rounded border-space-700 bg-space-800 text-emerald-400"
              />
              <span className="text-sm text-gray-300">Actif</span>
            </label>
          </div>

          <div className="flex gap-3 pt-4">
            <button type="button" onClick={onClose} className="flex-1 btn-secondary min-h-[48px]">Annuler</button>
            <button type="submit" disabled={saving} className="flex-1 btn-primary min-h-[48px]">
              {saving ? '...' : model ? 'Enregistrer' : 'Créer'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  )
}

export function APIKeyModal({ keyData, onClose, onSave }) {
  const [apiKey, setApiKey] = useState('')
  const [isActive, setIsActive] = useState(keyData?.is_active !== false)
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      await api.put(`/admin/ai/api-keys/${keyData.provider}`, {
        api_key: apiKey || undefined,
        is_active: isActive
      })
      toast.success('Clé API mise à jour')
      onSave()
    } catch (error) {
      toast.error(error.response?.data?.error || 'Erreur')
    } finally {
      setSaving(false)
    }
  }

  const getProviderName = (provider) => {
    switch (provider) {
      case 'gemini': return 'Google Gemini'
      case 'openai': return 'OpenAI'
      case 'openrouter': return 'OpenRouter'
      default: return provider
    }
  }

  const getProviderLink = (provider) => {
    switch (provider) {
      case 'gemini': return 'https://aistudio.google.com/app/apikey'
      case 'openai': return 'https://platform.openai.com/api-keys'
      case 'openrouter': return 'https://openrouter.ai/keys'
      default: return null
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ paddingLeft: 'env(safe-area-inset-left)', paddingRight: 'env(safe-area-inset-right)' }}>
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" aria-hidden />
      <div className="relative z-10 w-full max-w-md bg-space-900 border border-space-700 rounded-t-3xl sm:rounded-2xl shadow-2xl animate-fadeIn flex flex-col max-h-[90dvh] sm:max-h-[85vh] max-sm:rounded-b-none overflow-hidden">
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-space-700" style={{ paddingTop: 'max(1rem, env(safe-area-inset-top))' }}>
          <h3 className="text-lg font-display font-semibold text-gray-100">
            Clé API {getProviderName(keyData?.provider)}
          </h3>
          <button onClick={onClose} className="p-2 -m-2 text-gray-500 hover:text-gray-100 min-w-[44px] min-h-[44px] flex items-center justify-center">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 overflow-y-auto overscroll-contain" style={{ paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))' }}>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Clé API {keyData?.has_key ? '(laisser vide pour conserver)' : '*'}
            </label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="input-dark w-full font-mono text-sm min-h-[44px]"
              placeholder={keyData?.has_key ? '••••••••••••••••' : 'sk-...'}
              required={!keyData?.has_key}
            />
            {getProviderLink(keyData?.provider) && (
              <a 
                href={getProviderLink(keyData?.provider)} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-xs text-blue-400 hover:underline mt-2 inline-block min-h-[44px] flex items-center"
              >
                Obtenir une clé API →
              </a>
            )}
          </div>

          <label className="flex items-center gap-2 cursor-pointer py-2">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="w-5 h-5 rounded border-space-700 bg-space-800 text-emerald-400"
            />
            <span className="text-sm text-gray-300">Clé active</span>
          </label>

          {keyData?.last_error && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
              <p className="text-xs text-red-400">Dernière erreur: {keyData.last_error}</p>
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <button type="button" onClick={onClose} className="flex-1 btn-secondary min-h-[48px]">Annuler</button>
            <button type="submit" disabled={saving} className="flex-1 btn-primary min-h-[48px]">
              {saving ? '...' : 'Enregistrer'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  )
}

export function AIModelTestModal({ model, onClose }) {
  const [message, setMessage] = useState('Bonjour, ceci est un test.')
  const [response, setResponse] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const handleTest = async (e) => {
    e?.preventDefault()
    if (!message.trim() || loading) return

    setLoading(true)
    setError(null)
    setResponse(null)

    try {
      const res = await api.post(`/admin/ai/models/${model.id}/test`, { message })
      setResponse(res.data)
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Une erreur est survenue')
    } finally {
      setLoading(false)
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-4" style={{ paddingLeft: 'env(safe-area-inset-left)', paddingRight: 'env(safe-area-inset-right)' }}>
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" aria-hidden />
      <div className="relative z-10 w-full max-w-2xl bg-space-900 border border-space-700 rounded-t-3xl sm:rounded-2xl shadow-2xl animate-fadeIn flex flex-col max-h-[90dvh] sm:max-h-[85vh] max-sm:rounded-b-none overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-space-700 flex items-center justify-between bg-space-800" style={{ paddingTop: 'max(1rem, env(safe-area-inset-top))' }}>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/20 text-blue-400 rounded-lg">
              <TestTube className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-display font-semibold text-gray-100">Tester : {model.name}</h3>
              <p className="text-xs text-gray-500">{model.provider} • {model.model_id}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 -m-2 text-gray-500 hover:text-gray-100 min-w-[44px] min-h-[44px] flex items-center justify-center">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 overscroll-contain">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-300">Message de test</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Entrez un message..."
              className="input-dark w-full min-h-[100px] py-3 resize-none"
            />
          </div>

          <button
            onClick={handleTest}
            disabled={loading || !message.trim()}
            className="w-full btn-primary flex items-center justify-center gap-2 py-4 font-bold shadow-lg shadow-blue-500/20 min-h-[48px]"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Zap className="w-5 h-5" />}
            {loading ? 'Génération...' : 'Lancer le test'}
          </button>

          {error && (
            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-red-400 overflow-hidden">
                <p className="font-bold mb-1">Erreur</p>
                <p className="break-words opacity-90">{error}</p>
              </div>
            </div>
          )}

          {response && (
            <div className="space-y-4 animate-slideUp">
              <div className="flex items-center gap-2 text-sm font-medium text-emerald-400">
                <CheckCircle className="w-4 h-4" />
                Réponse reçue
              </div>
              <div className="bg-space-950/50 p-4 border border-emerald-500/20 rounded-2xl">
                <p className="text-gray-200 text-sm whitespace-pre-wrap leading-relaxed">
                  {typeof response.response?.response === 'string' 
                    ? response.response.response 
                    : typeof response.response === 'string'
                      ? response.response
                      : JSON.stringify(response.response, null, 2)}
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-space-700 bg-space-800/50 flex-shrink-0" style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}>
          <p className="text-[10px] text-gray-500 text-center">
            {model.provider === 'openrouter' ? 'Vérifiez votre clé API OpenRouter.' : 'Test simulant un agent standard.'}
          </p>
        </div>
      </div>
    </div>,
    document.body
  )
}
