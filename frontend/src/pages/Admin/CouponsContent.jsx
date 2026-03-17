import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Plus, RefreshCw, Edit, Trash2, Loader2, Save, X, Ticket, Zap, Copy, Check } from 'lucide-react'
import api from '../../services/api'
import toast from 'react-hot-toast'
import DatePicker from 'react-datepicker'
import 'react-datepicker/dist/react-datepicker.css'
import { registerLocale } from 'react-datepicker'
import fr from 'date-fns/locale/fr'
registerLocale('fr', fr)

export default function CouponsContent({ users = [] }) {
  const [coupons, setCoupons] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingCoupon, setEditingCoupon] = useState(null)
  const [formData, setFormData] = useState({
    name: '', 
    code: '', 
    discount_type: 'percentage', 
    discount_value: '', 
    max_uses: '', 
    expires_at: '', 
    is_active: true,
    bonus_credits: 0,
    influencer_id: '',
    influencer_reward_type: 'none',
    influencer_reward_value: '',
    create_influencer: false,
    influencer_email: '',
    influencer_name: ''
  })
  const [saving, setSaving] = useState(false)
  const [creationResult, setCreationResult] = useState(null)

  const loadCoupons = async () => {
    setLoading(true)
    try {
      const res = await api.get('/admin/coupons')
      setCoupons(res.data.coupons || [])
    } catch (e) {
      toast.error('Erreur lors du chargement des coupons')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadCoupons()
  }, [])

  const handleEdit = (coupon) => {
    setEditingCoupon(coupon)
    setFormData({
      name: coupon.name || '',
      code: coupon.code,
      discount_type: coupon.discount_type,
      discount_value: coupon.discount_value,
      max_uses: coupon.max_uses || '',
      expires_at: coupon.expires_at ? new Date(coupon.expires_at).toISOString().slice(0, 16) : '',
      is_active: coupon.is_active === 1,
      bonus_credits: coupon.bonus_credits || 0,
      influencer_id: coupon.influencer_id || '',
      influencer_reward_type: coupon.influencer_reward_type || 'none',
      influencer_reward_value: coupon.influencer_reward_value || '',
      create_influencer: false,
      influencer_email: '',
      influencer_name: ''
    })
    setShowModal(true)
  }

  const handleCreate = () => {
    setEditingCoupon(null)
    setCreationResult(null)
    setFormData({
      name: '', 
      code: '', 
      discount_type: 'percentage', 
      discount_value: '', 
      max_uses: '', 
      expires_at: '', 
      is_active: true,
      bonus_credits: 0,
      influencer_id: '',
      influencer_reward_type: 'none',
      influencer_reward_value: '',
      create_influencer: false,
      influencer_email: '',
      influencer_name: ''
    })
    setShowModal(true)
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Voulez-vous vraiment supprimer ce coupon ?')) return
    try {
      await api.delete(`/admin/coupons/${id}`)
      toast.success('Coupon supprimé')
      loadCoupons()
    } catch (e) {
      toast.error(e.response?.data?.error || 'Erreur lors de la suppression')
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      const payload = {
        ...formData,
        discount_value: parseFloat(formData.discount_value),
        max_uses: formData.max_uses ? parseInt(formData.max_uses, 10) : null,
        expires_at: formData.expires_at || null,
        is_active: formData.is_active,
        bonus_credits: parseInt(formData.bonus_credits, 10) || 0,
        influencer_id: formData.influencer_id || null,
        influencer_reward_type: formData.influencer_reward_type,
        influencer_reward_value: parseFloat(formData.influencer_reward_value) || 0,
        create_influencer: formData.create_influencer,
        influencer_email: formData.influencer_email,
        influencer_name: formData.influencer_name
      }
      
      if (editingCoupon) {
        await api.put(`/admin/coupons/${editingCoupon.id}`, payload)
        toast.success('Coupon mis à jour')
        setShowModal(false)
      } else {
        const res = await api.post('/admin/coupons', payload)
        toast.success('Coupon créé')
        if (res.data.tempInfluencerPassword) {
            setCreationResult({
                email: formData.influencer_email,
                password: res.data.tempInfluencerPassword
            })
            // Don't close modal yet if there's a password to show
        } else {
            setShowModal(false)
        }
      }
      loadCoupons()
    } catch (e) {
      toast.error(e.response?.data?.error || 'Erreur lors de la sauvegarde')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-display font-semibold text-gray-100 flex items-center gap-2">
            <Ticket className="w-6 h-6 text-gold-400" />
            Coupons de réduction
          </h2>
          <p className="text-sm text-gray-500 mt-1">Gérez les codes promo pour les abonnements SaaS</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={handleCreate} className="btn-primary order-first sm:order-last flex items-center whitespace-nowrap">
            <Plus className="w-4 h-4 mr-2 flex-shrink-0" />
            Nouveau coupon
          </button>
          <button onClick={loadCoupons} className="btn-secondary touch-target flex items-center justify-center">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
        </div>
      ) : coupons.length === 0 ? (
        <div className="text-center py-10 text-gray-500">
          Aucun coupon créé pour le moment.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {coupons.map(coupon => (
            <div
              key={coupon.id}
              className={`card p-4 relative border-l-4 ${
                !coupon.is_active ? 'opacity-60 border-l-space-600' : 'border-l-blue-500'
              }`}
            >
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h3 className="text-lg font-bold text-gray-100">{coupon.code}</h3>
                  {coupon.name && <p className="text-xs text-gray-500 font-medium">{coupon.name}</p>}
                </div>
                {!coupon.is_active && <span className="px-2 py-0.5 text-xs font-medium bg-red-500/20 text-red-400 rounded-full">Inactif</span>}
              </div>
              
              <div className="text-2xl font-bold text-gold-400 mb-2">
                {coupon.discount_type === 'percentage' ? `-${coupon.discount_value}%` : `-${coupon.discount_value.toLocaleString()} FCFA`}
              </div>
              
              {coupon.bonus_credits > 0 && (
                <div className="flex items-center gap-1.5 text-xs font-bold text-blue-400 mb-4 bg-blue-400/10 px-2 py-1 rounded w-fit capitalize">
                  <Zap className="w-3 h-3" /> +{coupon.bonus_credits} crédits offerts
                </div>
              )}
              
              <div className="space-y-1 mb-4 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Utilisations</span>
                  <span className="text-gray-300 font-medium">{coupon.used_count} / {coupon.max_uses || '∞'}</span>
                </div>
                {coupon.influencer_id && (
                  <div className="flex justify-between items-center bg-space-800/50 p-2 rounded-lg mt-2">
                    <span className="text-[10px] text-gray-500 uppercase font-bold">Influenceur</span>
                    <span className="text-xs text-gold-400 font-bold truncate max-w-[120px]">{coupon.influencer_name || 'Chargement...'}</span>
                  </div>
                )}
                {coupon.expires_at && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Expire le</span>
                    <span className="text-gray-300">{new Date(coupon.expires_at).toLocaleString()}</span>
                  </div>
                )}
              </div>

              <div className="flex gap-2 pt-3 border-t border-space-700">
                {coupon.influencer_id && (
                  <button 
                    onClick={() => {
                        const slug = coupon.influencer_name ? coupon.influencer_name.toLowerCase().trim().replace(/\s+/g, '-') : 'partenaire';
                        const link = `${window.location.origin}/dashboard/${slug}`;
                        navigator.clipboard.writeText(link);
                        toast.success('Lien du tableau de bord influenceur copié');
                    }}
                    className="text-xs px-2 py-1 bg-gold-500/10 hover:bg-gold-500/20 text-gold-400 rounded transition-colors flex-1 flex justify-center items-center"
                    title="Copier le lien du tableau de bord pour l'influencer"
                  >
                    <Copy className="w-3 h-3 mr-1" /> Lien
                  </button>
                )}
                <button onClick={() => handleEdit(coupon)} className="text-xs px-2 py-1 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded transition-colors flex-1 flex justify-center items-center">
                  <Edit className="w-3 h-3 mr-1" /> Modifier
                </button>
                <button onClick={() => handleDelete(coupon.id)} className="text-xs px-2 py-1 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded transition-colors flex-1 flex justify-center items-center">
                  <Trash2 className="w-3 h-3 mr-1" /> Supprimer
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="fixed inset-0 bg-black/80 backdrop-blur-md" />
          <form 
            onSubmit={handleSubmit}
            className="relative z-10 bg-space-900 border border-space-700 rounded-t-3xl sm:rounded-2xl w-full max-w-lg shadow-2xl animate-fadeIn flex flex-col max-h-[95dvh] sm:max-h-[90vh] overflow-hidden"
          >
            {/* Header - Fixed */}
            <div className="flex items-center justify-between p-4 sm:p-5 border-b border-space-700 flex-shrink-0">
              <h3 className="text-lg font-bold text-gray-100">{editingCoupon ? 'Modifier le coupon' : 'Nouveau coupon'}</h3>
              <button type="button" onClick={() => setShowModal(false)} className="text-gray-400 hover:text-white p-2">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body - Scrollable */}
            <div className="p-5 sm:p-8 space-y-6 overflow-y-auto overscroll-contain flex-1">
              {creationResult && (
                <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4 mb-6 animate-in zoom-in-95">
                  <h4 className="text-emerald-400 font-bold text-sm mb-2 flex items-center gap-2">
                    <Check className="w-4 h-4" /> Compte influenceur créé !
                  </h4>
                  <p className="text-xs text-gray-400 mb-3">
                    Veuillez copier et envoyer ces identifiants à l'influenceur car le mot de passe ne sera plus affiché.
                  </p>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between bg-space-950 p-2 rounded border border-space-700">
                      <span className="text-[10px] text-gray-500 uppercase font-bold">Email</span>
                      <span className="text-xs text-gray-200 font-mono">{creationResult.email}</span>
                    </div>
                    <div className="flex items-center justify-between bg-space-950 p-2 rounded border border-space-700">
                      <span className="text-[10px] text-gray-500 uppercase font-bold">Mot de passe</span>
                      <span className="text-xs text-gold-400 font-mono font-bold">{creationResult.password}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const slug = creationResult.name ? creationResult.name.toLowerCase().trim().replace(/\s+/g, '-') : 'partenaire';
                        const text = `Voici vos identifiants pour Seven T :\nEmail : ${creationResult.email}\nMot de passe : ${creationResult.password}\nLien : ${window.location.origin}/dashboard/${slug}`;
                        navigator.clipboard.writeText(text);
                        toast.success('Identifiants copiés !');
                      }}
                      className="w-full mt-2 py-2 bg-emerald-500 text-white rounded-lg text-xs font-bold hover:bg-emerald-600 transition-colors flex items-center justify-center gap-2"
                    >
                      <Copy className="w-4 h-4" /> Copier tout le message
                    </button>
                  </div>
                </div>
              )}

              <div className="space-y-4">
                <h4 className="text-xs font-bold text-gold-400 uppercase tracking-widest border-b border-gold-400/20 pb-1">Informations de base</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Code promo *</label>
                    <input
                      type="text"
                      required
                      value={formData.code}
                      onChange={e => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                      className="w-full px-3 py-2 bg-space-800 border border-space-600 rounded-lg text-white uppercase focus:ring-1 focus:ring-gold-400 transition-shadow outline-none"
                      placeholder="Ex: SOLDES2024"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Nom (interne)</label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={e => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-3 py-2 bg-space-800 border border-space-600 rounded-lg text-white focus:ring-1 focus:ring-gold-400 transition-shadow outline-none"
                      placeholder="Ex: SOLDES ETE 2024"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Type de réduction *</label>
                    <select
                      value={formData.discount_type}
                      onChange={e => setFormData({ ...formData, discount_type: e.target.value })}
                      className="w-full px-3 py-2 bg-space-800 border border-space-600 rounded-lg text-white"
                    >
                      <option value="percentage">Pourcentage (%)</option>
                      <option value="fixed">Montant fixe</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Valeur *</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      min="0"
                      value={formData.discount_value}
                      onChange={e => setFormData({ ...formData, discount_value: e.target.value })}
                      className="w-full px-3 py-2 bg-space-800 border border-space-600 rounded-lg text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-blue-400 mb-1 flex items-center gap-1">
                    <Zap className="w-3 h-3" /> Bonus de crédits client
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.bonus_credits}
                    onChange={e => setFormData({ ...formData, bonus_credits: e.target.value })}
                    className="w-full px-3 py-2 bg-blue-500/5 border border-blue-500/30 rounded-lg text-white focus:ring-1 focus:ring-blue-400 outline-none"
                    placeholder="Crédits offerts en plus de la réduction"
                  />
                  <p className="text-[10px] text-gray-500 mt-1">Nombre de crédits ajoutés au compte du client après paiement.</p>
                </div>
              </div>

              <div className="space-y-4 pt-4">
                <h4 className="text-xs font-bold text-blue-400 uppercase tracking-widest border-b border-blue-400/20 pb-1">Paramètres Influenceur</h4>
                
                {!formData.create_influencer ? (
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Associer à un influenceur existant</label>
                    <select
                      value={formData.influencer_id}
                      onChange={e => setFormData({ ...formData, influencer_id: e.target.value })}
                      className="w-full px-3 py-2 bg-space-800 border border-space-600 rounded-lg text-white"
                    >
                      <option value="">Aucun influenceur</option>
                      {users.map(u => (
                        <option key={u.id} value={u.id}>{u.name} ({u.email})</option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-in slide-in-from-top-2">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">Nom de l'influenceur *</label>
                      <input
                        type="text"
                        required={formData.create_influencer}
                        value={formData.influencer_name}
                        onChange={e => setFormData({ ...formData, influencer_name: e.target.value })}
                        className="w-full px-3 py-2 bg-space-800 border border-space-600 rounded-lg text-white"
                        placeholder="Prénom Nom"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">Email de l'influenceur *</label>
                      <input
                        type="email"
                        required={formData.create_influencer}
                        value={formData.influencer_email}
                        onChange={e => setFormData({ ...formData, influencer_email: e.target.value })}
                        className="w-full px-3 py-2 bg-space-800 border border-space-600 rounded-lg text-white"
                        placeholder="email@exemple.com"
                      />
                    </div>
                  </div>
                )}

                {!editingCoupon && (
                  <label className="flex items-center gap-2 cursor-pointer pb-2">
                    <input
                      type="checkbox"
                      checked={formData.create_influencer}
                      onChange={e => setFormData({ ...formData, create_influencer: e.target.checked, influencer_id: e.target.checked ? '' : formData.influencer_id })}
                      className="w-4 h-4 rounded border-space-700 bg-space-800 text-blue-400 focus:ring-blue-400"
                    />
                    <span className="text-xs text-gray-400">Créer un nouveau compte utilisateur pour cet influenceur</span>
                  </label>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Part influenceur (%)</label>
                    <select
                      value={formData.influencer_reward_type}
                      onChange={e => setFormData({ ...formData, influencer_reward_type: e.target.value })}
                      className="w-full px-3 py-2 bg-space-800 border border-space-600 rounded-lg text-white"
                    >
                      <option value="none">Aucune part</option>
                      <option value="percentage">Pourcentage vente</option>
                      <option value="fixed">Montant fixe / vente</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Valeur part</label>
                    <input
                      type="number"
                      step="0.01"
                      disabled={formData.influencer_reward_type === 'none'}
                      value={formData.influencer_reward_value}
                      onChange={e => setFormData({ ...formData, influencer_reward_value: e.target.value })}
                      className="w-full px-3 py-2 bg-space-800 border border-space-600 rounded-lg text-white disabled:opacity-30"
                      placeholder="0"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-4 pt-4 border-t border-space-700">
                <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest pb-1">Validité & Limites</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Limite d'utilisations</label>
                    <input
                      type="number"
                      min="1"
                      value={formData.max_uses}
                      onChange={e => setFormData({ ...formData, max_uses: e.target.value })}
                      className="w-full px-3 py-2 bg-space-800 border border-space-600 rounded-lg text-white placeholder-gray-500"
                      placeholder="Illimité"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Date d'expiration</label>
                    <DatePicker
                      selected={formData.expires_at ? new Date(formData.expires_at) : null}
                      onChange={date => setFormData({ ...formData, expires_at: date ? date.toISOString() : '' })}
                      showTimeSelect
                      timeFormat="HH:mm"
                      timeIntervals={15}
                      timeCaption="Heure"
                      dateFormat="dd/MM/yyyy HH:mm"
                      locale="fr"
                      placeholderText="Aucune"
                      className="w-full px-3 py-2 bg-space-800 border border-space-600 rounded-lg text-white outline-none"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="coupon-active"
                    checked={formData.is_active}
                    onChange={e => setFormData({ ...formData, is_active: e.target.checked })}
                    className="w-5 h-5 rounded border-space-600 bg-space-800 text-gold-400 focus:ring-gold-400"
                  />
                  <label htmlFor="coupon-active" className="text-sm font-medium text-gray-300 cursor-pointer">Activer ce coupon immédiatement</label>
                </div>
              </div>
            </div>

            {/* Footer - Fixed */}
            <div className="p-4 sm:p-5 border-t border-space-700 bg-space-950 flex justify-end gap-3 flex-shrink-0">
              <button type="button" onClick={() => setShowModal(false)} className="btn-secondary min-h-[44px] flex-1 sm:flex-none">
                Annuler
              </button>
              <button type="submit" disabled={saving} className="btn-primary inline-flex items-center justify-center gap-2 min-h-[44px] flex-1 sm:flex-none">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Enregistrer
              </button>
            </div>
          </form>
        </div>,
        document.body
      )}
    </div>
  )
}
