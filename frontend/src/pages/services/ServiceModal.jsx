import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { XCircle, Loader2, Image as ImageIcon, Check, Clock, Tag, CreditCard, Layers } from 'lucide-react'
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

  return createPortal(
    <div 
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-sm"
      onClick={onClose}
      style={{ paddingLeft: 'env(safe-area-inset-left)', paddingRight: 'env(safe-area-inset-right)' }}
    >
      <div 
        className="relative z-10 w-full max-w-2xl bg-[#0B0F1A] border border-white/10 rounded-t-[2.5rem] sm:rounded-3xl shadow-[0_32px_128px_-16px_rgba(0,0,0,0.8)] flex flex-col max-h-[92dvh] sm:max-h-[85vh] overflow-hidden animate-fadeIn" 
        role="dialog" 
        aria-modal="true"
        onClick={e => e.stopPropagation()}
      >
        {/* Mobile Handle */}
        <div className="flex-shrink-0 w-full flex justify-center pt-2 pb-1 sm:hidden">
          <div className="w-12 h-1.5 rounded-full bg-white/10" />
        </div>

        <div className="flex-shrink-0 p-6 sm:p-8" style={{ paddingTop: 'max(1.5rem, env(safe-area-inset-top))' }}>
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <h2 className="text-2xl font-display font-bold text-gray-100 truncate">
                {service ? t('services.editTitle') : t('services.addTitle')}
              </h2>
              <p className="text-sm text-gray-500 mt-1 truncate">Créez ou modifiez vos prestations</p>
            </div>
            <button 
              type="button"
              onClick={onClose}
              className="p-2 -mr-2 text-gray-500 hover:text-white transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl hover:bg-white/5"
            >
              <XCircle className="w-6 h-6" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0 overflow-hidden">
          <div className="flex-1 overflow-y-auto p-6 sm:p-8 pt-0 space-y-8 custom-scrollbar overscroll-contain">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Left Column */}
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">{t('common.name')} *</label>
                  <div className="relative">
                    <Tag className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      className="input-dark w-full pl-12 py-4 pr-5 text-base rounded-2xl"
                      placeholder="Ex: Consultation Stratégique"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">{t('common.category')}</label>
                  <div className="relative">
                    <Layers className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
                    <input
                      type="text"
                      value={formData.category}
                      onChange={e => setFormData(prev => ({ ...prev, category: e.target.value }))}
                      className="input-dark w-full pl-12 py-4 pr-5 text-base rounded-2xl"
                      placeholder="ex: Consulting"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">{t('common.price')}</label>
                    <div className="relative">
                      <CreditCard className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
                      <input
                        type="number"
                        value={formData.price}
                        onChange={e => setFormData(prev => ({ ...prev, price: e.target.value }))}
                        className="input-dark w-full pl-12 py-4 pr-5 text-base rounded-2xl font-mono"
                        placeholder="0"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">{t('services.duration')} (min)</label>
                    <div className="relative">
                      <Clock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
                      <input
                        type="number"
                        value={formData.duration}
                        onChange={e => setFormData(prev => ({ ...prev, duration: e.target.value }))}
                        className="input-dark w-full pl-12 py-4 pr-5 text-base rounded-2xl font-mono"
                        placeholder="30"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column */}
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">{t('common.image_url')}</label>
                  <div className="relative">
                    <ImageIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
                    <input
                      type="url"
                      value={formData.image_url}
                      onChange={e => setFormData(prev => ({ ...prev, image_url: e.target.value }))}
                      className="input-dark w-full pl-12 py-4 pr-5 text-base rounded-2xl"
                      placeholder="https://..."
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">{t('common.description')}</label>
                  <textarea
                    rows={4}
                    value={formData.description}
                    onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    className="input-dark w-full py-4 px-5 text-base rounded-2xl resize-none min-h-[140px]"
                    placeholder="Décrivez votre service..."
                  />
                </div>

                <div className="flex items-center gap-3 p-4 bg-white/[0.02] border border-white/5 rounded-2xl">
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, is_active: prev.is_active === 1 ? 0 : 1 }))}
                    className={`w-12 h-6 rounded-full transition-all duration-300 relative ${
                      formData.is_active === 1 ? 'bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.3)]' : 'bg-white/10'
                    }`}
                  >
                    <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all duration-300 shadow-md ${
                      formData.is_active === 1 ? 'left-7' : 'left-1'
                    }`} />
                  </button>
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{t('common.active')}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex-shrink-0 p-6 sm:p-8 pt-4 border-t border-white/5 bg-black/20 flex flex-col-reverse sm:flex-row gap-3" style={{ paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))' }}>
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 py-4 px-6 rounded-2xl font-bold text-gray-400 hover:text-white hover:bg-white/5 transition-all min-h-[48px]"
            >
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-4 px-6 rounded-2xl font-syne font-black italic bg-white text-black hover:bg-gold-400 transition-all hover:scale-[1.02] active:scale-[0.98] shadow-xl min-h-[48px] inline-flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Check className="w-5 h-5" />}
              {service ? t('common.update') : t('common.create')}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  )
}
