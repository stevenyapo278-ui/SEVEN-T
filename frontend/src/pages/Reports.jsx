import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import api from '../services/api'
import { useConfirm } from '../contexts/ConfirmContext'
import { useAuth } from '../contexts/AuthContext'
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
  TrendingUp,
  Target,
  Zap,
  Globe,
  PieChart as PieIcon,
  Search,
  MessageSquare
} from 'lucide-react'
import { useTheme } from '../contexts/ThemeContext'
import toast from 'react-hot-toast'

const REPORT_ICONS = {
  activity_report: BarChart2,
  agent_performance: Users,
  conversion_report: TrendingUp,
  product_report: ShoppingCart,
  relance_report: Zap
}

export default function Reports() {
  const { t } = useTranslation()
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const { user } = useAuth()
  const reportsModuleEnabled = !!(user?.plan_features?.reports || user?.reports_module_enabled === 1 || user?.reports_module_enabled === true)
  const { showConfirm } = useConfirm()
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [reportTypes, setReportTypes] = useState({})
  const [history, setHistory] = useState([])
  const [subscriptions, setSubscriptions] = useState([])
  const [generatedReport, setGeneratedReport] = useState(null)
  const [showSubModal, setShowSubModal] = useState(false)

  const [generateForm, setGenerateForm] = useState({
    report_type: 'activity_report',
    period: '7d'
  })

  const [subForm, setSubForm] = useState({
    report_type: 'activity_report',
    frequency: 'weekly',
    email: ''
  })

  // Bloquer le scroll quand un modal est ouvert
  useEffect(() => {
    if (showSubModal) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => { document.body.style.overflow = 'unset' }
  }, [showSubModal])

  useEffect(() => {
    if (!reportsModuleEnabled) {
      setLoading(false)
      return
    }
    loadData()
  }, [reportsModuleEnabled])

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

  const handleDeleteReport = async (e, id) => {
    e.stopPropagation()
    const ok = await showConfirm({
      title: 'Supprimer le rapport',
      message: 'Supprimer cet historique de rapport ?',
      variant: 'danger',
      confirmLabel: 'Supprimer'
    })
    if (!ok) return
    
    try {
      await api.delete(`/reports/${id}`)
      toast.success('Rapport supprimé')
      if (generatedReport?.id === id) setGeneratedReport(null)
      loadData()
    } catch (error) {
      toast.error('Erreur lors de la suppression')
    }
  }

  const handleExportPDF = () => {
    if (!generatedReport || !generatedReport.data) return;
    const toastId = toast.loading('Génération du PDF en cours...');

    const reportTitle = generatedReport.title && generatedReport.title !== 'undefined' 
      ? generatedReport.title 
      : (reportTypes[generatedReport.report_type]?.name || 'Rapport');

    const startDate = generatedReport.period?.start || generatedReport.period_start || new Date().toISOString();
    const endDate = generatedReport.period?.end || generatedReport.period_end || new Date().toISOString();

    const hasConversations = !!generatedReport.data.conversations;
    const hasAgents = Array.isArray(generatedReport.data.agents) && generatedReport.data.agents.length > 0;
    const hasFunnel = Array.isArray(generatedReport.data.funnel) && generatedReport.data.funnel.length > 0;
    const hasProducts = Array.isArray(generatedReport.data.products) && generatedReport.data.products.length > 0;
    const hasRelance = !!generatedReport.data.generated;
    
    const hasAnyData = hasConversations || hasAgents || hasFunnel || hasProducts || hasRelance;

    const content = `
      <div style="font-family: Arial, sans-serif; color: #333; padding: 30px; width: 700px; box-sizing: border-box; background: white;">
        <div style="text-align: center; border-bottom: 2px solid #eaeaea; padding-bottom: 20px; margin-bottom: 30px;">
          <h1 style="color: #111; margin: 0; font-size: 28px;">${reportTitle}</h1>
          <p style="color: #666; margin: 10px 0 0 0; font-size: 14px;">
            Période : ${new Date(startDate).toLocaleDateString('fr-FR')} - ${new Date(endDate).toLocaleDateString('fr-FR')}
          </p>
        </div>

        ${!hasAnyData ? `
          <div style="text-align: center; padding: 50px; color: #888; font-size: 16px; min-height: 200px;">
             Aucune donnée disponible pour cette période.
          </div>
        ` : ''}

        ${hasConversations ? `
        <div style="display: flex; justify-content: space-between; margin-bottom: 40px; gap: 15px; page-break-inside: avoid;">
           <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; flex: 1; text-align: center; border: 1px solid #eee;">
              <h3 style="margin: 0; font-size: 24px; color: #0969da;">${generatedReport.data.conversations?.total || 0}</h3>
              <p style="margin: 5px 0 0 0; font-size: 11px; font-weight: bold; color: #666; text-transform: uppercase;">Conversations</p>
           </div>
           <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; flex: 1; text-align: center; border: 1px solid #eee;">
              <h3 style="margin: 0; font-size: 24px; color: #d29922;">${generatedReport.data.leads || 0}</h3>
              <p style="margin: 5px 0 0 0; font-size: 11px; font-weight: bold; color: #666; text-transform: uppercase;">Prospects</p>
           </div>
           <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; flex: 1; text-align: center; border: 1px solid #eee;">
              <h3 style="margin: 0; font-size: 24px; color: #1a7f37;">${(generatedReport.data.revenue || 0).toLocaleString()}</h3>
              <p style="margin: 5px 0 0 0; font-size: 11px; font-weight: bold; color: #666; text-transform: uppercase;">Revenus (XOF)</p>
           </div>
           <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; flex: 1; text-align: center; border: 1px solid #eee;">
              <h3 style="margin: 0; font-size: 24px; color: #0969da;">${generatedReport.data.messages?.total || 0}</h3>
              <p style="margin: 5px 0 0 0; font-size: 11px; font-weight: bold; color: #666; text-transform: uppercase;">Messages IA</p>
           </div>
        </div>
        ` : ''}

        ${hasAgents ? `
        <div style="page-break-inside: avoid; margin-bottom: 40px;">
          <h2 style="color: #222; font-size: 18px; border-bottom: 1px solid #eee; padding-bottom: 10px; margin-bottom: 20px;">Efficacité des agents</h2>
          <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
            <thead>
              <tr style="background: #f8f9fa;">
                <th style="padding: 12px; text-align: left; border: 1px solid #eee;">Nom de l'agent</th>
                <th style="padding: 12px; text-align: right; border: 1px solid #eee;">Conversations</th>
                <th style="padding: 12px; text-align: right; border: 1px solid #eee;">Messages Gérés</th>
              </tr>
            </thead>
            <tbody>
              ${generatedReport.data.agents.map(agent => `
                <tr>
                  <td style="padding: 12px; border: 1px solid #eee; font-weight: bold;">${agent.name}</td>
                  <td style="padding: 12px; text-align: right; border: 1px solid #eee;">${agent.conversations || 0}</td>
                  <td style="padding: 12px; text-align: right; border: 1px solid #eee; color: #0969da; font-weight: bold;">${agent.messages || 0}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
        ` : ''}

        ${hasFunnel ? `
        <div style="page-break-inside: avoid; margin-bottom: 40px;">
          <h2 style="color: #222; font-size: 18px; border-bottom: 1px solid #eee; padding-bottom: 10px; margin-bottom: 20px;">Tunnel de Conversion</h2>
          <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
            <thead>
              <tr style="background: #f8f9fa;">
                <th style="padding: 12px; text-align: left; border: 1px solid #eee;">Étape</th>
                <th style="padding: 12px; text-align: right; border: 1px solid #eee;">Volume</th>
              </tr>
            </thead>
            <tbody>
              ${generatedReport.data.funnel.map(stage => `
                <tr>
                  <td style="padding: 12px; border: 1px solid #eee;">${stage.stage}</td>
                  <td style="padding: 12px; text-align: right; border: 1px solid #eee; font-weight: bold;">${stage.count || 0}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
        ` : ''}

        ${hasProducts ? `
        <div style="page-break-inside: avoid; margin-bottom: 40px;">
          <h2 style="color: #222; font-size: 18px; border-bottom: 1px solid #eee; padding-bottom: 10px; margin-bottom: 20px;">Top Produits Vendus</h2>
          <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
            <thead>
              <tr style="background: #f8f9fa;">
                <th style="padding: 12px; text-align: left; border: 1px solid #eee;">Nom du Produit</th>
                <th style="padding: 12px; text-align: right; border: 1px solid #eee;">Prix Unitaire</th>
                <th style="padding: 12px; text-align: center; border: 1px solid #eee;">Qté. Vendues</th>
                <th style="padding: 12px; text-align: right; border: 1px solid #eee;">Chiffre d'Affaire</th>
              </tr>
            </thead>
            <tbody>
              ${generatedReport.data.products.slice(0, 10).map(p => `
                <tr>
                  <td style="padding: 12px; border: 1px solid #eee;">${p.name}</td>
                  <td style="padding: 12px; text-align: right; border: 1px solid #eee;">${(p.price || 0).toLocaleString()} XOF</td>
                  <td style="padding: 12px; text-align: center; border: 1px solid #eee;">${p.sold}</td>
                  <td style="padding: 12px; text-align: right; border: 1px solid #eee; font-weight: bold; color: #1a7f37;">${(p.revenue || 0).toLocaleString()} XOF</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
        ` : ''}

        ${hasRelance ? `
        <div style="page-break-inside: avoid; margin-bottom: 40px;">
          <h2 style="color: #222; font-size: 18px; border-bottom: 1px solid #eee; padding-bottom: 10px; margin-bottom: 20px;">Performance Proactive AI</h2>
          <div style="display: flex; justify-content: space-between; gap: 15px; margin-bottom: 20px;">
             <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; flex: 1; text-align: center; border: 1px solid #eee;">
                <h3 style="margin: 0; font-size: 20px; color: #111;">${generatedReport.data.generated}</h3>
                <p style="margin: 5px 0 0 0; font-size: 10px; color: #666; text-transform: uppercase;">Relances Suggérées</p>
             </div>
             <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; flex: 1; text-align: center; border: 1px solid #eee;">
                <h3 style="margin: 0; font-size: 20px; color: #d29922;">${generatedReport.data.sent}</h3>
                <p style="margin: 5px 0 0 0; font-size: 10px; color: #666; text-transform: uppercase;">Relances Envoyées</p>
             </div>
             <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; flex: 1; text-align: center; border: 1px solid #eee;">
                <h3 style="margin: 0; font-size: 20px; color: #0969da;">${generatedReport.data.adoption_rate}%</h3>
                <p style="margin: 5px 0 0 0; font-size: 10px; color: #666; text-transform: uppercase;">Adoption</p>
             </div>
          </div>
          <div style="display: flex; justify-content: space-between; gap: 15px;">
             <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; flex: 1; text-align: center; border: 1px solid #eee;">
                <h3 style="margin: 0; font-size: 20px; color: #111;">${generatedReport.data.attributed_orders}</h3>
                <p style="margin: 5px 0 0 0; font-size: 10px; color: #666; text-transform: uppercase;">Ventes Attribuées</p>
             </div>
             <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; flex: 1; text-align: center; border: 1px solid #eee;">
                <h3 style="margin: 0; font-size: 20px; color: #1a7f37;">${(generatedReport.data.attributed_revenue || 0).toLocaleString()} XOF</h3>
                <p style="margin: 5px 0 0 0; font-size: 10px; color: #666; text-transform: uppercase;">CA Attribué</p>
             </div>
          </div>
        </div>
        ` : ''}
        
        <div style="text-align: center; margin-top: 30px; margin-bottom: 20px; font-size: 12px; color: #aaa; border-top: 1px solid #eee; padding-top: 20px; page-break-inside: avoid;">
           Généré par SEVEN T - ${new Date().toLocaleString('fr-FR')}
        </div>
      </div>
    `;

    const filename = `rapport_${generatedReport.report_type || 'export'}_${new Date().toISOString().slice(0,10)}.pdf`;

    const opt = {
      margin:       10,
      filename:     filename,
      image:        { type: 'jpeg', quality: 1 },
      html2canvas:  { scale: 2 },
      jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    if (window.html2pdf) {
      window.html2pdf().set(opt).from(content).save().then(() => {
        toast.success('Rapport PDF téléchargé', { id: toastId });
      }).catch(err => {
        console.error("PDF generation err:", err);
        toast.error('Erreur lors de la génération du PDF', { id: toastId });
      });
    } else {
      toast.error("L'outil d'export n'est pas disponible", { id: toastId });
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gold-400"></div>
      </div>
    )
  }

  if (!reportsModuleEnabled) {
    return (
      <div className="max-w-full mx-auto w-full space-y-6 px-4 sm:px-6 lg:px-8 min-w-0">
        <div className={`relative rounded-2xl sm:rounded-3xl border p-4 sm:p-8 ${
          isDark ? 'bg-gradient-to-br from-space-800 via-space-900 to-space-800 border-space-700/50' : 'bg-gradient-to-br from-gray-50 via-white to-gray-50 border-gray-200'
        }`}>
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-blue-500/10 rounded-xl flex-shrink-0">
                <FileBarChart className="w-6 h-6 text-blue-400" />
              </div>
              <h1 className={`text-2xl sm:text-3xl font-display font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                {t('reports.title') || 'Rapports'}
              </h1>
            </div>
            <p className={`${isDark ? 'text-gray-400' : 'text-gray-700'}`}>
              Le module Rapports n’est pas activé pour votre plan.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <div className={`px-3 py-2 rounded-xl border text-sm ${
                isDark ? 'bg-space-800 border-space-700 text-gray-300' : 'bg-white border-gray-200 text-gray-700'
              }`}>
                Activez le module dans l’admin (Plans → Modules) ou au niveau utilisateur.
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-full mx-auto w-full space-y-6 px-4 sm:px-6 lg:px-8 min-w-0">
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
                  <FileBarChart className="w-6 h-6 text-blue-400" />
                </div>
                <h1 className={`text-2xl sm:text-3xl font-display font-bold break-words ${isDark ? 'text-white' : 'text-gray-900'}`}>{t('reports.title') || 'Rapports'}</h1>
              </div>
              <p className={`text-base sm:text-lg break-words ${isDark ? 'text-gray-400' : 'text-gray-700'}`}>
                {t('reports.subtitle') || 'Générez et planifiez des rapports automatiques'}
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
                <span className="hidden sm:inline">{t('reports.refresh')}</span>
              </button>
              <button
                onClick={() => setShowSubModal(true)}
                className="btn-primary flex items-center gap-2 min-h-[44px]"
              >
                <Mail className="w-5 h-5" />
                <span>{t('reports.schedule_report')}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Generate Report Section */}
      <div className={`p-6 rounded-2xl border transition-all duration-300 ${
        isDark ? 'bg-space-800/20 border-space-700/50 hover:bg-space-800/30' : 'bg-white border-gray-100 hover:shadow-md shadow-sm'
      }`}>
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-gold-400/10 rounded-lg">
            <Zap className="w-5 h-5 text-gold-400" />
          </div>
          <h3 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{t('reports.quick_generator')}</h3>
        </div>
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 space-y-1">
            <label className="text-xs font-bold text-gray-500 uppercase px-1">{t('reports.report_type')}</label>
            <select
              value={generateForm.report_type}
              onChange={(e) => setGenerateForm({ ...generateForm, report_type: e.target.value })}
              className="input-dark w-full"
            >
              {Object.entries(reportTypes).map(([key, type]) => (
                <option key={key} value={key}>{type.name}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-500 uppercase px-1">{t('reports.period')}</label>
            <select
              value={generateForm.period}
              onChange={(e) => setGenerateForm({ ...generateForm, period: e.target.value })}
              className="input-dark w-48"
            >
              <option value="7d">{t('reports.last_7_days')}</option>
              <option value="30d">{t('reports.last_30_days')}</option>
              <option value="90d">{t('reports.last_90_days')}</option>
            </select>
          </div>
          <div className="md:pt-5">
            <button
              onClick={handleGenerate}
              disabled={generating}
              className="btn-primary w-full md:w-auto h-12 px-8 flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20"
            >
              {generating ? (
                <RefreshCw className="w-5 h-5 animate-spin" />
              ) : (
                <FileBarChart className="w-5 h-5" />
              )}
              {generating ? t('reports.generating') : t('reports.generate_button')}
            </button>
          </div>
        </div>
      </div>

      {/* Generated Report Preview - ENRICHED */}
      {generatedReport && (
        <div id="report-content" className={`rounded-3xl border transition-all duration-500 animate-fadeIn ${
          isDark ? 'bg-space-900/40 border-space-700/50' : 'bg-white border-gray-200'
        } overflow-hidden`}>
          {/* Report Header */}
          <div className="p-6 sm:p-8 bg-gradient-to-r from-blue-500/10 via-transparent to-transparent flex flex-wrap items-center justify-between gap-4 border-b border-white/5">
            <div className="min-w-0">
              <div className="flex items-center gap-3 mb-1">
                <span className="px-2 py-0.5 rounded-md bg-blue-500/20 text-blue-400 text-[10px] uppercase font-black tracking-widest">
                  {reportTypes[generatedReport.report_type]?.name || 'Rapport'}
                </span>
                <span className="text-gray-600">•</span>
                <p className="text-xs text-gray-500 font-mono">#{generatedReport.id?.substring(0, 8)}</p>
              </div>
              <h3 className={`text-2xl font-display font-bold truncate ${isDark ? 'text-white' : 'text-gray-900'}`}>{generatedReport.title}</h3>
              <div className="flex items-center gap-2 mt-1 text-sm text-gray-400">
                <Calendar className="w-4 h-4" />
                {new Date(generatedReport.period?.start || generatedReport.period_start).toLocaleDateString('fr-FR')} - {new Date(generatedReport.period?.end || generatedReport.period_end).toLocaleDateString('fr-FR')}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={handleExportPDF} className="p-2 hover:bg-white/5 rounded-lg text-gray-400 transition-colors" title={t('reports.download_pdf')}>
                <Download className="w-5 h-5" />
              </button>
              <button
                onClick={() => setGeneratedReport(null)}
                className="p-2 hover:bg-red-500/10 rounded-lg text-gray-500 hover:text-red-400 transition-colors"
                title={t('reports.close')}
              >
                ✕
              </button>
            </div>
          </div>

          <div className="p-6 sm:p-8 space-y-8">
            {/* Key Performance Indicators */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {generatedReport.data?.conversations && (
                <>
                  <div className="p-5 bg-space-800/50 rounded-2xl border border-white/5 group hover:border-blue-500/30 transition-colors">
                    <div className="flex items-center justify-between mb-3">
                      <div className="p-2 bg-blue-500/10 rounded-xl">
                        <Users className="w-5 h-5 text-blue-400" />
                      </div>
                      <span className="text-[10px] font-bold text-gray-500 uppercase tracking-tighter">{t('reports.engagement')}</span>
                    </div>
                    <p className="text-3xl font-black text-gray-100">{generatedReport.data.conversations?.total || 0}</p>
                    <p className="text-xs font-bold text-gray-500 mt-1 uppercase tracking-widest">{t('reports.conversations')}</p>
                    <div className="mt-4 pt-4 border-t border-white/5 flex items-center justify-between">
                       <span className="text-xs text-emerald-400 font-bold">{generatedReport.data.conversations?.active || 0} {t('reports.active')}</span>
                       <span className="text-[10px] text-gray-600">{t('reports.period_total')}</span>
                    </div>
                  </div>

                  <div className="p-5 bg-space-800/50 rounded-2xl border border-white/5 group hover:border-gold-400/30 transition-colors">
                    <div className="flex items-center justify-between mb-3">
                      <div className="p-2 bg-gold-400/10 rounded-xl">
                        <TrendingUp className="w-5 h-5 text-gold-400" />
                      </div>
                      <span className="text-[10px] font-bold text-gray-500 uppercase tracking-tighter">{t('reports.acquisition')}</span>
                    </div>
                    <p className="text-3xl font-black text-gray-100">{generatedReport.data.leads || 0}</p>
                    <p className="text-xs font-bold text-gray-500 mt-1 uppercase tracking-widest">{t('reports.leads')}</p>
                    <div className="mt-4 pt-4 border-t border-white/5 flex items-center justify-between">
                       <span className="text-xs text-gold-400 font-bold">{t('reports.detected_leads')}</span>
                       <Target className="w-4 h-4 text-gray-700" />
                    </div>
                  </div>

                  <div className="p-5 bg-space-800/50 rounded-2xl border border-white/5 group hover:border-emerald-500/30 transition-colors">
                    <div className="flex items-center justify-between mb-3">
                      <div className="p-2 bg-emerald-500/10 rounded-xl">
                        <PieIcon className="w-5 h-5 text-emerald-400" />
                      </div>
                      <span className="text-[10px] font-bold text-gray-500 uppercase tracking-tighter">{t('reports.revenues')}</span>
                    </div>
                    <p className="text-3xl font-black text-gray-100">{(generatedReport.data.revenue || 0).toLocaleString()}</p>
                    <p className="text-xs font-bold text-gray-500 mt-1 uppercase tracking-widest">{t('reports.total_amount_xof')}</p>
                    <div className="mt-4 pt-4 border-t border-white/5 flex items-center justify-between">
                       <span className="text-xs text-emerald-400 font-bold">{t('reports.completed_sales')}</span>
                       <ShoppingCart className="w-4 h-4 text-gray-700" />
                    </div>
                  </div>

                  <div className="p-5 bg-space-800/50 rounded-2xl border border-white/5 group hover:border-blue-400/30 transition-colors">
                    <div className="flex items-center justify-between mb-3">
                      <div className="p-2 bg-blue-400/10 rounded-xl">
                        <Globe className="w-5 h-5 text-blue-400" />
                      </div>
                      <span className="text-[10px] font-bold text-gray-500 uppercase tracking-tighter">{t('reports.msg_volume')}</span>
                    </div>
                    <p className="text-3xl font-black text-gray-100">{generatedReport.data.messages?.total || 0}</p>
                    <p className="text-xs font-bold text-gray-500 mt-1 uppercase tracking-widest">{t('reports.handled_messages')}</p>
                    <div className="mt-4 pt-4 border-t border-white/5 flex items-center gap-2">
                       <div className="h-1 flex-1 bg-gray-800 rounded-full overflow-hidden">
                          <div className="h-full bg-blue-500" style={{ width: '60%' }}></div>
                       </div>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Performance Detail Panels */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {Array.isArray(generatedReport.data?.agents) && generatedReport.data.agents.length > 0 && (
                <div className="space-y-4">
                  <h4 className="flex items-center gap-2 text-sm font-black text-gray-400 uppercase tracking-[0.2em]">
                    <Users className="w-4 h-4" />
                    {t('reports.agent_efficiency')}
                  </h4>
                  <div className="p-2 bg-space-800/30 rounded-2xl border border-white/5 space-y-1">
                    {generatedReport.data.agents.map((agent) => (
                      <div key={agent.id} className="flex items-center justify-between p-4 bg-space-800/50 rounded-xl border border-white/5 hover:bg-space-800 transition-colors">
                        <div className="min-w-0">
                          <p className="font-bold text-gray-100 truncate">{agent.name}</p>
                          <div className="flex items-center gap-3 mt-1 text-[10px] text-gray-500 font-bold uppercase tracking-wider">
                            <span className="flex items-center gap-1"><MessageSquare className="w-3 h-3" /> {agent.conversations || 0} {t('reports.conversations').toLowerCase()}</span>
                            <span className="text-white/10">|</span>
                            <span className="flex items-center gap-1"><Zap className="w-3 h-3" /> {agent.messages || 0} {t('reports.handled_messages').toLowerCase()}</span>
                          </div>
                        </div>
                        <div className="flex flex-col items-end">
                           <span className="text-lg font-black text-blue-400">
                             {Math.round(((agent.messages || 0) / (generatedReport.data.messages?.total || 1)) * 100)}%
                           </span>
                           <span className="text-[9px] text-gray-600 uppercase font-black">{t('reports.ai_load')}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {generatedReport.data?.generated !== undefined && (
                <div className="lg:col-span-2 space-y-4">
                  <h4 className="flex items-center gap-2 text-sm font-black text-gray-400 uppercase tracking-[0.2em]">
                    <Zap className="w-4 h-4" />
                    Performance Proactive AI
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="p-6 bg-space-800/30 rounded-2xl border border-white/5 flex flex-col items-center">
                          <span className="text-3xl font-black text-white">{generatedReport.data.generated}</span>
                          <span className="text-[10px] font-bold text-gray-500 uppercase mt-1">Suggérés</span>
                      </div>
                      <div className="p-6 bg-space-800/30 rounded-2xl border border-white/5 flex flex-col items-center">
                          <span className="text-3xl font-black text-gold-400">{generatedReport.data.sent}</span>
                          <span className="text-[10px] font-bold text-gray-500 uppercase mt-1">Confirmés</span>
                      </div>
                      <div className="p-6 bg-space-800/30 rounded-2xl border border-white/5 flex flex-col items-center">
                          <span className="text-3xl font-black text-blue-400">{generatedReport.data.adoption_rate}%</span>
                          <span className="text-[10px] font-bold text-gray-500 uppercase mt-1">Adoption</span>
                      </div>
                      <div className="p-6 bg-space-800/30 rounded-2xl border border-emerald-500/20 flex flex-col items-center sm:col-span-2">
                          <span className="text-3xl font-black text-emerald-400">{(generatedReport.data.attributed_revenue || 0).toLocaleString()} XOF</span>
                          <span className="text-[10px] font-bold text-gray-500 uppercase mt-1">Chiffre d'Affaire Attribué (ROI)</span>
                      </div>
                      <div className="p-6 bg-space-800/30 rounded-2xl border border-blue-500/20 flex flex-col items-center">
                          <span className="text-3xl font-black text-blue-500">{generatedReport.data.attributed_orders}</span>
                          <span className="text-[10px] font-bold text-gray-500 uppercase mt-1">Ventes</span>
                      </div>
                  </div>
                </div>
              )}

              {Array.isArray(generatedReport.data?.funnel) && generatedReport.data.funnel.length > 0 && (
                <div className="space-y-4">
                  <h4 className="flex items-center gap-2 text-sm font-black text-gray-400 uppercase tracking-[0.2em]">
                    <Target className="w-4 h-4" />
                    {t('reports.conversion_funnel')}
                  </h4>
                  <div className="p-6 bg-space-800/30 rounded-2xl border border-white/5">
                    <div className="flex flex-col gap-2">
                      {generatedReport.data.funnel.map((stage, idx) => {
                        const total = generatedReport.data.funnel[0]?.count || 1;
                        const percentage = Math.round(((stage.count || 0) / total) * 100);
                        return (
                          <div key={stage.stage || idx} className="relative">
                            <div className="flex items-center justify-between mb-1 px-1">
                              <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">{stage.stage}</span>
                              <span className={`text-xs font-black ${idx === 0 ? 'text-blue-400' : 'text-gray-400'}`}>{stage.count || 0}</span>
                            </div>
                            <div className="h-10 bg-space-900 rounded-xl overflow-hidden flex items-center px-4 relative group">
                                <div 
                                  className={`absolute left-0 top-0 bottom-0 transition-all duration-1000 ${
                                    idx === 0 ? 'bg-blue-500/20' : 
                                    idx === 1 ? 'bg-gold-400/20' : 
                                    'bg-emerald-500/20'
                                  }`}
                                  style={{ width: `${percentage}%` }}
                                />
                                <div className="relative z-10 flex items-center justify-between w-full">
                                   <span className="text-[10px] font-black text-gray-500 opacity-50">{percentage}% {t('reports.of_total')}</span>
                                </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Product Performance Table ENRICHED */}
            {Array.isArray(generatedReport.data?.products) && generatedReport.data.products.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="flex items-center gap-2 text-sm font-black text-gray-400 uppercase tracking-[0.2em]">
                    <ShoppingCart className="w-4 h-4" />
                    {t('reports.top_performing_products')}
                  </h4>
                </div>
                <div className="rounded-2xl border border-white/5 bg-space-800/30 overflow-hidden">
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr className="text-left text-[10px] text-gray-500 border-b border-white/5 bg-white/2 font-black uppercase tracking-widest">
                        <th className="px-6 py-4">{t('reports.product_name')}</th>
                        <th className="px-6 py-4 text-right">{t('reports.unit_price')}</th>
                        <th className="px-6 py-4 text-center">{t('reports.sold_qty')}</th>
                        <th className="px-6 py-4 text-right">{t('reports.turnover')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {generatedReport.data.products.slice(0, 10).map((p) => (
                        <tr key={p.id} className="hover:bg-white/2 transition-colors group">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                               <div className="w-8 h-8 rounded-lg bg-space-900 flex items-center justify-center text-xs font-black text-gray-500">
                                  {p.name.charAt(0)}
                               </div>
                               <span className="font-bold text-gray-200 group-hover:text-blue-400 transition-colors">{p.name}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-right text-gray-400 font-mono">{(p.price || 0).toLocaleString()} XOF</td>
                          <td className="px-6 py-4 text-center">
                             <span className="px-3 py-1 rounded-full bg-gold-400/10 text-gold-400 font-black text-[10px]">{p.sold}</span>
                          </td>
                          <td className="px-6 py-4 text-right font-black text-emerald-400 font-mono">{(p.revenue || 0).toLocaleString()} XOF</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
          
          <div className="p-6 bg-gradient-to-t from-black/20 to-transparent flex justify-center border-t border-white/5">
             <button onClick={handleExportPDF} className="flex items-center gap-2 text-xs font-black text-gray-500 uppercase tracking-widest hover:text-white transition-colors">
                <Download className="w-4 h-4" />
                {t('reports.export_pdf_hd')}
             </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Report History */}
        <div className={`p-6 rounded-2xl border transition-all duration-300 ${
          isDark ? 'bg-space-800/20 border-space-700/50 hover:bg-space-800/30' : 'bg-white border-gray-100 hover:shadow-md shadow-sm'
        }`}>
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-gray-100">{t('reports.history')}</h3>
            <div className="p-2 bg-gray-500/10 rounded-lg">
               <Search className="w-4 h-4 text-gray-500" />
            </div>
          </div>
          {history.length === 0 ? (
            <p className="text-gray-400 text-center py-8">{t('reports.no_generated_reports')}</p>
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
                    <button
                      onClick={(e) => handleDeleteReport(e, report.id)}
                      className="p-2 text-gray-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
                      title={t('reports.delete')}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Subscriptions */}
        <div className={`p-6 rounded-2xl border transition-all duration-300 ${
          isDark ? 'bg-space-800/20 border-space-700/50 hover:bg-space-800/30' : 'bg-white border-gray-100 hover:shadow-md shadow-sm'
        }`}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-100">{t('reports.scheduled_reports')}</h3>
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
              <p className="text-gray-400">{t('reports.no_scheduled_reports')}</p>
              <button
                onClick={() => setShowSubModal(true)}
                className="text-gold-400 text-sm mt-2 hover:underline"
              >
                {t('reports.add_subscription')}
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
                        {sub.frequency === 'daily' ? t('reports.daily') : sub.frequency === 'weekly' ? t('reports.weekly') : t('reports.monthly')}
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
      {showSubModal && createPortal(
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="relative z-10 card p-4 sm:p-6 w-full max-w-md max-h-[90vh] sm:max-h-[85vh] flex flex-col rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden animate-fadeIn">
            <h2 className="text-xl font-display font-bold text-gray-100 mb-6">
              {t('reports.schedule_report')}
            </h2>
            <form onSubmit={handleCreateSubscription} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">{t('reports.report_type')}</label>
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
                  <option value="daily">{t('reports.daily')}</option>
                  <option value="weekly">{t('reports.weekly')}</option>
                  <option value="monthly">{t('reports.monthly')}</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">{t('reports.optional_email')}</label>
                <input
                  type="email"
                  value={subForm.email}
                  onChange={(e) => setSubForm({ ...subForm, email: e.target.value })}
                  className="input"
                  placeholder={t('reports.leave_empty_email')}
                />
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowSubModal(false)}
                  className="btn-secondary"
                >
                  {t('reports.cancel')}
                </button>
                <button type="submit" className="btn-primary">
                  {t('reports.create_subscription')}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}
