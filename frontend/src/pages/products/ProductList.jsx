import { useTranslation } from 'react-i18next'
import { Package, Edit, Trash2, History, Tag, Image } from 'lucide-react'
import { getProductImageUrl } from './utils'

export default function ProductList({
  products,
  formatPrice,
  onEdit,
  onDelete,
  onHistory,
  onView
}) {
  const { t } = useTranslation()
  return (
    <div className="grid gap-3 sm:gap-4 min-w-0">
      <div className="hidden md:grid grid-cols-12 gap-4 px-4 sm:px-6 py-3 text-sm font-medium text-gray-500">
        <div className="col-span-4">{t('products.tableProduct')}</div>
        <div className="col-span-2">{t('products.tableSku')}</div>
        <div className="col-span-2">{t('products.tablePrice')}</div>
        <div className="col-span-2">{t('products.tableStock')}</div>
        <div className="col-span-2 text-right">{t('products.tableActions')}</div>
      </div>
      {products.map((product, index) => (
        <div
          key={product.id}
          onClick={() => onView(product)}
          className="card p-4 sm:p-5 md:p-6 hover:border-blue-500/50 hover:bg-space-800/80 cursor-pointer transition-all min-w-0 group animate-fadeIn"
          style={{ animationDelay: `${index * 50}ms` }}
        >
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 md:gap-4 md:items-center">
            <div className="md:col-span-4 flex items-center gap-3 md:gap-4 min-w-0">
              <div className="w-14 h-14 bg-space-800 rounded-xl flex items-center justify-center flex-shrink-0 overflow-hidden">
                {product.image_url ? (
                  <img src={getProductImageUrl(product.image_url)} alt={product.name} className="w-full h-full object-cover" />
                ) : (
                  <Package className="w-6 h-6 text-gray-600" aria-hidden />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-medium text-gray-100 truncate">{product.name}</h3>
                <div className="flex flex-wrap items-center gap-2 mt-1">
                  {product.category && (
                    <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                      <Tag className="w-3 h-3 flex-shrink-0" aria-hidden />
                      <span className="truncate">{product.category}</span>
                    </span>
                  )}
                  {(!product.description?.trim() || !product.image_url?.trim()) && (
                    <span className="inline-flex items-center gap-1 text-xs text-amber-500/90" title={t('products.incompleteTip')}>
                      <Image className="w-3 h-3 flex-shrink-0" aria-hidden />
                      {t('products.incompleteTip')}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="md:col-span-6 flex flex-wrap items-center justify-between gap-y-4 md:contents">
              <div className="hidden md:flex flex-col gap-0.5 min-w-0 md:col-span-2">
                <span className="text-xs text-gray-500 uppercase tracking-wide">{t('products.tableSku')}</span>
                <span className="text-sm font-mono text-gray-400 truncate">{product.sku || '–'}</span>
              </div>
              <div className="md:col-span-2 flex flex-col gap-0.5 min-w-0 overflow-hidden">
                <span className="md:hidden text-[10px] text-gray-500 uppercase font-bold tracking-wider mb-1">{t('products.tablePrice')}</span>
                <span className="text-base sm:text-lg font-bold text-gold-400 truncate" title={formatPrice(product.price)}>{formatPrice(product.price)}</span>
                {typeof product.cost_price === 'number' && product.cost_price > 0 && (
                  <span className="hidden md:block text-xs text-gray-400 mt-0.5 truncate" title={formatPrice((product.price || 0) - (product.cost_price || 0))}>
                    {t('products.marginLabel')} {formatPrice((product.price || 0) - (product.cost_price || 0))}
                  </span>
                )}
              </div>
              <div className="md:col-span-2 flex flex-col gap-0.5 min-w-0 items-end md:items-start ml-auto md:ml-0">
                <span className="md:hidden text-[10px] text-gray-500 uppercase font-bold tracking-wider mb-1">{t('products.tableStock')}</span>
                <span className={`inline-flex items-center px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full text-[10px] sm:text-sm font-bold uppercase tracking-wider ${
                  product.stock === 0
                    ? 'bg-red-500/20 text-red-400'
                    : product.stock <= 10
                      ? 'bg-amber-500/20 text-amber-400'
                      : 'bg-green-500/20 text-green-400'
                }`}>
                  {product.stock === 0 ? t('products.filterOutOfStock') : `${product.stock} ${t('products.units')}`}
                </span>
              </div>
            </div>
            <div className="md:col-span-2 flex items-center justify-end gap-1 pt-2 md:pt-0 border-t border-space-700 md:border-t-0">
              <button
                onClick={(e) => { e.stopPropagation(); onHistory(product.id) }}
                className="p-2.5 text-gray-400 hover:text-amber-400 hover:bg-space-700 rounded-lg transition-colors touch-target"
                title={t('products.actionHistory')}
                aria-label={t('products.actionHistory')}
              >
                <History className="w-5 h-5" />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); onEdit(product) }}
                className="p-2.5 text-gray-400 hover:text-blue-400 hover:bg-space-700 rounded-lg transition-colors touch-target"
                title={t('products.actionEdit')}
                aria-label={t('products.actionEdit')}
              >
                <Edit className="w-5 h-5" />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); onDelete(product.id) }}
                className="p-2.5 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors touch-target"
                title={t('products.actionDelete')}
                aria-label={t('products.actionDelete')}
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
