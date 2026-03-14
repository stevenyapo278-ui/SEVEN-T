import { useState, useEffect } from 'react'
import { X, Loader2, Image as ImageIcon, Check, Clock, Tag, CreditCard } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import api from '../../services/api'
import toast from 'react-hot-toast'
import { useTheme } from '../../contexts/ThemeContext'

export default function ServiceModal({ service, onClose, onSaved, getSymbol }) {
  const { t } = useTranslation()
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: 0,
    duration: 30,
    category: '',
    image_url: '',
    is_active: 1
  })

  useEffect(() => {
    if (service) {
      setFormData({
        name: service.name || '',
        description: service.description || '',
        price: service.price || 0,
        duration: service.duration || 30,
        category: service.category || '',
        image_url: service.image_url || '',
        is_active: service.is_active ?? 1
      })
    }
  }, [service])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      if (service) {
        await api.put(`/services/${service.id}`, formData)
        toast.success(t('messages.serviceUpdated') || 'Service mis à jour')
      } else {
        await api.post('/services', formData)
        toast.success(t('messages.serviceCreated') || 'Service créé')
      }
      onSaved()
    } catch (error) {
      toast.error(error.response?.data?.error || t('messages.errorSavingService'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-space-950/80 backdrop-blur-sm" onClick={onClose} />
      
      <div className={`relative z-10 w-full max-w-2xl overflow-hidden rounded-[2rem] border shadow-2xl animate-zoom-in ${
        isDark ? 'bg-space-900 border-space-700' : 'bg-white border-gray-200'
      }`}>
        <div className="flex items-center justify-between p-6 border-b border-space-800/50">
          <h2 className={`text-xl font-display font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
            {service ? t('services.editTitle') : t('services.addTitle')}
          </h2>
          <button onClick={onClose} className="p-2 text-gray-500 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left Column */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1.5">{t('common.name')}</label>
                <div className="relative">
                  <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-space-800 bg-space-800/50 text-white focus:ring-2 focus:ring-gold-400/50 outline-none transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1.5">{t('common.category')}</label>
                <input
                  type="text"
                  value={formData.category}
                  onChange={e => setFormData(prev => ({ ...prev, category: e.target.value }))}
                  className="w-full px-4 py-2.5 rounded-xl border border-space-800 bg-space-800/50 text-white focus:ring-2 focus:ring-gold-400/50 outline-none transition-all"
                  placeholder="ex: Consultations, Réparations..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1.5">{t('common.price')}</label>
                  <div className="relative">
                    <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <input
                      type="number"
                      value={formData.price}
                      onChange={e => setFormData(prev => ({ ...prev, price: e.target.value }))}
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-space-800 bg-space-800/50 text-white focus:ring-2 focus:ring-gold-400/50 outline-none transition-all font-mono"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1.5">{t('services.duration')} ({t('common.minutes')})</label>
                  <div className="relative">
                    <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <input
                      type="number"
                      value={formData.duration}
                      onChange={e => setFormData(prev => ({ ...prev, duration: e.target.value }))}
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-space-800 bg-space-800/50 text-white focus:ring-2 focus:ring-gold-400/50 outline-none transition-all font-mono"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1.5">{t('common.image_url')}</label>
                <div className="relative">
                  <ImageIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input
                    type="url"
                    value={formData.image_url}
                    onChange={e => setFormData(prev => ({ ...prev, image_url: e.target.value }))}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-space-800 bg-space-800/50 text-white focus:ring-2 focus:ring-gold-400/50 outline-none transition-all"
                    placeholder="https://..."
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1.5">{t('common.description')}</label>
                <textarea
                  rows={4}
                  value={formData.description}
                  onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full px-4 py-2.5 rounded-xl border border-space-800 bg-space-800/50 text-white focus:ring-2 focus:ring-gold-400/50 outline-none transition-all resize-none"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, is_active: prev.is_active === 1 ? 0 : 1 }))}
                  className={`w-12 h-6 rounded-full transition-all duration-200 relative ${
                    formData.is_active === 1 ? 'bg-emerald-500' : 'bg-space-700'
                  }`}
                >
                  <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all duration-200 ${
                    formData.is_active === 1 ? 'left-7' : 'left-1'
                  }`} />
                </button>
                <span className="text-sm font-medium text-gray-300">{t('common.active')}</span>
              </div>
            </div>
          </div>

          <div className="flex gap-3 mt-8">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 px-4 py-3 rounded-2xl bg-space-800 text-white font-semibold hover:bg-space-700 transition-colors disabled:opacity-50"
            >
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-3 rounded-2xl bg-gradient-to-r from-gold-400 to-gold-600 text-space-950 font-bold hover:from-gold-300 hover:to-gold-500 transition-all shadow-lg shadow-gold-500/20 disabled:opacity-50 inline-flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Check className="w-5 h-5" />}
              {service ? t('common.update') : t('common.create')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
