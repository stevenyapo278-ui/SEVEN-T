import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { X, Loader2, History, Package, TrendingUp, TrendingDown, Edit3, PlusCircle, XCircle } from 'lucide-react'

const ACTION_KEYS = {
  created: 'historyActionCreated',
  updated: 'historyActionUpdated',
  stock_add: 'historyActionStockAdd',
  stock_remove: 'historyActionStockRemove'
}

const FIELD_KEYS = {
  name: 'historyFieldName',
  sku: 'historyFieldSku',
  price: 'historyFieldPrice',
  cost_price: 'historyFieldCostPrice',
  stock: 'historyFieldStock',
  category: 'historyFieldCategory'
}

export default function HistoryModal({ history, loading, productId, productName, formatPrice, onClose }) {
  const { t } = useTranslation()

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = 'unset' }
  }, [])

  const formatDate = (d) => {
    if (!d) return '-'
    const date = new Date(d)
    return {
      full: date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
      relative: date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })
    }
  }

  const renderChange = (entry) => {
    const parts = []
    if (entry.quantity_change != null && entry.quantity_change !== 0) {
      const sign = entry.quantity_change > 0 ? '+' : ''
      parts.push(
        <div key="stock-qty" className="flex items-center gap-2 text-amber-400">
          <div className={`w-1.5 h-1.5 rounded-full ${entry.quantity_change > 0 ? 'bg-emerald-400' : 'bg-red-400'}`} />
          <span>{t('products.historyFieldStock')} {entry.stock_before} → {entry.stock_after} ({sign}{entry.quantity_change})</span>
        </div>
      )
    }
    if (entry.details && typeof entry.details === 'object') {
      Object.entries(entry.details).forEach(([field, [oldVal, newVal]], index) => {
        const label = t(`products.${FIELD_KEYS[field] || field}`)
        const oldStr = (field === 'price' || field === 'cost_price') ? formatPrice(oldVal) : String(oldVal ?? '-')
        const newStr = (field === 'price' || field === 'cost_price') ? formatPrice(newVal) : String(newVal ?? '-')
        parts.push(
          <div key={`detail-${field}-${index}`} className="flex items-center gap-2 text-gray-400">
            <div className="w-1.5 h-1.5 rounded-full bg-blue-400" />
            <span>{label}: {oldStr} → <span className="text-white">{newStr}</span></span>
          </div>
        )
      })
    }
    if (parts.length === 0 && entry.notes) {
      parts.push(
        <div key="notes" className="flex items-center gap-2 text-gray-400 italic">
          <div className="w-1.5 h-1.5 rounded-full bg-gray-600" />
          <span>{entry.notes}</span>
        </div>
      )
    }
    return parts.length ? parts : null
  }

  const title = productId ? t('products.historyTitleProduct', { name: productName || t('products.tableProduct') }) : t('products.historyTitle')

  return createPortal(
    <div 
      className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center p-0 lg:p-4 bg-black/80 backdrop-blur-md animate-fade-in"
      onClick={onClose}
      style={{ paddingLeft: 'env(safe-area-inset-left)', paddingRight: 'env(safe-area-inset-right)' }}
    >
      <div 
        className="relative z-10 w-full max-w-2xl bg-[#0B0F1A] border border-white/10 rounded-t-[2.5rem] sm:rounded-3xl shadow-[0_32px_128px_-16px_rgba(0,0,0,0.8)] flex flex-col max-h-[92dvh] sm:max-h-[85vh] overflow-hidden animate-slideUp sm:animate-zoomIn"
        onClick={e => e.stopPropagation()}
      >
        {/* Mobile Handle */}
        <div className="flex-shrink-0 w-full flex justify-center pt-2 pb-1 sm:hidden">
          <div className="w-12 h-1.5 rounded-full bg-white/10" />
        </div>

        <div className="flex-shrink-0 p-6 sm:p-8" style={{ paddingTop: 'max(1.5rem, env(safe-area-inset-top))' }}>
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <h2 className="text-2xl font-display font-bold text-gray-100 truncate">{title}</h2>
              <p className="text-sm text-gray-500 mt-1 truncate">Suivi complet des modifications et de l'inventaire</p>
            </div>
            <button 
              type="button" 
              onClick={onClose} 
              className="p-2 -mr-2 text-gray-500 hover:text-white transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl hover:bg-white/5"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 sm:p-8 pt-0 custom-scrollbar overscroll-contain">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-6">
              <div className="relative">
                <History className="w-12 h-12 text-gold-400 opacity-20 animate-pulse" />
                <Loader2 className="absolute inset-0 w-12 h-12 text-gold-400 animate-spin" />
              </div>
              <p className="text-gray-400 font-bold uppercase tracking-widest text-[10px]">Chargement des données...</p>
            </div>
          ) : history.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center gap-6">
              <div className="w-24 h-24 rounded-[2rem] bg-white/5 flex items-center justify-center text-gray-700 border border-white/5 border-dashed">
                <XCircle className="w-12 h-12" />
              </div>
              <div className="space-y-2">
                <p className="text-gray-100 font-bold text-xl">{t('products.historyEmpty')}</p>
                <p className="text-sm text-gray-500 max-w-[280px]">Aucune activité n'a été enregistrée pour ce produit pour le moment.</p>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <ul className="space-y-3">
                {history.map((entry) => {
                  const dateInfo = formatDate(entry.created_at)
                  return (
                    <li key={entry.id} className="group p-5 rounded-3xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] transition-all relative overflow-hidden">
                      <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-transparent via-blue-500/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                      
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                            entry.action === 'created' ? 'bg-emerald-500/10 text-emerald-400' :
                            entry.action === 'stock_add' ? 'bg-blue-500/10 text-blue-400' :
                            entry.action === 'stock_remove' ? 'bg-red-500/10 text-red-400' :
                            'bg-purple-500/10 text-purple-400'
                          }`}>
                            {entry.action === 'created' ? <PlusCircle className="w-5 h-5" /> :
                             entry.action === 'stock_add' ? <TrendingUp className="w-5 h-5" /> :
                             entry.action === 'stock_remove' ? <TrendingDown className="w-5 h-5" /> :
                             <Edit3 className="w-5 h-5" />}
                          </div>
                          <div className="min-w-0">
                            <span className="text-[10px] font-black uppercase tracking-widest text-gray-500 block mb-0.5">
                              {ACTION_KEYS[entry.action] ? t(`products.${ACTION_KEYS[entry.action]}`) : entry.action}
                            </span>
                            {!productId && entry.product_name && (
                              <div className="flex items-center gap-1.5 font-bold text-gray-100">
                                <Package className="w-3.5 h-3.5 text-gray-600" />
                                <span className="truncate">{entry.product_name}</span>
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-gray-100 font-mono text-sm group-hover:text-gold-400 transition-colors">{dateInfo.full}</p>
                          <p className="text-[10px] uppercase font-black tracking-widest text-gray-600">il y a quelques instants</p>
                        </div>
                      </div>

                      {renderChange(entry) && (
                        <div className="grid grid-cols-1 gap-2 p-4 bg-black/40 rounded-2xl border border-white/5 text-xs font-mono">
                          {renderChange(entry)}
                        </div>
                      )}
                    </li>
                  )
                })}
              </ul>
            </div>
          )}
        </div>

        <div className="flex-shrink-0 p-6 sm:p-8 pt-4 border-t border-white/5 bg-black/20" style={{ paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))' }}>
          <button 
            type="button" 
            onClick={onClose} 
            className="w-full py-4 px-6 rounded-2xl font-bold text-gray-500 hover:text-white hover:bg-white/5 transition-all"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}
