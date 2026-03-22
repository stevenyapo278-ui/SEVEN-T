import React, { useState, useEffect } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';
import AuditLogsContent from './Admin/AuditLogsContent';
import AnomaliesContent from './Admin/AnomaliesContent';
import { usePageTitle } from '../hooks/usePageTitle';
import { Activity, AlertCircle } from 'lucide-react';

export default function Logs() {
  usePageTitle('Journal d\'activité – Seven-T');
  const [activeTab, setActiveTab] = useState('audit'); // 'audit' or 'anomalies'
  
  // Audit Logs State
  const [logs, setLogs] = useState([]);
  const [auditLoading, setAuditLoading] = useState(true);
  const [auditPagination, setAuditPagination] = useState({ limit: 20, offset: 0, total: 0 });
  const [auditFilters, setAuditFilters] = useState({ action: '', actionExact: '', entityType: '', dateFrom: '', dateTo: '', ip: '', onlyErrors: false });

  // Anomalies State
  const [anomalies, setAnomalies] = useState([]);
  const [anomaliesStats, setAnomaliesStats] = useState({});
  const [anomaliesLoading, setAnomaliesLoading] = useState(true);
  const [anomaliesFilters, setAnomaliesFilters] = useState({ resolved: 'open', severity: '', type: '', q: '' });

  const loadAuditLogs = async () => {
    setAuditLoading(true);
    try {
      const response = await api.get('/users/me/audit-logs', {
        params: {
          limit: auditPagination.limit,
          offset: auditPagination.offset,
          ...auditFilters
        }
      });
      setLogs(response.data.logs);
      setAuditPagination(prev => ({ ...prev, total: response.data.total }));
    } catch (error) {
      console.error('Failed to load audit logs:', error);
      toast.error('Erreur lors du chargement des activités');
    } finally {
      setAuditLoading(false);
    }
  };

  const loadAnomalies = async () => {
    setAnomaliesLoading(true);
    try {
      const response = await api.get('/users/me/anomalies', {
        params: { ...anomaliesFilters }
      });
      setAnomalies(response.data.anomalies);
      setAnomaliesStats(response.data.stats || {});
    } catch (error) {
      console.error('Failed to load anomalies:', error);
      toast.error('Erreur lors du chargement des alertes');
    } finally {
      setAnomaliesLoading(false);
    }
  };

  const resolveAnomaly = async (id) => {
    try {
      await api.post(`/users/me/anomalies/${id}/resolve`);
      toast.success('Anomalie résolue');
      loadAnomalies();
    } catch (error) {
      console.error('Failed to resolve anomaly:', error);
      toast.error('Erreur lors de la résolution');
    }
  };

  const resolveAnomaliesByType = async (type) => {
    try {
      const response = await api.post(`/users/me/anomalies/resolve-type/${type}`);
      toast.success(`${response.data.resolved_count} anomalie(s) résolue(s)`);
      loadAnomalies();
    } catch (error) {
      console.error('Failed to resolve anomalies by type:', error);
      toast.error('Erreur lors de la résolution');
    }
  };

  useEffect(() => {
    if (activeTab === 'audit') {
      loadAuditLogs();
    } else {
      loadAnomalies();
    }
  }, [activeTab, auditPagination.offset, auditFilters, anomaliesFilters]);

  const runHealthCheck = async () => {
    try {
      const response = await api.post('/users/me/anomalies/health-check');
      toast.success(response.data.message);
      loadAnomalies();
    } catch (error) {
      console.error('Failed to run health check:', error);
      toast.error('Erreur lors de la vérification');
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Tabs */}
      <div className="flex items-center gap-1 p-1 bg-space-800/30 rounded-2xl w-fit border border-space-700/30">
        <button
          onClick={() => setActiveTab('audit')}
          className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold transition-all ${
            activeTab === 'audit' 
              ? 'bg-gold-400 text-space-950 shadow-lg shadow-gold-400/20' 
              : 'text-gray-400 hover:text-gray-200 hover:bg-space-700/50'
          }`}
        >
          <Activity className="w-4 h-4" />
          Activités
        </button>
        <button
          onClick={() => setActiveTab('anomalies')}
          className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold transition-all ${
            activeTab === 'anomalies' 
              ? 'bg-amber-500 text-space-950 shadow-lg shadow-amber-500/20' 
              : 'text-gray-400 hover:text-gray-200 hover:bg-space-700/50'
          }`}
        >
          <AlertCircle className="w-4 h-4" />
          Alertes & Anomalies
          {anomaliesStats.total > 0 && (
            <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${activeTab === 'anomalies' ? 'bg-space-950/20 text-space-950' : 'bg-amber-500/20 text-amber-500'}`}>
              {anomaliesStats.total}
            </span>
          )}
        </button>
      </div>

      <div className="card p-4 sm:p-6 overflow-hidden">
        {activeTab === 'audit' ? (
          <AuditLogsContent 
            logs={logs}
            loading={auditLoading}
            pagination={auditPagination}
            onPageChange={(offset) => setAuditPagination(prev => ({ ...prev, offset }))}
            filters={auditFilters}
            onFilterChange={setAuditFilters}
            onRefresh={loadAuditLogs}
          />
        ) : (
          <AnomaliesContent 
            anomalies={anomalies}
            stats={anomaliesStats}
            loading={anomaliesLoading}
            filters={anomaliesFilters}
            onChangeFilters={setAnomaliesFilters}
            onRefresh={loadAnomalies}
            onHealthCheck={runHealthCheck}
            onResolve={resolveAnomaly}
            onResolveByType={resolveAnomaliesByType}
          />
        )}
      </div>
    </div>
  );
}
