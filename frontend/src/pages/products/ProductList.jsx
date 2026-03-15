import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Package, Edit, Trash2, History, Tag, Image, Maximize2, ShoppingCart, CheckCircle2, Circle, MoreVertical, MousePointer2 } from 'lucide-react'
import { getProductImageUrl } from './utils'

export default function ProductList({
  products,
  formatPrice,
  onEdit,
  onDelete,
  onHistory,
  onView,
  selectedIds = [],
  onToggleSelect,
  onToggleSelectAll
}) {
  const { t } = useTranslation()
  const [showBulkOptions, setShowBulkOptions] = useState(false)
  const allSelected = products.length > 0 && selectedIds.length === products.length
  const hasSelection = selectedIds.length > 0

  return (
    <div className="grid gap-3 sm:gap-4 min-w-0">
      {/* Mobile Selection Header - Refactored */}
      <div className="md:hidden flex items-center justify-between px-1 mb-1">
        <button
          onClick={() => setShowBulkOptions(!showBulkOptions)}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
            showBulkOptions || hasSelection
              ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/20'
              : 'bg-white/5 text-gray-400'
          }`}
        >
          <MousePointer2 className="w-3 h-3" />
          {hasSelection ? `${selectedIds.length} sélectionné(s)` : 'Sélectionner'}
        </button>

        {showBulkOptions && (
          <div className="flex items-center gap-2 animate-fadeIn">
            <button
              onClick={(e) => { e.stopPropagation(); onToggleSelectAll() }}
              className="text-[10px] font-black uppercase tracking-widest text-blue-400 py-1.5 px-3 bg-blue-500/10 rounded-xl"
            >
              {allSelected ? 'Tout désélectionner' : 'Tout sélectionner'}
            </button>
          </div>
        )}
      </div>

      <div className="hidden md:grid grid-cols-12 gap-4 px-4 sm:px-6 py-3 text-sm font-medium text-gray-500 items-center">
        <div className="col-span-1 flex items-center">
          <button
            onClick={onToggleSelectAll}
            className={`p-1 rounded-lg transition-colors ${allSelected ? 'text-blue-400' : 'text-gray-600 hover:text-gray-400'}`}
          >
            {allSelected ? <CheckCircle2 className="w-5 h-5" /> : <Circle className="w-5 h-5" />}
          </button>
        </div>
        <div className="col-span-4">{t('products.tableProduct')}</div>
        <div className="col-span-2">{t('products.tableSku')}</div>
        <div className="col-span-2">{t('products.tablePrice')}</div>
        <div className="col-span-1">{t('products.tableStock')}</div>
        <div className="col-span-2 text-right">{t('products.tableActions')}</div>
      </div>

      {products.map((product, index) => {
        const isSelected = selectedIds.includes(product.id)
        
        return (
          <div
            key={product.id}
            onClick={() => (hasSelection || showBulkOptions) ? onToggleSelect(product.id) : onView(product)}
            className={`card p-4 sm:p-5 md:p-6 cursor-pointer transition-all min-w-0 group animate-fadeIn border ${
              isSelected 
                ? 'border-blue-500 bg-blue-500/5' 
                : 'hover:border-white/20 hover:bg-white/[0.02]'
            }`}
            style={{ animationDelay: `${index * 50}ms` }}
          >
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3 md:gap-4 md:items-center">
              {/* Desktop Checkbox */}
              <div className="hidden md:flex md:col-span-1 items-center">
                <button
                  onClick={(e) => { e.stopPropagation(); onToggleSelect(product.id) }}
                  className={`p-2 rounded-xl transition-all ${
                    isSelected ? 'text-blue-400 scale-110' : 'text-gray-700 hover:text-gray-500 opacity-0 group-hover:opacity-100'
                  }`}
                >
                  {isSelected ? <CheckCircle2 className="w-6 h-6 shadow-[0_0_15px_rgba(59,130,246,0.2)]" /> : <Circle className="w-6 h-6" />}
                </button>
              </div>

              {/* Product Info */}
              <div className="md:col-span-4 flex items-center gap-3 md:gap-4 min-w-0">
                <div className="relative flex-shrink-0">
                  <div className="w-12 h-12 md:w-14 md:h-14 bg-space-800 rounded-xl flex items-center justify-center overflow-hidden ring-1 ring-white/5">
                    {product.image_url ? (
                      <img src={getProductImageUrl(product.image_url)} alt={product.name} className="w-full h-full object-cover" />
                    ) : (
                      <Package className="w-6 h-6 text-gray-700" aria-hidden />
                    )}
                  </div>
                  {(isSelected || (showBulkOptions && !isSelected)) && (
                    <div className="absolute -top-1 -left-1 md:hidden bg-blue-500 rounded-full p-0.5 text-white ring-2 ring-[#0B0F1A]">
                      {isSelected ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Circle className="w-3.5 h-3.5 opacity-50" />}
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-bold text-gray-100 truncate text-sm sm:text-base">{product.name}</h3>
                  <div className="flex flex-wrap items-center gap-2 mt-0.5">
                    {product.category && (
                      <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-blue-400/80">
                        {product.category}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Data Columns */}
              <div className="md:col-span-7 flex flex-wrap items-center justify-between gap-x-2 gap-y-3 md:contents">
                <div className="hidden md:flex flex-col gap-0.5 min-w-0 md:col-span-2">
                  <span className="text-[10px] text-gray-600 uppercase font-black tracking-widest">{t('products.tableSku')}</span>
                  <span className="text-xs font-mono text-gray-400 truncate">{product.sku || '–'}</span>
                </div>
                
                <div className="flex flex-col min-w-0 md:col-span-2 order-1 md:order-none">
                  <span className="md:hidden text-[9px] text-gray-600 uppercase font-black tracking-wider mb-0.5">Prix</span>
                  <span className="text-sm sm:text-base font-bold text-gold-400 whitespace-nowrap">
                    {formatPrice(product.price)}
                  </span>
                </div>

                <div className="flex flex-col gap-0.5 min-w-0 items-end md:items-start order-2 md:order-none ml-auto md:ml-0 md:col-span-1">
                  <span className="md:hidden text-[9px] text-gray-600 uppercase font-black tracking-wider mb-0.5">Stock</span>
                  <span className={`inline-flex items-center px-1.5 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-widest ${
                    product.stock === 0
                      ? 'bg-red-500/10 text-red-400'
                      : product.stock <= 10
                        ? 'bg-amber-500/10 text-amber-400'
                        : 'bg-emerald-500/10 text-emerald-400'
                  }`}>
                    {product.stock} {t('products.units')}
                  </span>
                </div>

                {/* Actions */}
                <div className="w-full md:w-auto md:col-span-2 flex items-center justify-end gap-1 pt-2 md:pt-0 border-t border-white/5 md:border-t-0 order-3 md:order-none">
                  <button
                    onClick={(e) => { e.stopPropagation(); onHistory(product.id) }}
                    className="p-2 text-gray-500 hover:text-amber-400 hover:bg-amber-500/10 rounded-xl transition-all"
                  >
                    <History className="w-4 h-4 sm:w-5 h-5" />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); onEdit(product) }}
                    className="p-2 text-gray-500 hover:text-blue-400 hover:bg-blue-400/10 rounded-xl transition-all"
                  >
                    <Edit className="w-4 h-4 sm:w-5 h-5" />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); onDelete(product.id) }}
                    className="p-2 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-all"
                  >
                    <Trash2 className="w-4 h-4 sm:w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
