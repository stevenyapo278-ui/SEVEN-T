import { useTranslation } from 'react-i18next'
import { Package, Check, AlertTriangle, Archive, DollarSign } from 'lucide-react'
import { useTheme } from '../../contexts/ThemeContext'

export default function ProductStats({ stats, formatPrice }) {
  const { t } = useTranslation()
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const items = [
    { value: stats.total, label: t('products.statsTotal'), icon: Package, color: 'blue' },
    { value: stats.inStock, label: t('products.statsInStock'), icon: Check, color: 'green' },
    { value: stats.lowStock, label: t('products.statsLowStock'), icon: AlertTriangle, color: 'amber' },
    { value: stats.outOfStock, label: t('products.statsOutOfStock'), icon: Archive, color: 'red' },
    { value: formatPrice(stats.totalValue), label: t('products.statsValue'), icon: DollarSign, color: 'gold' },
    { value: formatPrice(stats.totalMargin), label: t('products.statsMargin'), icon: DollarSign, color: 'emerald' }
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
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mt-8 min-w-0">
      {items.map(({ value, label, icon: Icon, color }) => (
        <div key={label} className={`rounded-xl p-4 border transition-all duration-300 ${
          isDark ? 'bg-space-800/50 border-space-700/50 hover:bg-space-800' : 'bg-white border-gray-100 hover:shadow-md shadow-sm'
        }`}>
          <div className="flex items-center gap-3 min-w-0">
            <div className={`p-2 rounded-xl flex-shrink-0 ${colorClasses[color]}`}>
              <Icon className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className={`text-xl font-bold truncate ${isDark ? 'text-white' : 'text-gray-900'}`} title={String(value)}>{value}</p>
              <p className={`text-xs truncate ${isDark ? 'text-gray-500' : 'text-gray-600'}`}>{label}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
