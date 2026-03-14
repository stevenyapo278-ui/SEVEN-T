import { Edit2, Trash2, Clock, Image as ImageIcon, CheckCircle2, XCircle } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useTheme } from '../../contexts/ThemeContext'

export default function ServiceList({ services, formatPrice, onEdit, onDelete, onView }) {
  const { t } = useTranslation()
  const { theme } = useTheme()
  const isDark = theme === 'dark'

  if (services.length === 0) return null

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {services.map((service) => (
        <div
          key={service.id}
          className={`group relative rounded-3xl border transition-all duration-300 hover:shadow-xl hover:-translate-y-1 overflow-hidden ${
            isDark 
              ? 'bg-space-900/50 border-space-700/50 hover:border-gold-400/30' 
              : 'bg-white border-gray-200 hover:border-blue-500/30'
          }`}
        >
          {/* Image/Icon Header */}
          <div className="aspect-video relative overflow-hidden bg-space-800">
            {service.image_url ? (
              <img
                src={service.image_url}
                alt={service.name}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <ImageIcon className="w-12 h-12 text-space-600" />
              </div>
            )}
            
            {/* Badges Overlay */}
            <div className="absolute top-4 left-4 flex gap-2">
              <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider backdrop-blur-md ${
                service.is_active 
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/20' 
                  : 'bg-red-500/20 text-red-400 border border-red-500/20'
              }`}>
                {service.is_active ? t('common.active') : t('common.inactive')}
              </span>
              {service.category && (
                <span className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-blue-500/20 text-blue-400 border border-blue-500/20 backdrop-blur-md">
                  {service.category}
                </span>
              )}
            </div>
            
            {/* Price Tag */}
            <div className="absolute bottom-4 right-4">
              <div className="px-4 py-2 rounded-2xl bg-space-950/80 backdrop-blur-xl border border-white/10 shadow-lg">
                <span className="text-lg font-bold text-white font-mono">
                  {formatPrice(service.price)}
                </span>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="p-6">
            <h3 className={`text-xl font-display font-bold mb-2 line-clamp-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              {service.name}
            </h3>
            
            <div className="flex items-center gap-2 mb-4 text-gray-500 text-sm">
              <Clock className="w-4 h-4" />
              <span>{service.duration} {t('common.minutes')}</span>
            </div>

            {service.description && (
              <p className={`text-sm mb-6 line-clamp-2 h-10 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                {service.description}
              </p>
            )}

            {/* Actions */}
            <div className="flex items-center gap-2 pt-4 border-t border-space-800/50">
              <button
                onClick={() => onView(service)}
                className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${
                  isDark ? 'bg-space-800 text-white hover:bg-space-700' : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
                }`}
              >
                {t('common.view')}
              </button>
              <button
                onClick={() => onEdit(service)}
                className={`p-2.5 rounded-xl transition-all duration-200 ${
                  isDark ? 'bg-space-800 text-blue-400 hover:bg-blue-400/20' : 'bg-blue-50 text-blue-600 hover:bg-blue-100'
                }`}
                title={t('common.edit')}
              >
                <Edit2 className="w-5 h-5" />
              </button>
              <button
                onClick={() => onDelete(service.id)}
                className={`p-2.5 rounded-xl transition-all duration-200 ${
                  isDark ? 'bg-space-800 text-red-400 hover:bg-red-400/20' : 'bg-red-50 text-red-600 hover:bg-red-100'
                }`}
                title={t('common.delete')}
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
