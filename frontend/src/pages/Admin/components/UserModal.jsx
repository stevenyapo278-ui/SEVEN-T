import { useState, useEffect, useRef, useMemo } from 'react'
import DatePicker from 'react-datepicker'
import { Activity, Shield, Zap, AlertTriangle } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../../../services/api'
import AdminModal from './AdminModal'
import UserAuditHistory from './UserAuditHistory'
import { RbacRoleSelector, ModuleSelector } from './UserForm'
import { PLAN_MODULES } from '../constants'
import { getCreditsForPlan } from '../utils'

export default function UserModal({ user, onClose, onSave, plans = [], rolesList = [] }) {
  const isEdit = !!user
  const [activeTab, setActiveTab] = useState('form') // 'form' or 'history'
  const [saving, setSaving] = useState(false)
  
  const activePlans = (plans || []).filter(p => p.is_active !== false && p.is_active !== 0)
  const initialCreditsSyncedRef = useRef(false)

  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    password: '',
    company: user?.company || '',
    plan: user?.plan || 'free',
    credits: user?.credits ?? 500,
    is_admin: user?.is_admin || 0,
    can_manage_users: user?.can_manage_users || 0,
    can_manage_plans: user?.can_manage_plans || 0,
    can_view_stats: user?.can_view_stats || 0,
    can_manage_ai: user?.can_manage_ai || 0,
    can_manage_tickets: user?.can_manage_tickets || 0,
    is_active: user?.is_active ?? 1,
    ...Object.fromEntries(PLAN_MODULES.map(m => [m.key, isEdit ? !!user[m.key] : false])),
    roles: user?.roles ? [...user.roles] : [],
    subscription_end_date: user?.subscription_end_date ? new Date(user.subscription_end_date).toISOString().slice(0, 10) : '',
    industry: user?.industry || '',
    job_title: user?.job_title || '',
    company_size: user?.company_size || '',
    primary_goal: user?.primary_goal || ''
  })

  // Sync plan defaults for new users
  useEffect(() => {
    if (!isEdit && activePlans.length > 0 && !initialCreditsSyncedRef.current) {
      initialCreditsSyncedRef.current = true
      const defaultPlan = activePlans.find(p => p.is_default) || activePlans.find(p => p.name === 'free') || activePlans[0]
      const planName = defaultPlan?.name ?? defaultPlan?.id ?? 'free'
      const defaultCredits = getCreditsForPlan(plans, planName)
      setFormData(prev => ({ ...prev, plan: planName, credits: defaultCredits }))
    }
  }, [plans, isEdit, activePlans])

  const handlePlanChange = (planId) => {
    const defaultCredits = getCreditsForPlan(plans, planId)
    setFormData(prev => ({ ...prev, plan: planId, credits: defaultCredits }))
  }

  const selectedPlanObj = useMemo(() => {
    return plans.find(p => (p.name || p.id) === formData.plan) || {}
  }, [formData.plan, plans])

  const currentPlanFeatures = selectedPlanObj?.features || {}

  const [confirmAdminInput, setConfirmAdminInput] = useState('')
  const isPromotingToAdmin = formData.is_admin === 1 && user?.is_admin !== 1
  const canSubmit = !isPromotingToAdmin || confirmAdminInput.trim() === 'CONFIRMER'

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      if (isEdit) {
        await api.put(`/admin/users/${user.id}`, formData)
        if (formData.password) {
          await api.post(`/admin/users/${user.id}/reset-password`, { new_password: formData.password })
        }
        toast.success('Utilisateur mis à jour')
      } else {
        await api.post('/admin/users', formData)
        toast.success('Utilisateur créé')
      }
      onSave()
    } catch (error) {
      toast.error(error.response?.data?.error || 'Une erreur est survenue')
    } finally {
      setSaving(false)
    }
  }

  const headerAddon = isEdit && (
    <div className="flex bg-space-800 rounded-lg p-0.5 mr-2">
      <button
        onClick={() => setActiveTab('form')}
        className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${activeTab === 'form' ? 'bg-space-700 text-gold-400 shadow-sm' : 'text-gray-500 hover:text-gray-300'}`}
      >
        Détails
      </button>
      <button
        onClick={() => setActiveTab('history')}
        className={`px-3 py-1 text-xs font-semibold rounded-md transition-all flex items-center gap-1 ${activeTab === 'history' ? 'bg-space-700 text-blue-400 shadow-sm' : 'text-gray-500 hover:text-gray-300'}`}
      >
        <Activity className="w-3 h-3" />
        Historique
      </button>
    </div>
  )

  return (
    <AdminModal
      title={isEdit ? user.name : 'Nouvel utilisateur'}
      subtitle={isEdit ? user.email : 'Remplissez les informations ci-dessous'}
      onClose={onClose}
      headerAddon={headerAddon}
    >
      {activeTab === 'history' && isEdit ? (
        <UserAuditHistory userId={user.id} />
      ) : (
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-5 pb-10">
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Nom complet</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="input-dark w-full"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Email professionnel</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="input-dark w-full"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Entreprise</label>
                <input
                  type="text"
                  value={formData.company}
                  onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                  className="input-dark w-full"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                  {isEdit ? 'Nouveau mot de passe (optionnel)' : 'Mot de passe initial'}
                </label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="input-dark w-full"
                  required={!isEdit}
                  minLength={6}
                />
              </div>
            </div>

            {/* Business Profile Section */}
            <div className="p-4 rounded-xl bg-space-800/30 border border-space-700/50 space-y-4">
              <h4 className="text-[10px] font-bold text-gold-400 uppercase tracking-widest flex items-center gap-2">
                <Building className="w-3 h-3" />
                Profil Business & Qualification
              </h4>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1">Secteur / Industrie</label>
                  <input
                    type="text"
                    value={formData.industry}
                    onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                    className="input-dark w-full text-sm"
                    placeholder="ex: Immobilier, E-commerce..."
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1">Poste / Rôle</label>
                  <input
                    type="text"
                    value={formData.job_title}
                    onChange={(e) => setFormData({ ...formData, job_title: e.target.value })}
                    className="input-dark w-full text-sm"
                    placeholder="ex: CEO, Sales Manager..."
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1">Taille Entreprise</label>
                  <input
                    type="text"
                    value={formData.company_size}
                    onChange={(e) => setFormData({ ...formData, company_size: e.target.value })}
                    className="input-dark w-full text-sm"
                    placeholder="ex: 11-50 employés"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1">Objectif Principal</label>
                  <input
                    type="text"
                    value={formData.primary_goal}
                    onChange={(e) => setFormData({ ...formData, primary_goal: e.target.value })}
                    className="input-dark w-full text-sm"
                    placeholder="ex: Automatiser les relances"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-2">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Plan tarifaire</label>
                <select
                  value={formData.plan}
                  onChange={(e) => handlePlanChange(e.target.value)}
                  className="input-dark w-full"
                >
                  {activePlans.map(p => (
                    <option key={p.id ?? p.name} value={p.name ?? p.id}>
                      {p.display_name ?? p.name}
                    </option>
                  ))}
                  {!activePlans.length && <option value="free">Free (défaut)</option>}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Crédits IA</label>
                <input
                  type="number"
                  value={formData.credits}
                  onChange={(e) => setFormData({ ...formData, credits: e.target.value === '' ? 0 : parseInt(e.target.value, 10) })}
                  className="input-dark w-full"
                  placeholder="-1 = illimité"
                />
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-space-800">
            <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4">Accès & Permissions</h4>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
              <label className="flex items-center gap-2 p-3 bg-space-800/50 rounded-xl border border-space-700 cursor-pointer hover:bg-space-800 transition-colors">
                <input
                  type="checkbox"
                  checked={formData.is_admin}
                  onChange={(e) => {
                    const val = e.target.checked ? 1 : 0;
                    setFormData({ 
                      ...formData, 
                      is_admin: val,
                      can_manage_users: val,
                      can_manage_plans: val,
                      can_view_stats: val,
                      can_manage_ai: val,
                      can_manage_tickets: val
                    });
                    if (!e.target.checked) setConfirmAdminInput('');
                  }}
                  className="w-5 h-5 rounded border-space-700 bg-space-900 text-gold-400 focus:ring-gold-400"
                />
                <div>
                  <span className="text-sm font-semibold text-gray-200 block">Administrateur</span>
                  <span className="text-[10px] text-gray-500">Accès complet à la plateforme</span>
                </div>
              </label>

              <label className="flex items-center gap-2 p-3 bg-space-800/50 rounded-xl border border-space-700 cursor-pointer hover:bg-space-800 transition-colors">
                <input
                  type="checkbox"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked ? 1 : 0 })}
                  className="w-5 h-5 rounded border-space-700 bg-space-900 text-emerald-400 focus:ring-emerald-400"
                />
                <div>
                  <span className="text-sm font-semibold text-gray-200 block">Compte Actif</span>
                  <span className="text-[10px] text-gray-500">Autorise la connexion de l&apos;utilisateur</span>
                </div>
              </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 mb-6 px-1">
              {[
                { key: 'can_manage_users', label: 'Gestion des utilisateurs' },
                { key: 'can_manage_plans', label: 'Gestion des plans' },
                { key: 'can_view_stats', label: 'Accès statistiques' },
                { key: 'can_manage_ai', label: 'Gestion de l\'IA' },
                { key: 'can_manage_tickets', label: 'Gestion tickets support' }
              ].map(cap => (
                <label key={cap.key} className="flex items-center gap-2 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={formData[cap.key]}
                    onChange={(e) => {
                      const newVal = e.target.checked ? 1 : 0;
                      const nextData = { ...formData, [cap.key]: newVal };
                      const allChecked = nextData.can_manage_users && nextData.can_manage_plans && nextData.can_view_stats && nextData.can_manage_ai && nextData.can_manage_tickets;
                      setFormData({ ...nextData, is_admin: allChecked ? 1 : 0 });
                    }}
                    className="w-4 h-4 rounded border-space-700 bg-space-800 text-gold-400 focus:ring-gold-400"
                  />
                  <span className="text-xs text-gray-400 group-hover:text-gray-300 transition-colors">{cap.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="pt-4 border-t border-space-800">
            <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4">Modules Additionnels</h4>
            <ModuleSelector 
              formData={formData} 
              setFormData={setFormData}
              currentPlanFeatures={currentPlanFeatures}
              plans={plans}
              parentUser={null} // TODO: Add parent context if needed
            />
          </div>

          {formData.is_admin === 1 && (
            <div className="pt-4 border-t border-space-800">
              <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4">Rôles Administration</h4>
              <RbacRoleSelector 
                selectedRoles={formData.roles}
                availableRoles={rolesList}
                onChange={(roles) => setFormData({ ...formData, roles })}
              />
            </div>
          )}

          {isPromotingToAdmin && (
            <div className="p-4 rounded-xl bg-gold-400/5 border border-gold-400/20 shadow-inner">
              <div className="flex items-start gap-3 mb-3">
                <Shield className="w-5 h-5 text-gold-400 flex-shrink-0" />
                <p className="text-xs text-gray-300 leading-relaxed">
                  Vous accordez des privilèges administrateur. Pour confirmer, tapez le mot-clé <span className="font-bold text-gold-400 uppercase tracking-widest">CONFIRMER</span> ci-dessous.
                </p>
              </div>
              <input
                type="text"
                value={confirmAdminInput}
                onChange={(e) => setConfirmAdminInput(e.target.value)}
                placeholder="CONFIRMER"
                className="input-dark w-full text-center font-mono uppercase text-sm tracking-widest"
              />
            </div>
          )}

          <div className="pt-4 flex gap-3">
            <button type="button" onClick={onClose} className="flex-1 btn-secondary py-3 text-sm font-semibold">
              Annuler
            </button>
            <button 
              type="submit" 
              disabled={saving || !canSubmit} 
              className="flex-1 btn-primary py-3 text-sm font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {saving ? <Activity className="w-4 h-4 animate-spin" /> : null}
              {isEdit ? 'Mettre à jour' : 'Créer l\'utilisateur'}
            </button>
          </div>
        </form>
      )}
    </AdminModal>
  )
}
