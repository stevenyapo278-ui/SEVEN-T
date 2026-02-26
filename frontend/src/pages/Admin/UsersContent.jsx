import { Search, Plus, Edit, Trash2, Shield, ShieldOff, RefreshCw, ChevronLeft, ChevronRight, RotateCcw, Users } from 'lucide-react'

export default function UsersContent({
  users,
  plans = [],
  loading,
  searchQuery,
  setSearchQuery,
  selectedPlan,
  setSelectedPlan,
  selectedStatus,
  setSelectedStatus,
  pagination,
  setPagination,
  onDelete,
  onToggleAdmin,
  onToggleActive,
  onEdit,
  onCreate,
  onRefresh,
  onRestore,
  formatDate
}) {
  const totalPages = Math.ceil(pagination.total / pagination.limit)
  const currentPage = Math.floor(pagination.offset / pagination.limit) + 1

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-4 items-center justify-between">
        <div className="flex gap-3 flex-wrap">
          <div className="input-with-icon w-64">
            <div className="pl-3 flex items-center justify-center flex-shrink-0 text-gray-500">
              <Search className="w-5 h-5" />
            </div>
            <input
              type="text"
              placeholder="Rechercher..."
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setPagination(p => ({ ...p, offset: 0 })); }}
            />
          </div>
          <select
            value={selectedPlan}
            onChange={(e) => { setSelectedPlan(e.target.value); setPagination(p => ({ ...p, offset: 0 })); }}
            className="input-dark"
          >
            <option value="">Tous les plans</option>
            {plans.length > 0
              ? plans.map((p) => (
                  <option key={p.id ?? p.name} value={p.name ?? p.id}>
                    {p.display_name ?? p.name}
                  </option>
                ))
              : (
                <>
                  <option value="free">Free</option>
                  <option value="starter">Starter</option>
                  <option value="pro">Pro</option>
                  <option value="enterprise">Enterprise</option>
                </>
              )}
          </select>
          <select
            value={selectedStatus}
            onChange={(e) => { setSelectedStatus(e.target.value); setPagination(p => ({ ...p, offset: 0 })); }}
            className="input-dark"
          >
            <option value="">Tous les statuts</option>
            <option value="active">Actifs</option>
            <option value="inactive">Inactifs</option>
          </select>
        </div>
        <div className="flex gap-2">
          <button onClick={onRefresh} className="p-2 text-gray-400 hover:text-gray-100 transition-colors">
            <RefreshCw className="w-5 h-5" />
          </button>
          <button onClick={onCreate} className="btn-primary inline-flex items-center gap-2">
            <Plus className="w-5 h-5" />
            Nouvel utilisateur
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gold-400"></div>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto table-responsive">
            <table className="w-full">
              <thead className="bg-space-800">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">Utilisateur</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">Plan</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">Crédits</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">Agents</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">Messages</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">Inscrit le</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">Statut</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-400">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-space-700">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-space-800/50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${user.is_admin ? 'bg-gold-400/20' : 'bg-space-700'}`}>
                          {user.is_admin ? <Shield className="w-5 h-5 text-gold-400" /> : <Users className="w-5 h-5 text-gray-500" />}
                        </div>
                        <div>
                          <div className="font-medium text-gray-100">{user.name}</div>
                          {user.parent_name && <div className="text-xs text-gray-500">Sous-compte de {user.parent_name}</div>}
                          <div className="text-sm text-gray-500">{user.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        user.plan === 'pro' ? 'bg-blue-500/20 text-blue-400' :
                        user.plan === 'starter' ? 'bg-blue-500/20 text-blue-400' :
                        user.plan === 'enterprise' ? 'bg-gold-400/20 text-gold-400' :
                        'bg-gray-500/20 text-gray-400'
                      }`}>
                        {user.plan}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-300">{user.credits}</td>
                    <td className="px-4 py-3 text-gray-300">{user.agents_count}</td>
                    <td className="px-4 py-3 text-gray-300">{user.messages_count}</td>
                    <td className="px-4 py-3 text-gray-400 text-sm">{formatDate(user.created_at)}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${user.is_active ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                        {user.is_active ? 'Actif' : 'Inactif'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => onToggleAdmin(user)} className={`p-1.5 rounded-lg transition-colors ${user.is_admin ? 'text-gold-400 hover:bg-gold-400/10' : 'text-gray-500 hover:bg-space-700'}`} title={user.is_admin ? 'Retirer admin' : 'Rendre admin'}>
                          {user.is_admin ? <Shield className="w-4 h-4" /> : <ShieldOff className="w-4 h-4" />}
                        </button>
                        <button onClick={() => onEdit(user)} className="p-1.5 text-gray-500 hover:text-gray-100 hover:bg-space-700 rounded-lg transition-colors" title="Modifier">
                          <Edit className="w-4 h-4" />
                        </button>
                        {user.is_active === 0 && user.email?.includes('_deleted_') ? (
                          <button onClick={() => onRestore(user.id)} className="p-1.5 text-emerald-400 hover:bg-emerald-500/10 rounded-lg transition-colors" title="Restaurer l'utilisateur">
                            <RotateCcw className="w-4 h-4" />
                          </button>
                        ) : (
                          <button onClick={() => onDelete(user.id)} className="p-1.5 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors" title="Supprimer">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between px-4 py-3 border-t border-space-700">
            <span className="text-sm text-gray-500">
              {pagination.offset + 1} - {Math.min(pagination.offset + pagination.limit, pagination.total)} sur {pagination.total}
            </span>
            <div className="flex items-center gap-2">
              <button onClick={() => setPagination(p => ({ ...p, offset: Math.max(0, p.offset - p.limit) }))} disabled={currentPage === 1} className="p-2 text-gray-400 hover:text-gray-100 disabled:opacity-50 disabled:cursor-not-allowed">
                <ChevronLeft className="w-5 h-5" />
              </button>
              <span className="text-sm text-gray-400">Page {currentPage} / {totalPages || 1}</span>
              <button onClick={() => setPagination(p => ({ ...p, offset: p.offset + p.limit }))} disabled={currentPage >= totalPages} className="p-2 text-gray-400 hover:text-gray-100 disabled:opacity-50 disabled:cursor-not-allowed">
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
