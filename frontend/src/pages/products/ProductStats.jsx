import { useState } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { Package, Check, AlertTriangle, Archive, DollarSign, XCircle } from 'lucide-react'
import { useTheme } from '../../contexts/ThemeContext'
import { useLockBodyScroll } from '../../hooks/useLockBodyScroll'

export default function ProductStats({ stats, formatPrice }) {
  const { t } = useTranslation()
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const [focusStat, setFocusStat] = useState(null)

  useLockBodyScroll(!!focusStat)

  const items = [
    { id: 'total', value: stats.total, label: t('products.statsTotal'), icon: Package, color: 'blue' },
    { id: 'in_stock', value: stats.inStock, label: t('products.statsInStock'), icon: Check, color: 'green' },
    { id: 'low_stock', value: stats.lowStock, label: t('products.statsLowStock'), icon: AlertTriangle, color: 'amber' },
    { id: 'out_stock', value: stats.outOfStock, label: t('products.statsOutOfStock'), icon: Archive, color: 'red' },
    { id: 'value', value: formatPrice(stats.totalValue), label: t('products.statsValue'), icon: DollarSign, color: 'gold' },
    { id: 'margin', value: formatPrice(stats.totalMargin), label: t('products.statsMargin'), icon: DollarSign, color: 'emerald' }
  ]

  const colorClasses = {
    blue: 'bg-blue-500/10 text-blue-400',
    green: 'bg-green-500/10 text-green-400',
    amber: 'bg-amber-500/10 text-amber-400',
    red: 'bg-red-500/10 text-red-400',
    gold: 'bg-gold-400/10 text-gold-400',
    emerald: 'bg-emerald-500/10 text-emerald-400'
  }

  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mt-8 min-w-0">
        {items.map((item) => {
          const { id, value, label, icon: Icon, color } = item
          return (
            <div 
              key={id} 
              onClick={() => setFocusStat(item)}
              className={`rounded-xl p-4 border transition-all duration-300 cursor-pointer ${
                isDark ? 'bg-space-800/50 border-space-700/50 hover:bg-space-800 hover:scale-[1.02]' : 'bg-white border-gray-100 hover:shadow-md shadow-sm hover:scale-[1.02]'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className={`p-2 rounded-xl flex-shrink-0 ${colorClasses[color]}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className={`text-lg sm:text-xl font-bold break-words leading-tight ${isDark ? 'text-white' : 'text-gray-900'}`} title={String(value)}>{value}</p>
                  <p className={`text-[10px] sm:text-xs truncate font-medium ${isDark ? 'text-gray-500' : 'text-gray-400'} mt-0.5`}>{label}</p>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {focusStat && createPortal(
        <div 
          className="fixed inset-0 z-[70] flex items-center justify-center p-4 animate-fadeIn"
          onClick={() => setFocusStat(null)}
        >
          <div className="absolute inset-0 bg-space-950/80 backdrop-blur-sm" />
          <div 
            className="relative z-10 w-full max-w-sm bg-space-900/90 border border-white/10 backdrop-blur-xl rounded-[2rem] shadow-2xl p-8 animate-zoomIn"
            onClick={(e) => e.stopPropagation()}
          >
            <button 
              onClick={() => setFocusStat(null)}
              className="absolute top-6 right-6 p-2 text-gray-500 hover:text-white"
            >
              <XCircle className="w-6 h-6" />
            </button>
            <div className="flex flex-col items-center text-center">
              <div className={`w-20 h-20 rounded-3xl flex items-center justify-center mb-6 shadow-lg ${colorClasses[focusStat.color]}`}>
                {(() => {
                  const Icon = focusStat.icon;
                  return <Icon className="w-10 h-10" />
                })()}
              </div>
              <p className="text-gray-400 text-sm uppercase tracking-widest font-bold mb-2">{focusStat.label}</p>
              <h3 className={`text-3xl sm:text-4xl font-display font-black break-words max-w-full ${isDark ? 'text-white' : 'text-gray-900'}`}>{focusStat.value}</h3>
              <button onClick={() => setFocusStat(null)} className="btn-secondary w-full mt-8">Fermer</button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  )
}
