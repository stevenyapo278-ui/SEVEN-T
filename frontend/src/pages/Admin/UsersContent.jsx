import { 
  Search, 
  Plus, 
  Edit, 
  Trash2, 
  Shield, 
  ShieldOff, 
  RefreshCw, 
  ChevronLeft, 
  ChevronRight, 
  RotateCcw, 
  Users, 
  FileText,
  ChevronDown,
  ChevronUp,
  X,
  UserCheck
} from 'lucide-react'
import { useState, useEffect } from 'react'
import api from '../../services/api'
import { createPortal } from 'react-dom'
import toast from 'react-hot-toast'

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
  onRefresh,
  onRestore,
  onViewLogs,
  onEdit,
  onCreate,
  formatDate
}) {
  const totalPages = Math.ceil(pagination.total / pagination.limit)
  const currentPage = Math.floor(pagination.offset / pagination.limit) + 1
  
  const [expandedRows, setExpandedRows] = useState(new Set())
  const [managersByOwner, setManagersByOwner] = useState({})
  const [loadingManagers, setLoadingManagers] = useState({})
  const [teamModal, setTeamModal] = useState({ open: false, owner: null })

  const toggleRow = async (userId) => {
    const newExpanded = new Set(expandedRows)
    if (newExpanded.has(userId)) {
      newExpanded.delete(userId)
    } else {
      newExpanded.add(userId)
      // Fetch managers if not already loaded or reload them
      loadManagers(userId)
    }
    setExpandedRows(newExpanded)
  }

  const loadManagers = async (ownerId) => {
    setLoadingManagers(prev => ({ ...prev, [ownerId]: true }))
    try {
      const resp = await api.get(`/admin/users?parent_id=${ownerId}&limit=100`)
      setManagersByOwner(prev => ({ ...prev, [ownerId]: resp.data.users }))
    } catch (err) {
      console.error('Error loading managers:', err)
    } finally {
      setLoadingManagers(prev => ({ ...prev, [ownerId]: false }))
    }
  }

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
                {users.map((user) => {
                  const isExpanded = expandedRows.has(user.id);
                  const hasManagers = (user.managers_count || 0) > 0;
                  
                  return (
                    <>
                      <tr key={user.id} className={`hover:bg-space-800/50 transition-colors ${isExpanded ? 'bg-space-800/30' : ''}`}>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            {hasManagers && (
                              <button onClick={() => toggleRow(user.id)} className="p-1 -ml-1 text-gray-500 hover:text-gold-400">
                                {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                              </button>
                            )}
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${user.is_admin ? 'bg-gold-400/20' : 'bg-space-700'}`}>
                              {user.is_admin ? <Shield className="w-5 h-5 text-gold-400" /> : <Users className="w-5 h-5 text-gray-500" />}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <div className="font-medium text-gray-100">{user.name}</div>
                                {(user.role === 'manager' || user.parent_user_id) && (
                                  <span className="px-1.5 py-0.5 rounded-md bg-blue-500/10 text-blue-400 text-[10px] font-bold uppercase tracking-wider border border-blue-500/20">
                                    Gérant
                                  </span>
                                )}
                                {user.is_influencer === 1 && (
                                  <span className="px-1.5 py-0.5 rounded-md bg-gold-400/10 text-gold-400 text-[10px] font-bold uppercase tracking-wider border border-gold-400/20">
                                    Influenceur
                                  </span>
                                )}
                                {hasManagers && !isExpanded && (
                                  <button onClick={() => setTeamModal({ open: true, owner: user })} className="px-1.5 py-0.5 rounded-md bg-gold-400/10 text-gold-400 text-[9px] font-bold border border-gold-400/20 hover:bg-gold-400/20">
                                    {user.managers_count} ÉQUIPE
                                  </button>
                                )}
                              </div>
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
                            <button onClick={() => onViewLogs(user)} className="p-1.5 text-gray-400 hover:text-gold-400 hover:bg-gold-400/10 rounded-lg transition-colors" title="Voir le journal d'activité">
                              <FileText className="w-4 h-4" />
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
                      
                      {isExpanded && (
                        <tr className="bg-space-800/10">
                          <td colSpan="8" className="px-8 pb-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                              {/* Profil Business */}
                              <div className="bg-space-800/50 border border-space-700/50 p-5 rounded-2xl space-y-4">
                                <div className="flex items-center gap-2 mb-2">
                                  <div className="w-8 h-8 rounded-lg bg-gold-400/10 flex items-center justify-center text-gold-400">
                                    <Building className="w-4 h-4" />
                                  </div>
                                  <h4 className="text-xs font-bold uppercase tracking-widest text-gray-300">Profil Business</h4>
                                </div>
                                
                                <div className="grid grid-cols-2 gap-y-4 gap-x-6">
                                  <div>
                                    <div className="text-[10px] text-gray-500 uppercase font-bold tracking-tight">Secteur / Industrie</div>
                                    <div className="text-sm text-gray-200 font-medium">{user.industry || 'Non renseigné'}</div>
                                  </div>
                                  <div>
                                    <div className="text-[10px] text-gray-500 uppercase font-bold tracking-tight">Poste / Rôle</div>
                                    <div className="text-sm text-gray-200 font-medium">{user.job_title || 'Non renseigné'}</div>
                                  </div>
                                  <div>
                                    <div className="text-[10px] text-gray-500 uppercase font-bold tracking-tight">Taille Entreprise</div>
                                    <div className="text-sm text-gray-200 font-medium">{user.company_size || 'Non renseigné'}</div>
                                  </div>
                                  <div>
                                    <div className="text-[10px] text-gray-500 uppercase font-bold tracking-tight">Objectif Principal</div>
                                    <div className="text-sm text-gold-400 font-bold">{user.primary_goal || 'Non renseigné'}</div>
                                  </div>
                                </div>
                              </div>

                              {/* Équipe */}
                              <div className="bg-space-800/50 border border-space-700/50 p-5 rounded-2xl space-y-4">
                                <div className="flex items-center justify-between mb-2">
                                  <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400">
                                      <Users className="w-4 h-4" />
                                    </div>
                                    <h4 className="text-xs font-bold uppercase tracking-widest text-gray-300">Équipe & Gérants</h4>
                                  </div>
                                  {hasManagers && (
                                    <span className="text-[10px] font-bold text-blue-400 bg-blue-400/10 px-2 py-0.5 rounded-full border border-blue-400/20">
                                      {user.managers_count}
                                    </span>
                                  )}
                                </div>

                                <div className="space-y-2">
                                  {loadingManagers[user.id] ? (
                                    <div className="flex items-center gap-2 text-xs text-gray-500 italic py-4">
                                      <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-gold-400"></div>
                                      Chargement des collaborateurs...
                                    </div>
                                  ) : managersByOwner[user.id]?.length > 0 ? (
                                    <div className="grid grid-cols-1 gap-2">
                                      {managersByOwner[user.id].map(manager => (
                                        <div key={manager.id} className="bg-space-900/50 border border-space-700/50 p-2 px-3 rounded-xl flex items-center justify-between group hover:border-blue-400/30 transition-all">
                                          <div className="flex items-center gap-3">
                                            <div className="w-7 h-7 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400">
                                              <UserCheck className="w-4 h-4" />
                                            </div>
                                            <div>
                                              <div className="text-xs font-bold text-gray-200">{manager.name}</div>
                                              <div className="text-[10px] text-gray-500">{manager.email}</div>
                                            </div>
                                          </div>
                                          <button onClick={() => onEdit(manager)} className="p-1.5 text-gray-600 hover:text-blue-400 transition-colors">
                                            <Edit className="w-3.5 h-3.5" />
                                          </button>
                                        </div>
                                      ))}
                                    </div>
                                  ) : (
                                    <div className="text-xs text-gray-500 italic py-4 text-center border border-dashed border-space-700 rounded-xl">
                                      Aucun collaborateur trouvé.
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  )
                })}
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

      {/* Managers Modal */}
      {teamModal.open && teamModal.owner && (
        <ManagersModal 
          owner={teamModal.owner} 
          onClose={() => setTeamModal({ open: false, owner: null })}
          onEdit={onEdit} 
        />
      )}
    </div>
  )
}

function ManagersModal({ owner, onClose, onEdit }) {
  const [managers, setManagers] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetch = async () => {
      try {
        const resp = await api.get(`/admin/users?parent_id=${owner.id}&limit=100`)
        setManagers(resp.data.users)
      } catch (err) {
        toast.error('Erreur lors du chargement de l équipe')
      } finally {
        setLoading(false)
      }
    }
    fetch()
  }, [owner.id])

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-2xl bg-space-900 border border-space-700 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
        <div className="flex items-center justify-between p-5 border-b border-space-700 bg-space-800/50">
          <div>
            <h3 className="text-lg font-display font-bold text-gray-100 flex items-center gap-2">
              <Users className="w-5 h-5 text-gold-400" />
              Équipe de {owner.name}
            </h3>
            <p className="text-xs text-gray-500 uppercase tracking-widest mt-1">Gestion des gérants ({managers.length})</p>
          </div>
          <button onClick={onClose} className="p-2 text-gray-500 hover:text-gray-100 bg-space-700 rounded-xl transition-all">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-5">
          {loading ? (
            <div className="flex flex-col items-center justify-center p-12 text-gray-500">
               <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-gold-400 mb-4"></div>
               Chargement du personnel...
            </div>
          ) : managers.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {managers.map(manager => (
                <div key={manager.id} className="bg-space-800 border border-space-700 p-4 rounded-2xl flex items-center justify-between group hover:border-gold-400/30 transition-all">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-gold-400/10 flex items-center justify-center text-gold-400">
                      <Shield className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="text-sm font-bold text-gray-100">{manager.name}</div>
                      <div className="text-xs text-gray-500">{manager.email}</div>
                    </div>
                  </div>
                  <button onClick={() => { onEdit(manager); onClose(); }} className="p-2 text-gray-500 hover:text-gold-400 hover:bg-gold-400/10 rounded-xl transition-all">
                    <Edit className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center p-12 text-center">
              <div className="w-16 h-16 rounded-full bg-space-800 flex items-center justify-center text-gray-600 mb-4">
                <Users className="w-8 h-8" />
              </div>
              <p className="text-gray-400">Aucun gérant trouvé pour ce client.</p>
              <p className="text-xs text-gray-600 mt-1">Les sous-comptes créés s'afficheront ici.</p>
            </div>
          )}
        </div>
        
        <div className="p-4 bg-space-800/50 border-t border-space-700 flex justify-end">
          <button onClick={onClose} className="btn-secondary">Fermer</button>
        </div>
      </div>
    </div>,
    document.body
  )
}
