import { useState, useEffect } from 'react'
import api from '../services/api'
import { useConfirm } from '../contexts/ConfirmContext'
import {
  FileBarChart,
  Download,
  Calendar,
  Mail,
  Clock,
  Play,
  Pause,
  Plus,
  RefreshCw,
  Check,
  Trash2,
  BarChart2,
  Users,
  ShoppingCart,
  TrendingUp
} from 'lucide-react'
import toast from 'react-hot-toast'

const REPORT_ICONS = {
  weekly_summary: BarChart2,
  monthly_summary: Calendar,
  agent_performance: Users,
  conversion_report: TrendingUp,
  product_report: ShoppingCart
}

export default function Reports() {
  const { showConfirm } = useConfirm()
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [reportTypes, setReportTypes] = useState({})
  const [history, setHistory] = useState([])
  const [subscriptions, setSubscriptions] = useState([])
  const [generatedReport, setGeneratedReport] = useState(null)
  const [showSubModal, setShowSubModal] = useState(false)

  const [generateForm, setGenerateForm] = useState({
    report_type: 'weekly_summary',
    period: '7d'
  })

  const [subForm, setSubForm] = useState({
    report_type: 'weekly_summary',
    frequency: 'weekly',
    email: ''
  })

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const [typesRes, historyRes, subsRes] = await Promise.all([
        api.get('/reports/types'),
        api.get('/reports/history'),
        api.get('/reports/subscriptions')
      ])
      setReportTypes(typesRes.data.reportTypes || {})
      setHistory(Array.isArray(historyRes.data?.reports) ? historyRes.data.reports : [])
      setSubscriptions(Array.isArray(subsRes.data?.subscriptions) ? subsRes.data.subscriptions : [])
    } catch (error) {
      console.error('Error loading reports:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleGenerate = async () => {
    setGenerating(true)
    try {
      const result = await api.post('/reports/generate', generateForm)
      setGeneratedReport(result.data.report)
      toast.success('Rapport généré')
      loadData()
    } catch (error) {
      toast.error('Erreur lors de la génération')
    } finally {
      setGenerating(false)
    }
  }

  const handleCreateSubscription = async (e) => {
    e.preventDefault()
    try {
      await api.post('/reports/subscriptions', subForm)
      toast.success('Abonnement créé')
      setShowSubModal(false)
      loadData()
    } catch (error) {
      toast.error('Erreur lors de la création')
    }
  }

  const handleToggleSubscription = async (id) => {
    try {
      const result = await api.post(`/reports/subscriptions/${id}/toggle`)
      toast.success(result.data.is_active ? 'Abonnement activé' : 'Abonnement désactivé')
      loadData()
    } catch (error) {
      toast.error('Erreur')
    }
  }

  const handleDeleteSubscription = async (id) => {
    const ok = await showConfirm({
      title: 'Supprimer l\'abonnement',
      message: 'Supprimer définitivement cet abonnement aux rapports ?',
      variant: 'danger',
      confirmLabel: 'Supprimer'
    })
    if (!ok) return
    try {
      await api.delete(`/reports/subscriptions/${id}`)
      toast.success('Abonnement supprimé')
      loadData()
    } catch (error) {
      toast.error('Erreur')
    }
  }

  const viewReport = async (id) => {
    try {
      const result = await api.get(`/reports/${id}`)
      setGeneratedReport(result.data.report)
    } catch (error) {
      toast.error('Erreur lors du chargement')
    }
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-gray-100">Rapports</h1>
          <p className="text-gray-400">Générez et planifiez des rapports automatiques</p>
        </div>
        <button
          onClick={() => setShowSubModal(true)}
          className="btn-secondary flex items-center gap-2"
        >
          <Mail className="w-5 h-5" />
          Programmer un rapport
        </button>
      </div>

      {/* Generate Report */}
      <div className="card p-6">
        <h3 className="text-lg font-semibold text-gray-100 mb-4">Générer un rapport</h3>
        <div className="flex flex-col md:flex-row gap-4">
          <select
            value={generateForm.report_type}
            onChange={(e) => setGenerateForm({ ...generateForm, report_type: e.target.value })}
            className="input flex-1"
          >
            {Object.entries(reportTypes).map(([key, type]) => (
              <option key={key} value={key}>{type.name}</option>
            ))}
          </select>
          <select
            value={generateForm.period}
            onChange={(e) => setGenerateForm({ ...generateForm, period: e.target.value })}
            className="input"
          >
            <option value="7d">7 derniers jours</option>
            <option value="30d">30 derniers jours</option>
            <option value="90d">90 derniers jours</option>
          </select>
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="btn-primary flex items-center gap-2"
          >
            {generating ? (
              <RefreshCw className="w-5 h-5 animate-spin" />
            ) : (
              <FileBarChart className="w-5 h-5" />
            )}
            {generating ? 'Génération...' : 'Générer'}
          </button>
        </div>
      </div>

      {/* Generated Report Preview */}
      {generatedReport && (
        <div className="card p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-100">{generatedReport.title}</h3>
              <p className="text-sm text-gray-400">
                Période: {new Date(generatedReport.period?.start || generatedReport.period_start).toLocaleDateString('fr-FR')} - {new Date(generatedReport.period?.end || generatedReport.period_end).toLocaleDateString('fr-FR')}
              </p>
            </div>
            <button
              onClick={() => setGeneratedReport(null)}
              className="text-gray-400 hover:text-gray-100"
            >
              ✕
            </button>
          </div>

          {/* Report Data */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {generatedReport.data?.conversations && (
              <>
                <div className="p-4 bg-space-800 rounded-xl">
                  <p className="text-sm text-gray-400">Conversations</p>
                  <p className="text-2xl font-bold text-gray-100">{generatedReport.data.conversations.total}</p>
                  <p className="text-xs text-emerald-400">{generatedReport.data.conversations.active} actives</p>
                </div>
                <div className="p-4 bg-space-800 rounded-xl">
                  <p className="text-sm text-gray-400">Messages</p>
                  <p className="text-2xl font-bold text-gray-100">{generatedReport.data.messages?.total || 0}</p>
                  <p className="text-xs text-gray-500">
                    {generatedReport.data.messages?.incoming || 0} entrants / {generatedReport.data.messages?.outgoing || 0} sortants
                  </p>
                </div>
                <div className="p-4 bg-space-800 rounded-xl">
                  <p className="text-sm text-gray-400">Leads</p>
                  <p className="text-2xl font-bold text-gold-400">{generatedReport.data.leads || 0}</p>
                </div>
                <div className="p-4 bg-space-800 rounded-xl">
                  <p className="text-sm text-gray-400">Revenus</p>
                  <p className="text-2xl font-bold text-emerald-400">{(generatedReport.data.revenue || 0).toLocaleString()} XOF</p>
                </div>
              </>
            )}

            {generatedReport.data?.agents && (
              <div className="col-span-full">
                <h4 className="text-sm font-medium text-gray-400 mb-3">Performance des agents</h4>
                <div className="space-y-2">
                  {generatedReport.data.agents.map((agent) => (
                    <div key={agent.id} className="flex items-center justify-between p-3 bg-space-800 rounded-lg">
                      <span className="text-gray-100">{agent.name}</span>
                      <div className="flex items-center gap-4 text-sm text-gray-400">
                        <span>{agent.conversations} conv.</span>
                        <span>{agent.messages} msgs</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {generatedReport.data?.funnel && (
              <div className="col-span-full">
                <h4 className="text-sm font-medium text-gray-400 mb-3">Tunnel de conversion</h4>
                <div className="flex items-center gap-2">
                  {generatedReport.data.funnel.map((stage, idx) => (
                    <div key={stage.stage} className="flex-1 text-center">
                      <div className="p-3 bg-space-800 rounded-lg mb-1">
                        <p className="text-xl font-bold text-gray-100">{stage.count}</p>
                      </div>
                      <p className="text-xs text-gray-500">{stage.stage}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {generatedReport.data?.products && (
              <div className="col-span-full">
                <h4 className="text-sm font-medium text-gray-400 mb-3">Produits vendus</h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-gray-500 border-b border-space-700">
                        <th className="pb-2">Produit</th>
                        <th className="pb-2 text-right">Prix</th>
                        <th className="pb-2 text-right">Stock</th>
                        <th className="pb-2 text-right">Vendus</th>
                        <th className="pb-2 text-right">Revenus</th>
                      </tr>
                    </thead>
                    <tbody>
                      {generatedReport.data.products.slice(0, 10).map((p) => (
                        <tr key={p.id} className="border-b border-space-800">
                          <td className="py-2 text-gray-100">{p.name}</td>
                          <td className="py-2 text-right text-gray-400">{p.price?.toLocaleString()} XOF</td>
                          <td className="py-2 text-right text-gray-400">{p.stock}</td>
                          <td className="py-2 text-right font-medium text-gold-400">{p.sold}</td>
                          <td className="py-2 text-right font-medium text-emerald-400">{p.revenue?.toLocaleString()} XOF</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Report History */}
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-gray-100 mb-4">Historique des rapports</h3>
          {history.length === 0 ? (
            <p className="text-gray-400 text-center py-8">Aucun rapport généré</p>
          ) : (
            <div className="space-y-3 max-h-[400px] overflow-y-auto">
              {history.map((report) => {
                const Icon = REPORT_ICONS[report.report_type] || FileBarChart
                return (
                  <div
                    key={report.id}
                    onClick={() => viewReport(report.id)}
                    className="flex items-center gap-3 p-3 bg-space-800 rounded-xl cursor-pointer hover:bg-space-700 transition-colors"
                  >
                    <div className="w-10 h-10 rounded-lg bg-gold-400/20 flex items-center justify-center">
                      <Icon className="w-5 h-5 text-gold-400" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-gray-100">{report.title}</p>
                      <p className="text-xs text-gray-500">
                        {new Date(report.created_at).toLocaleDateString('fr-FR')}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Subscriptions */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-100">Rapports programmés</h3>
            <button
              onClick={() => setShowSubModal(true)}
              className="p-2 text-gray-400 hover:text-gold-400 hover:bg-gold-400/10 rounded-lg"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>
          {subscriptions.length === 0 ? (
            <div className="text-center py-8">
              <Mail className="w-12 h-12 text-gray-600 mx-auto mb-3" />
              <p className="text-gray-400">Aucun rapport programmé</p>
              <button
                onClick={() => setShowSubModal(true)}
                className="text-gold-400 text-sm mt-2 hover:underline"
              >
                Ajouter un abonnement
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {subscriptions.map((sub) => {
                const Icon = REPORT_ICONS[sub.report_type] || FileBarChart
                return (
                  <div key={sub.id} className="flex items-center gap-3 p-3 bg-space-800 rounded-xl">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      sub.is_active ? 'bg-emerald-400/20' : 'bg-gray-500/20'
                    }`}>
                      <Icon className={`w-5 h-5 ${sub.is_active ? 'text-emerald-400' : 'text-gray-400'}`} />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-gray-100">{reportTypes[sub.report_type]?.name}</p>
                      <p className="text-xs text-gray-500 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {sub.frequency === 'daily' ? 'Quotidien' : sub.frequency === 'weekly' ? 'Hebdomadaire' : 'Mensuel'}
                        {' → '}{sub.email}
                      </p>
                    </div>
                    <button
                      onClick={() => handleToggleSubscription(sub.id)}
                      className={`p-2 rounded-lg ${
                        sub.is_active
                          ? 'text-emerald-400 hover:bg-emerald-400/10'
                          : 'text-gray-400 hover:bg-gray-400/10'
                      }`}
                    >
                      {sub.is_active ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                    </button>
                    <button
                      onClick={() => handleDeleteSubscription(sub.id)}
                      className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-400/10 rounded-lg"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Subscription Modal */}
      {showSubModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="card p-6 w-full max-w-md">
            <h2 className="text-xl font-display font-bold text-gray-100 mb-6">
              Programmer un rapport
            </h2>
            <form onSubmit={handleCreateSubscription} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Type de rapport</label>
                <select
                  value={subForm.report_type}
                  onChange={(e) => setSubForm({ ...subForm, report_type: e.target.value })}
                  className="input"
                >
                  {Object.entries(reportTypes).map(([key, type]) => (
                    <option key={key} value={key}>{type.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Fréquence</label>
                <select
                  value={subForm.frequency}
                  onChange={(e) => setSubForm({ ...subForm, frequency: e.target.value })}
                  className="input"
                >
                  <option value="daily">Quotidien</option>
                  <option value="weekly">Hebdomadaire</option>
                  <option value="monthly">Mensuel</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Email (optionnel)</label>
                <input
                  type="email"
                  value={subForm.email}
                  onChange={(e) => setSubForm({ ...subForm, email: e.target.value })}
                  className="input"
                  placeholder="Laisser vide pour utiliser l'email du compte"
                />
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowSubModal(false)}
                  className="btn-secondary"
                >
                  Annuler
                </button>
                <button type="submit" className="btn-primary">
                  Créer l'abonnement
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
