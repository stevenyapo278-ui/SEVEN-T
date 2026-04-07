import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useTheme } from '../contexts/ThemeContext'
import api from '../services/api'
import { 
  Users, 
  UserPlus, 
  Mail, 
  Shield, 
  Trash2, 
  Edit2, 
  Loader2, 
  Check, 
  X,
  Plus,
  Search,
  MoreVertical,
  ShieldCheck,
  ShieldAlert
} from 'lucide-react'
import toast from 'react-hot-toast'

export default function Team() {
  const { user } = useAuth()
  const { isDark } = useTheme()
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [memberForm, setMemberForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'manager',
    permissions: []
  })

  const loadTeam = async () => {
    setLoading(true)
    try {
      const { data } = await api.get('/users/me/team')
      setMembers(data.team || [])
    } catch (err) {
      toast.error('Erreur lors du chargement de l\'équipe')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (user?.role === 'owner' || user?.is_admin || !user?.parent_user_id) {
      loadTeam()
    }
  }, [user])

  // Redirect non-owners away from this page
  const isOwner = user?.role === 'owner' || user?.is_admin || !user?.parent_user_id;
  
  const navigate = useNavigate();
  useEffect(() => {
    if (user && !isOwner) {
       navigate('/dashboard', { replace: true });
    }
  }, [user, isOwner, navigate]);

  if (!isOwner) return null;

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      if (memberForm.id) {
        await api.put(`/users/me/team/${memberForm.id}`, memberForm)
        toast.success('Membre mis à jour')
      } else {
        await api.post('/users/me/team', memberForm)
        toast.success('Membre ajouté')
      }
      setShowAddModal(false)
      setMemberForm({ name: '', email: '', password: '', role: 'manager', permissions: [] })
      loadTeam()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Erreur lors de l\'enregistrement')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer ce membre ?')) return
    try {
      await api.delete(`/users/me/team/${id}`)
      toast.success('Membre supprimé')
      loadTeam()
    } catch (err) {
      toast.error('Erreur lors de la suppression')
    }
  }

  const handleEdit = (member) => {
    setMemberForm({
      id: member.id,
      name: member.name,
      email: member.email,
      password: '', // Don't show password
      role: member.role || 'manager',
      permissions: typeof member.permissions === 'string' ? JSON.parse(member.permissions || '[]') : (member.permissions || [])
    })
    setShowAddModal(true)
  }

  if (!isOwner) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
        <ShieldAlert className="w-16 h-16 text-red-500 mb-4 opacity-20" />
        <h2 className="text-2xl font-display font-bold mb-2">Accès restreint</h2>
        <p className="text-gray-500 max-w-md">
          Seuls les propriétaires de compte (SaaS Owners) peuvent gérer l'équipe.
        </p>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-display font-bold flex items-center gap-3">
            <Users className="w-8 h-8 text-blue-500" />
            Mon Équipe
          </h1>
          <p className="text-gray-500 mt-1">Gérez les accès de vos collaborateurs à votre espace SaaS.</p>
        </div>
        <button
          onClick={() => {
            setMemberForm({ name: '', email: '', password: '', role: 'manager', permissions: [] })
            setShowAddModal(true)
          }}
          className="flex items-center gap-2 px-6 py-3 bg-blue-500 text-white rounded-2xl font-semibold shadow-lg shadow-blue-500/20 hover:bg-blue-600 transition-all hover:-translate-y-0.5"
        >
          <UserPlus className="w-5 h-5" />
          Ajouter un gestionnaire
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-10 h-10 animate-spin text-blue-500" />
        </div>
      ) : members.length === 0 ? (
        <div className={`p-12 rounded-3xl border-2 border-dashed text-center ${isDark ? 'border-space-700 bg-space-800/20' : 'border-gray-200 bg-gray-50'}`}>
          <div className="w-20 h-20 bg-blue-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <Users className="w-10 h-10 text-blue-500 opacity-40" />
          </div>
          <h3 className="text-xl font-bold mb-2">Aucun membre d'équipe</h3>
          <p className="text-gray-500 mb-6 max-w-sm mx-auto">
            Vous n'avez pas encore ajouté de gestionnaires à votre espace. Ajoutez votre premier collaborateur maintenant.
          </p>
          <button
            onClick={() => setShowAddModal(true)}
            className="text-blue-500 font-semibold hover:underline"
          >
            Ajouter un membre
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {members.map((member) => (
            <div
              key={member.id}
              className={`group relative p-6 rounded-3xl border transition-all duration-300 ${
                isDark ? 'bg-space-800/40 border-space-700/50 hover:bg-space-800/60' : 'bg-white border-gray-100 hover:shadow-xl shadow-sm'
              }`}
            >
              <div className="flex items-start justify-between mb-4">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl font-bold ${
                  isDark ? 'bg-space-700 text-blue-400' : 'bg-blue-50 text-blue-600'
                }`}>
                  {member.name?.charAt(0).toUpperCase()}
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => handleEdit(member)}
                    className="p-2 hover:bg-blue-500/10 text-blue-500 rounded-lg transition-colors"
                    title="Modifier"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(member.id)}
                    className="p-2 hover:bg-red-500/10 text-red-500 rounded-lg transition-colors"
                    title="Supprimer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div>
                <h3 className="font-bold text-lg">{member.name}</h3>
                <div className="flex items-center gap-2 text-sm text-gray-500 mt-1">
                  <Mail className="w-3.5 h-3.5" />
                  {member.email}
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                  member.role === 'owner' 
                    ? 'bg-gold-500/20 text-gold-400 border border-gold-500/20' 
                    : 'bg-blue-500/20 text-blue-400 border border-blue-500/20'
                }`}>
                  {member.role === 'owner' ? 'Propriétaire' : 'Gestionnaire'}
                </span>
                {member.is_active ? (
                  <span className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    Actif
                  </span>
                ) : (
                  <span className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-red-500/10 text-red-400 border border-red-500/20">
                    Inactif
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      {showAddModal && createPortal(
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-4 bg-black/60 backdrop-blur-sm animate-fadeIn"
          onClick={() => setShowAddModal(false)}
        >
          <div 
            className={`relative z-10 w-full max-w-lg rounded-t-[2rem] sm:rounded-3xl shadow-2xl overflow-hidden border animate-slideUp sm:animate-zoomIn ${
              isDark ? 'bg-space-900 border-space-700' : 'bg-white border-gray-100'
            }`}
            onClick={e => e.stopPropagation()}
          >
            <div className="p-6 border-b border-space-700/50 flex items-center justify-between">
              <h2 className="text-xl font-bold flex items-center gap-2">
                {memberForm.id ? <Edit2 className="w-5 h-5 text-blue-400" /> : <UserPlus className="w-5 h-5 text-blue-400" />}
                {memberForm.id ? 'Modifier le gestionnaire' : 'Ajouter un gestionnaire'}
              </h2>
              <button 
                onClick={() => setShowAddModal(false)}
                className="p-2 hover:bg-space-800 rounded-xl transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1.5 ml-1">Nom complet</label>
                <input
                  type="text"
                  required
                  value={memberForm.name}
                  onChange={(e) => setMemberForm({ ...memberForm, name: e.target.value })}
                  className={`w-full px-4 py-3 rounded-2xl border bg-transparent focus:ring-2 focus:ring-blue-500 outline-none transition-all ${
                    isDark ? 'border-space-700 text-white' : 'border-gray-200 text-gray-900'
                  }`}
                  placeholder="Jean Dupont"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1.5 ml-1">Adresse email (identifiant)</label>
                <input
                  type="email"
                  required
                  value={memberForm.email}
                  onChange={(e) => setMemberForm({ ...memberForm, email: e.target.value })}
                  className={`w-full px-4 py-3 rounded-2xl border bg-transparent focus:ring-2 focus:ring-blue-500 outline-none transition-all ${
                    isDark ? 'border-space-700 text-white' : 'border-gray-200 text-gray-900'
                  }`}
                  placeholder="jean.dupont@entreprise.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1.5 ml-1">
                  Mot de passe {memberForm.id && <span className="text-xs font-normal opacity-50">(Laisser vide pour ne pas changer)</span>}
                </label>
                <input
                  type="password"
                  required={!memberForm.id}
                  value={memberForm.password}
                  onChange={(e) => setMemberForm({ ...memberForm, password: e.target.value })}
                  className={`w-full px-4 py-3 rounded-2xl border bg-transparent focus:ring-2 focus:ring-blue-500 outline-none transition-all ${
                    isDark ? 'border-space-700 text-white' : 'border-gray-200 text-gray-900'
                  }`}
                  placeholder="••••••••"
                />
              </div>

              {/* Permissions Section */}
              <div className="pt-4 border-t border-space-700/50">
                <label className="block text-sm font-bold text-blue-400 mb-3 uppercase tracking-wider">Droits d'Accès</label>
                <p className="text-[10px] text-gray-500 mb-4 uppercase tracking-tighter">Cochez les modules que vous souhaitez déléguer à ce collaborateur :</p>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[
                    { key: 'analytics', label: 'Statistiques & Analytics' },
                    { key: 'reports', label: 'Rapports' },
                    { key: 'flows', label: 'Flows (Flux de travail)' },
                    { key: 'payment_module', label: 'Gestion des Paiements' },
                    { key: 'availability_hours', label: 'Heures de disponibilité' },
                    { key: 'voice_responses', label: 'Réponses vocales' },
                    { key: 'sentiment_routing', label: 'Routage par sentiment' },
                    { key: 'catalog_import', label: 'Import Catalogue' },
                    { key: 'human_handoff_alerts', label: 'Alertes Transfert Humain' }
                  ].map(({ key, label }) => {
                    // Check if owner (current user) HAS this module themselves
                    const ownerHasByPlan = user.plan_features?.[key] === true;
                    const ownerHasByOverride = user[`${key}_module_enabled`] === 1 || user[`${key}_enabled`] === 1;
                    const ownerAllowed = ownerHasByPlan || ownerHasByOverride;
                    
                    if (!ownerAllowed) return null; // If owner doesn't have it, they can't delegate it

                    const isChecked = memberForm.permissions?.includes(key);

                    return (
                      <label 
                        key={key} 
                        className={`flex items-center gap-3 p-3 rounded-2xl border transition-all cursor-pointer group ${
                          isChecked 
                            ? 'bg-blue-500/10 border-blue-500/30' 
                            : isDark ? 'bg-space-800/50 border-space-700 hover:border-space-600' : 'bg-gray-50 border-gray-100 hover:border-gray-300'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            const newPerms = e.target.checked 
                              ? [...(memberForm.permissions || []), key]
                              : (memberForm.permissions || []).filter(p => p !== key);
                            setMemberForm({ ...memberForm, permissions: newPerms });
                          }}
                          className="w-4 h-4 rounded border-gray-400 text-blue-500 focus:ring-blue-500"
                        />
                        <span className={`text-xs font-semibold ${isChecked ? 'text-blue-400' : 'text-gray-500 group-hover:text-gray-400'}`}>
                          {label}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="pt-4 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className={`flex-1 px-6 py-3 rounded-2xl font-semibold transition-all ${
                    isDark ? 'bg-space-800 text-gray-300 hover:bg-space-700' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 px-6 py-3 bg-blue-500 text-white rounded-2xl font-semibold shadow-lg shadow-blue-500/20 hover:bg-blue-600 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : memberForm.id ? 'Mettre à jour' : 'Créer le compte'}
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
