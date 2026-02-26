import { useTranslation } from 'react-i18next'
import { Package, Check, AlertTriangle, Archive, DollarSign } from 'lucide-react'

export default function ProductStats({ stats, formatPrice }) {
  const { t } = useTranslation()
  const items = [
    { value: stats.total, label: t('products.statsTotal'), icon: Package, color: 'blue' },
    { value: stats.inStock, label: t('products.statsInStock'), icon: Check, color: 'green' },
    { value: stats.lowStock, label: t('products.statsLowStock'), icon: AlertTriangle, color: 'amber' },
    { value: stats.outOfStock, label: t('products.statsOutOfStock'), icon: Archive, color: 'red' },
    { value: formatPrice(stats.totalValue), label: t('products.statsValue'), icon: DollarSign, color: 'gold' },
    { value: formatPrice(stats.totalMargin), label: t('products.statsMargin'), icon: DollarSign, color: 'emerald' }
  ]

  const colorClasses = {
    blue: 'bg-blue-500/20 text-blue-400',
    green: 'bg-green-500/20 text-green-400',
    amber: 'bg-amber-500/20 text-amber-400',
    red: 'bg-red-500/20 text-red-400',
    gold: 'bg-gold-400/20 text-gold-400',
    emerald: 'bg-emerald-500/20 text-emerald-400'
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4 mt-6 sm:mt-8 min-w-0">
      {items.map(({ value, label, icon: Icon, color }) => (
        <div key={label} className="bg-space-800/50 backdrop-blur-sm rounded-xl sm:rounded-2xl p-3 sm:p-4 border border-space-700 min-w-0">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <div className={`p-1.5 sm:p-2 rounded-lg sm:rounded-xl flex-shrink-0 ${colorClasses[color]}`}>
              <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0 overflow-hidden flex-1">
              <p className="text-sm sm:text-base md:text-lg font-bold text-gray-100 truncate" title={String(value)}>{value}</p>
              <p className="text-xs text-gray-500 truncate">{label}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
