import { useState, useEffect } from 'react'
import { Plus, RefreshCw, Edit, Trash2, Loader2, Save, X, Ticket } from 'lucide-react'
import api from '../../services/api'
import toast from 'react-hot-toast'

export default function CouponsContent() {
  const [coupons, setCoupons] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingCoupon, setEditingCoupon] = useState(null)
  const [formData, setFormData] = useState({
    name: '', code: '', discount_type: 'percentage', discount_value: '', max_uses: '', expires_at: '', is_active: true
  })
  const [saving, setSaving] = useState(false)

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
      is_active: coupon.is_active === 1
    })
    setShowModal(true)
  }

  const handleCreate = () => {
    setEditingCoupon(null)
    setFormData({
      name: '', code: '', discount_type: 'percentage', discount_value: '', max_uses: '', expires_at: '', is_active: true
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
        is_active: formData.is_active
      }
      
      if (editingCoupon) {
        await api.put(`/admin/coupons/${editingCoupon.id}`, payload)
        toast.success('Coupon mis à jour')
      } else {
        await api.post('/admin/coupons', payload)
        toast.success('Coupon créé')
      }
      setShowModal(false)
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
              
              <div className="text-2xl font-bold text-gold-400 mb-4">
                {coupon.discount_type === 'percentage' ? `-${coupon.discount_value}%` : `-${coupon.discount_value.toLocaleString()} FCFA`}
              </div>
              
              <div className="space-y-1 mb-4 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Utilisations</span>
                  <span className="text-gray-300">{coupon.used_count} / {coupon.max_uses || '∞'}</span>
                </div>
                {coupon.expires_at && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Expire le</span>
                    <span className="text-gray-300">{new Date(coupon.expires_at).toLocaleString()}</span>
                  </div>
                )}
              </div>

              <div className="flex gap-2 pt-3 border-t border-space-700">
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

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-space-900 border border-space-700 rounded-2xl w-full max-w-md shadow-2xl animate-fadeIn overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-space-700">
              <h3 className="text-lg font-bold text-gray-100">{editingCoupon ? 'Modifier le coupon' : 'Nouveau coupon'}</h3>
              <button type="button" onClick={() => setShowModal(false)} className="text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Nom du coupon (interne)</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 bg-space-800 border border-space-600 rounded-lg text-white focus:ring-1 focus:ring-gold-400 transition-shadow outline-none"
                  placeholder="Ex: SOLDES ETE 2024"
                />
              </div>

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
                <label className="block text-sm font-medium text-gray-300 mb-1">Nombre d'utilisations max (optionnel)</label>
                <input
                  type="number"
                  min="1"
                  value={formData.max_uses}
                  onChange={e => setFormData({ ...formData, max_uses: e.target.value })}
                  className="w-full px-3 py-2 bg-space-800 border border-space-600 rounded-lg text-white placeholder-gray-500"
                  placeholder="Illimité si vide"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Date d'expiration (optionnel)</label>
                <input
                  type="datetime-local"
                  value={formData.expires_at}
                  onChange={e => setFormData({ ...formData, expires_at: e.target.value })}
                  className="w-full px-3 py-2 bg-space-800 border border-space-600 rounded-lg text-white"
                />
              </div>

              <div className="flex items-center gap-2 mt-2">
                <input
                  type="checkbox"
                  id="coupon-active"
                  checked={formData.is_active}
                  onChange={e => setFormData({ ...formData, is_active: e.target.checked })}
                  className="rounded border-space-600 bg-space-800 text-gold-400 focus:ring-gold-400 focus:ring-offset-space-900"
                />
                <label htmlFor="coupon-active" className="text-sm text-gray-300">Coupon actif</label>
              </div>

              <div className="pt-4 flex justify-end gap-3 border-t border-space-700">
                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary">
                  Annuler
                </button>
                <button type="submit" disabled={saving} className="btn-primary inline-flex items-center gap-2">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Enregistrer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
