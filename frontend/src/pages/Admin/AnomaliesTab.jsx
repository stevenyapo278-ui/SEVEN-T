import { useEffect, useState } from 'react'
import api from '../../services/api'
import toast from 'react-hot-toast'
import AnomaliesContent from './AnomaliesContent'

export default function AnomaliesTab() {
  const [anomalies, setAnomalies] = useState([])
  const [stats, setStats] = useState({ total: 0, bySeverity: {}, byType: {} })
  const [loading, setLoading] = useState(false)
  const [filters, setFilters] = useState({ q: '', severity: '', type: '', resolved: 'open' })

  const loadStats = async () => {
    try {
      const response = await api.get('/admin/anomalies/stats')
      setStats(response.data)
    } catch (error) {
      console.error('Error loading anomaly stats:', error)
    }
  }

  const load = async (nextFilters) => {
    setLoading(true)
    try {
      const f = nextFilters || filters
      const params = {
        limit: 200,
        offset: 0,
        ...(f.q?.trim() ? { q: f.q.trim() } : {}),
        ...(f.severity ? { severity: f.severity } : {}),
        ...(f.type ? { type: f.type } : {}),
        ...(f.resolved ? { resolved: f.resolved } : {}),
      }
      const response = await api.get('/admin/anomalies', { params })
      setAnomalies(response.data.anomalies || [])
      await loadStats()
    } catch (error) {
      toast.error('Erreur lors du chargement des anomalies')
    } finally {
      setLoading(false)
    }
  }

  const runHealthCheck = async () => {
    setLoading(true)
    try {
      const response = await api.post('/admin/anomalies/health-check')
      toast.success(response.data.message)
      await load(filters)
    } catch (error) {
      toast.error('Erreur lors de la vérification')
    } finally {
      setLoading(false)
    }
  }

  const resolveAnomaly = async (anomalyId) => {
    try {
      await api.post(`/admin/anomalies/${anomalyId}/resolve`)
      toast.success('Anomalie résolue')
      load(filters)
    } catch (error) {
      toast.error('Erreur lors de la résolution')
    }
  }

  const resolveByType = async (type) => {
    try {
      const response = await api.post(`/admin/anomalies/resolve-type/${type}`)
      toast.success(response.data.message)
      load(filters)
    } catch (error) {
      toast.error('Erreur lors de la résolution')
    }
  }

  // Initial load
  useEffect(() => {
    load(filters)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Debounced reload on filters change
  useEffect(() => {
    const t = setTimeout(() => { load(filters) }, 250)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.q, filters.severity, filters.type, filters.resolved])

  return (
    <AnomaliesContent
      anomalies={anomalies}
      stats={stats}
      loading={loading}
      onResolve={resolveAnomaly}
      onResolveByType={resolveByType}
      onHealthCheck={runHealthCheck}
      onRefresh={() => load(filters)}
      filters={filters}
      onChangeFilters={setFilters}
    />
  )
}

