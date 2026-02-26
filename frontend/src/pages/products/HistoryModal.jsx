import { useTranslation } from 'react-i18next'
import { X, Loader2 } from 'lucide-react'

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

  const formatDate = (d) => {
    if (!d) return '-'
    return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  }

  const renderChange = (entry) => {
    const parts = []
    if (entry.quantity_change != null && entry.quantity_change !== 0) {
      const sign = entry.quantity_change > 0 ? '+' : ''
      parts.push(
        <span key="stock-qty" className="text-amber-400">
          {t('products.historyFieldStock')} {entry.stock_before} → {entry.stock_after} ({sign}{entry.quantity_change})
        </span>
      )
    }
    if (entry.details && typeof entry.details === 'object') {
      Object.entries(entry.details).forEach(([field, [oldVal, newVal]], index) => {
        const label = t(`products.${FIELD_KEYS[field] || field}`)
        const oldStr = field === 'price' || field === 'cost_price' ? formatPrice(oldVal) : String(oldVal ?? '-')
        const newStr = field === 'price' || field === 'cost_price' ? formatPrice(newVal) : String(newVal ?? '-')
        parts.push(
          <span key={`detail-${field}-${index}`} className="text-gray-400">
            {label}: {oldStr} → {newStr}
          </span>
        )
      })
    }
    if (parts.length === 0 && entry.notes) {
      parts.push(<span key="notes" className="text-gray-400">{entry.notes}</span>)
    }
    return parts.length ? parts : null
  }

  const title = productId ? t('products.historyTitleProduct', { name: productName || t('products.tableProduct') }) : t('products.historyTitle')

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="fixed inset-0 bg-space-950/80 backdrop-blur-sm" onClick={onClose} aria-hidden />
      <div className="relative z-10 w-full max-w-2xl max-h-[90vh] sm:max-h-[85vh] flex flex-col bg-space-900 border border-space-700 rounded-t-2xl sm:rounded-3xl shadow-2xl animate-fadeIn" role="dialog" aria-modal="true" aria-labelledby="history-modal-title">
        <div className="p-4 sm:p-6 border-b border-space-700 flex-shrink-0">
          <div className="flex items-center justify-between">
            <h2 id="history-modal-title" className="text-lg sm:text-xl font-display font-semibold text-gray-100">{title}</h2>
            <button type="button" onClick={onClose} className="p-2 -m-2 text-gray-500 hover:text-gray-300 touch-target" aria-label={t('common.close')}>
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 min-h-0">
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 text-blue-400 animate-spin" aria-hidden />
            </div>
          ) : history.length === 0 ? (
            <p className="text-gray-500 text-center py-8">{t('products.historyEmpty')}</p>
          ) : (
            <ul className="space-y-3">
              {history.map((entry) => (
                <li key={entry.id} className="p-4 rounded-xl bg-space-800 border border-space-700">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-blue-500/20 text-blue-400 text-sm font-medium">
                      {ACTION_KEYS[entry.action] ? t(`products.${ACTION_KEYS[entry.action]}`) : entry.action}
                    </span>
                    {!productId && entry.product_name && <span className="text-gray-300 font-medium">{entry.product_name}</span>}
                    <span className="text-gray-500 text-sm ml-auto">{formatDate(entry.created_at)}</span>
                  </div>
                  {renderChange(entry) && (
                    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-sm">{renderChange(entry)}</div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
