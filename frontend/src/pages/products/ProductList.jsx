import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Package, Edit, Trash2, History, Tag, Image, Maximize2, ShoppingCart, CheckCircle2, Circle, MoreVertical, MousePointer2, Check, ChevronRight } from 'lucide-react'
import { useTheme } from '../../contexts/ThemeContext'
import { getProductImageUrl } from './utils'

export default function ProductList({
  products,
  formatPrice,
  onEdit,
  onDelete,
  onHistory,
  onView,
  selectedIds,
  onToggleSelect
}) {
  const { t } = useTranslation()
  const hasSelection = selectedIds.size > 0
  const { theme } = useTheme()
  const isDark = theme === 'dark'

  return (
    <div className="grid gap-4 min-w-0">
      {products.map((product, index) => {
        const isSelected = selectedIds.has(product.id)
        
        return (
          <div
            key={product.id}
            onClick={() => onView(product)}
            className={`card p-3 sm:p-5 transition-all cursor-pointer group animate-fadeIn border-l-4 ${
              isSelected 
                ? 'border-l-blue-500 bg-blue-500/5 border-blue-500/30' 
                : 'hover:border-blue-500/50 hover:bg-space-800/80'
            }`}
            style={{ animationDelay: `${index * 50}ms` }}
          >
            <div className="flex items-center gap-3 sm:gap-4">
              {/* Selection Checkbox */}
              <div 
                onClick={(e) => { e.stopPropagation(); onToggleSelect(product.id); }}
                className="flex-shrink-0"
              >
                <div className={`w-6 h-6 rounded-lg border transition-all flex items-center justify-center cursor-pointer ${
                  isSelected
                    ? 'bg-blue-500 border-blue-500 text-white'
                    : isDark ? 'border-space-600 bg-space-900/50 hover:border-space-500' : 'border-gray-200 bg-gray-50 hover:border-gray-300'
                }`}>
                  {isSelected && <Check className="w-4 h-4" />}
                </div>
              </div>

              {/* Product Info */}
              <div className="relative flex-shrink-0">
                <div className="w-10 h-10 sm:w-14 sm:h-14 bg-space-800 rounded-xl flex items-center justify-center overflow-hidden ring-1 ring-white/5">
                  {product.image_url ? (
                    <img src={getProductImageUrl(product.image_url)} alt={product.name} className="w-full h-full object-cover" />
                  ) : (
                    <Package className="w-6 h-6 text-gray-700" aria-hidden />
                  )}
                </div>
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-semibold text-gray-100 truncate group-hover:text-gold-400 transition-colors">
                    {product.name}
                  </h3>
                  <div className="flex items-center gap-2">
                    <span className="text-sm sm:text-base font-bold text-gold-400 whitespace-nowrap">
                      {formatPrice(product.price)}
                    </span>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-[10px] sm:text-xs text-gray-400">
                  {product.category && (
                    <span className="text-blue-400/80 font-black uppercase tracking-widest">
                      {product.category}
                    </span>
                  )}
                  {product.sku && (
                    <span className="font-mono text-gray-600 truncate max-w-[100px]">
                      {product.sku}
                    </span>
                  )}
                  <span className={`inline-flex items-center px-1.5 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-widest ${
                    product.stock === 0
                      ? 'bg-red-500/10 text-red-400'
                      : product.stock <= 10
                        ? 'bg-amber-500/10 text-amber-400'
                        : 'bg-emerald-500/10 text-emerald-400'
                  }`}>
                    {product.stock} {t('products.units')}
                  </span>
                </div>
              </div>

              {/* Desktop Actions */}
              <div className="hidden sm:flex items-center gap-1 flex-shrink-0">
                <button
                  onClick={(e) => { e.stopPropagation(); onHistory(product.id) }}
                  className="p-2 text-gray-500 hover:text-amber-400 hover:bg-amber-500/10 rounded-xl transition-all"
                >
                  <History className="w-4 h-4" />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); onEdit(product) }}
                  className="p-2 text-gray-500 hover:text-blue-400 hover:bg-blue-400/10 rounded-xl transition-all"
                >
                  <Edit className="w-4 h-4" />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); onDelete(product.id) }}
                  className="p-2 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-all"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-600 sm:hidden" />
            </div>
          </div>
        )
      })}
    </div>
  )
}
