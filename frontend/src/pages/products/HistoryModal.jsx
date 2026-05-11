import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { X, Loader2, History, Package, TrendingUp, TrendingDown, Edit3, PlusCircle, XCircle } from 'lucide-react'
import { useTheme } from '../../contexts/ThemeContext'

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
  const { isDark } = useTheme()

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
        <div key="stock-qty" className={`flex items-start gap-2 ${isDark ? 'text-amber-400' : 'text-amber-600'}`}>
          <div className={`flex-shrink-0 w-1.5 h-1.5 rounded-full mt-1.5 ${entry.quantity_change > 0 ? 'bg-emerald-500' : 'bg-red-500'}`} />
          <span className="break-words">{t('products.historyFieldStock')} {entry.stock_before} → {entry.stock_after} ({sign}{entry.quantity_change})</span>
        </div>
      )
    }
    if (entry.details && typeof entry.details === 'object') {
      Object.entries(entry.details).forEach(([field, [oldVal, newVal]], index) => {
        const label = t(`products.${FIELD_KEYS[field] || field}`)
        const oldStr = (field === 'price' || field === 'cost_price') ? formatPrice(oldVal) : String(oldVal ?? '-')
        const newStr = (field === 'price' || field === 'cost_price') ? formatPrice(newVal) : String(newVal ?? '-')
        parts.push(
          <div key={`detail-${field}-${index}`} className="flex items-start gap-2">
            <div className={`flex-shrink-0 w-1.5 h-1.5 rounded-full mt-1.5 ${isDark ? 'bg-blue-400' : 'bg-blue-500'}`} />
            <span className={`break-words ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
              {label}: {oldStr} → <span className={isDark ? 'text-white' : 'text-gray-900 font-bold'}>{newStr}</span>
            </span>
          </div>
        )
      })
    }
    if (parts.length === 0 && entry.notes) {
      parts.push(
        <div key="notes" className={`flex items-start gap-2 italic ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
          <div className={`flex-shrink-0 w-1.5 h-1.5 rounded-full mt-1.5 ${isDark ? 'bg-gray-600' : 'bg-gray-300'}`} />
          <span className="break-words">{entry.notes}</span>
        </div>
      )
    }
    return parts.length ? parts : null
  }

  const title = productId ? t('products.historyTitleProduct', { name: productName || t('products.tableProduct') }) : t('products.historyTitle')

  return createPortal(
    <div 
      className="fixed inset-0 z-[70] flex items-center justify-center p-4 lg:p-4 bg-black/80 backdrop-blur-md animate-fade-in"
      onClick={onClose}
      style={{ paddingLeft: 'env(safe-area-inset-left)', paddingRight: 'env(safe-area-inset-right)' }}
    >
      <div 
        className={`relative z-10 w-full max-w-2xl border rounded-t-[2.5rem] sm:rounded-3xl shadow-[0_32px_128px_-16px_rgba(0,0,0,0.8)] flex flex-col max-h-[92dvh] sm:max-h-[85vh] overflow-hidden animate-slideUp sm:animate-zoomIn ${
          isDark ? 'bg-[#0B0F1A] border-white/10' : 'bg-white border-gray-200'
        }`}
        onClick={e => e.stopPropagation()}
      >
        {/* Mobile Handle */}
        <div className="flex-shrink-0 w-full flex justify-center pt-2 pb-1 sm:hidden">
          <div className={`w-12 h-1.5 rounded-full ${isDark ? 'bg-white/10' : 'bg-gray-200'}`} />
        </div>

        <div className="flex-shrink-0 p-6 sm:p-8" style={{ paddingTop: 'max(1.5rem, env(safe-area-inset-top))' }}>
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <h2 className={`text-2xl font-display font-bold truncate ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>{title}</h2>
              <p className="text-sm text-gray-500 mt-1 truncate">Suivi complet des modifications et de l'inventaire</p>
            </div>
            <button 
              type="button" 
              onClick={onClose} 
              className={`p-2 -mr-2 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl ${
                isDark ? 'text-gray-500 hover:text-white hover:bg-white/5' : 'text-gray-400 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 sm:p-8 pt-0 custom-scrollbar overscroll-contain">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-6">
              <div className="relative">
                <History className={`w-12 h-12 opacity-20 animate-pulse ${isDark ? 'text-gold-400' : 'text-gray-300'}`} />
                <Loader2 className="absolute inset-0 w-12 h-12 text-gold-400 animate-spin" />
              </div>
              <p className="text-gray-400 font-bold uppercase tracking-widest text-[10px]">Chargement des données...</p>
            </div>
          ) : history.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center gap-6">
              <div className={`w-24 h-24 rounded-[2rem] flex items-center justify-center text-gray-700 border border-dashed ${
                isDark ? 'bg-white/5 border-white/5' : 'bg-gray-50 border-gray-100'
              }`}>
                <XCircle className="w-12 h-12" />
              </div>
              <div className="space-y-2">
                <p className={`font-bold text-xl ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>{t('products.historyEmpty')}</p>
                <p className="text-sm text-gray-500 max-w-[280px]">Aucune activité n'a été enregistrée pour ce produit pour le moment.</p>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <ul className="space-y-3">
                {history.map((entry) => {
                  const dateInfo = formatDate(entry.created_at)
                  return (
                    <li key={entry.id} className={`group p-5 rounded-3xl border transition-all relative overflow-hidden ${
                      isDark ? 'bg-white/[0.02] border-white/5 hover:bg-white/[0.04]' : 'bg-gray-50/50 border-gray-100 hover:bg-gray-100/50 hover:border-gray-200 shadow-sm hover:shadow-md'
                    }`}>
                      <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-transparent via-blue-500/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                      
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                            entry.action === 'created' ? 'bg-emerald-500/10 text-emerald-500' :
                            entry.action === 'stock_add' ? 'bg-blue-500/10 text-blue-500' :
                            entry.action === 'stock_remove' ? 'bg-red-500/10 text-red-500' :
                            'bg-purple-500/10 text-purple-500'
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
                              <div className={`flex items-center gap-1.5 font-bold ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>
                                <Package className="w-3.5 h-3.5 text-gray-400" />
                                <span className="truncate">{entry.product_name}</span>
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="text-right sm:text-right">
                          <p className={`font-mono text-sm group-hover:text-gold-500 transition-colors break-words ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>{dateInfo.full}</p>
                          <p className="text-[10px] uppercase font-black tracking-widest text-gray-400">il y a quelques instants</p>
                        </div>
                      </div>

                      {renderChange(entry) && (
                        <div className={`grid grid-cols-1 gap-2 p-4 rounded-2xl border text-xs font-mono ${
                          isDark ? 'bg-black/40 border-white/5' : 'bg-white border-gray-100 shadow-inner'
                        }`}>
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

        <div className={`flex-shrink-0 p-6 sm:p-8 pt-4 border-t ${
          isDark ? 'border-white/5 bg-black/20' : 'border-gray-100 bg-gray-50/50'
        }`} style={{ paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))' }}>
          <button 
            type="button" 
            onClick={onClose} 
            className={`w-full py-4 px-6 rounded-2xl font-bold transition-all ${
              isDark ? 'text-gray-500 hover:text-white hover:bg-white/5' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'
            }`}
          >
            Fermer
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}
