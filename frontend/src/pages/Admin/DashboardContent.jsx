import { Users, Bot, MessageSquare, Activity, UserPlus, AlertCircle } from 'lucide-react'
import StatCard from './StatCard'

export default function DashboardContent({ stats, loading, anomalyStats }) {
  if (loading || !stats) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gold-400"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {anomalyStats.total > 0 && (
        <div className={`p-4 rounded-xl flex items-center gap-4 ${
          anomalyStats.bySeverity?.critical > 0 
            ? 'bg-red-500/20 border border-red-500/30' 
            : anomalyStats.bySeverity?.high > 0
            ? 'bg-orange-500/20 border border-orange-500/30'
            : 'bg-amber-500/20 border border-amber-500/30'
        }`}>
          <AlertCircle className={`w-6 h-6 ${
            anomalyStats.bySeverity?.critical > 0 ? 'text-red-400' :
            anomalyStats.bySeverity?.high > 0 ? 'text-orange-400' : 'text-amber-400'
          }`} />
          <div className="flex-1">
            <p className="font-medium text-gray-100">
              {anomalyStats.total} anomalie{anomalyStats.total > 1 ? 's' : ''} détectée{anomalyStats.total > 1 ? 's' : ''}
            </p>
            <p className="text-sm text-gray-400">
              {anomalyStats.bySeverity?.critical > 0 && `${anomalyStats.bySeverity.critical} critique(s) • `}
              {anomalyStats.bySeverity?.high > 0 && `${anomalyStats.bySeverity.high} haute(s) • `}
              {anomalyStats.bySeverity?.medium > 0 && `${anomalyStats.bySeverity.medium} moyenne(s)`}
            </p>
          </div>
          <a href="#" onClick={(e) => { e.preventDefault(); }} className="text-sm text-gold-400 hover:underline">
            Voir les anomalies →
          </a>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Users} label="Utilisateurs" value={stats.stats.users} subValue={`${stats.stats.activeUsers} actifs`} color="gold" />
        <StatCard icon={Bot} label="Agents IA" value={stats.stats.agents} subValue={`${stats.stats.activeAgents} connectés`} color="blue" />
        <StatCard icon={MessageSquare} label="Conversations" value={stats.stats.conversations} color="emerald" />
        <StatCard icon={Activity} label="Messages" value={stats.stats.messages} color="blue" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card p-6">
          <h3 className="text-lg font-display font-semibold text-gray-100 mb-4">Utilisateurs par plan</h3>
          <div className="space-y-3">
            {stats.usersByPlan.map((item) => (
              <div key={item.plan} className="flex items-center justify-between">
                <span className="text-gray-300 capitalize">{item.plan}</span>
                <div className="flex items-center gap-3">
                  <div className="w-32 h-2 bg-space-700 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-gold-400 to-blue-500 rounded-full" style={{ width: `${(item.count / stats.stats.users) * 100}%` }} />
                  </div>
                  <span className="text-gold-400 font-medium w-8 text-right">{item.count}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="card p-6">
          <h3 className="text-lg font-display font-semibold text-gray-100 mb-4">Activité récente</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-space-800 rounded-lg">
              <div className="flex items-center gap-3">
                <UserPlus className="w-5 h-5 text-emerald-400" />
                <span className="text-gray-300">Nouvelles inscriptions (7j)</span>
              </div>
              <span className="text-2xl font-bold text-emerald-400">{stats.recentSignups}</span>
            </div>
            {stats.messagesPerDay.slice(-5).map((day) => (
              <div key={day.date} className="flex items-center justify-between text-sm">
                <span className="text-gray-500">{day.date}</span>
                <span className="text-gray-300">{day.count} messages</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
