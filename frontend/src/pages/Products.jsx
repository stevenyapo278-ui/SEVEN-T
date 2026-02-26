import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Package, Plus, Upload, History, RefreshCw, Loader2, Link, X } from 'lucide-react'
import { useLockBodyScroll } from '../hooks/useLockBodyScroll'
import { useAuth } from '../contexts/AuthContext'
import { useCurrency } from '../contexts/CurrencyContext'
import api from '../services/api'
import toast from 'react-hot-toast'
import { useProducts } from './products/useProducts'
import ProductStats from './products/ProductStats'
import ProductFilters from './products/ProductFilters'
import ProductList from './products/ProductList'
import ProductModal from './products/ProductModal'
import ImportModal from './products/ImportModal'
import HistoryModal from './products/HistoryModal'

export default function Products() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const { formatPrice, getSymbol } = useCurrency()
  const hasCatalogImport = user?.plan_features?.catalog_import === true
  const {
    products,
    loading,
    loadError,
    loadProducts,
    searchQuery,
    setSearchQuery,
    categoryFilter,
    setCategoryFilter,
    stockFilter,
    setStockFilter,
    categories,
    filteredProducts,
    stats,
    handleDelete
  } = useProducts()

  const [showAddModal, setShowAddModal] = useState(false)
  const [showImportModal, setShowImportModal] = useState(false)
  const [showImportUrlModal, setShowImportUrlModal] = useState(false)
  const [importUrlValue, setImportUrlValue] = useState('')
  const [importUrlLoading, setImportUrlLoading] = useState(false)
  const [editingProduct, setEditingProduct] = useState(null)
  const [showHistory, setShowHistory] = useState(false)
  const [historyProductId, setHistoryProductId] = useState(null)
  const [historyList, setHistoryList] = useState([])
  const [historyLoading, setHistoryLoading] = useState(false)

  const anyModalOpen = showAddModal || !!editingProduct || showImportModal || showImportUrlModal || showHistory
  useLockBodyScroll(anyModalOpen)

  const loadHistory = async (productId = null) => {
    setHistoryLoading(true)
    setHistoryProductId(productId)
    setShowHistory(true)
    try {
      const url = productId ? `/products/history?product_id=${productId}` : '/products/history'
      const response = await api.get(url)
      setHistoryList(response.data.history || [])
    } catch (error) {
      toast.error(t('messages.historyLoadError'))
      setHistoryList([])
    } finally {
      setHistoryLoading(false)
    }
  }

  const closeModals = () => {
    setShowAddModal(false)
    setEditingProduct(null)
    setShowImportModal(false)
    setShowImportUrlModal(false)
    setImportUrlValue('')
    setShowHistory(false)
    setHistoryProductId(null)
    setHistoryList([])
  }

  const handleImportFromUrl = async (e) => {
    e.preventDefault()
    const url = importUrlValue?.trim()
    if (!url) {
      toast.error(t('products.importUrlRequired') || 'Indiquez une URL')
      return
    }
    setImportUrlLoading(true)
    try {
      const { data } = await api.post('/products/import-from-url', { url })
      toast.success(t('messages.productsImported', { count: data.imported }) || `${data.imported} produit(s) importé(s)`)
      loadProducts()
      closeModals()
    } catch (err) {
      toast.error(err.response?.data?.error || t('messages.errorImport') || 'Erreur lors de l\'import')
    } finally {
      setImportUrlLoading(false)
    }
  }

  return (
    <div className="space-y-4 sm:space-y-6 px-3 sm:px-0 min-w-0">
      {/* Header Hero */}
      <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl border border-space-700 p-4 sm:p-8" style={{ backgroundColor: 'var(--bg-secondary)' }}>
        <div className="absolute inset-0 bg-[url('data:image/svg+xml,...')] opacity-5 hero-pattern-overlay" aria-hidden="true" />
        <div className="relative z-10">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 sm:gap-6">
            <div className="min-w-0">
              <h1 className="text-xl sm:text-3xl font-display font-bold text-gray-100 mb-1 sm:mb-2 flex flex-wrap items-center gap-2 sm:gap-3 truncate">
                <div className="p-2 sm:p-3 bg-gradient-to-br from-blue-500 to-gold-400 rounded-xl sm:rounded-2xl flex-shrink-0">
                  <Package className="w-6 h-6 sm:w-8 sm:h-8 icon-on-gradient" aria-hidden />
                </div>
                {t('products.title')}
              </h1>
              <p className="text-sm sm:text-base text-gray-400">{t('products.subtitle')}</p>
            </div>
            <div className="flex flex-wrap gap-2 sm:gap-3 flex-shrink-0">
              <button type="button" onClick={() => loadHistory(null)} className="btn-secondary inline-flex items-center justify-center gap-2 min-h-[44px] px-3 sm:px-4 touch-target text-sm sm:text-base">
                <History className="w-4 h-4" aria-hidden />
                <span className="hidden sm:inline">{t('products.btnHistory')}</span>
              </button>
              <button type="button" onClick={() => setShowImportModal(true)} className="btn-secondary inline-flex items-center justify-center gap-2 min-h-[44px] px-3 sm:px-4 touch-target text-sm sm:text-base">
                <Upload className="w-4 h-4" aria-hidden />
                <span className="hidden sm:inline">{t('products.btnImportCsv')}</span>
              </button>
              {hasCatalogImport && (
                <button type="button" onClick={() => setShowImportUrlModal(true)} className="btn-secondary inline-flex items-center justify-center gap-2 min-h-[44px] px-3 sm:px-4 touch-target text-sm sm:text-base">
                  <Link className="w-4 h-4" aria-hidden />
                  <span className="hidden sm:inline">Importer depuis une URL</span>
                </button>
              )}
              <button type="button" onClick={() => setShowAddModal(true)} className="btn-primary inline-flex items-center justify-center gap-2 min-h-[44px] px-4 sm:px-5 touch-target text-sm sm:text-base">
                <Plus className="w-5 h-5" aria-hidden />
                {t('products.btnAdd')}
              </button>
            </div>
          </div>
          <ProductStats stats={stats} formatPrice={formatPrice} />
        </div>
      </div>

      <ProductFilters
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        categoryFilter={categoryFilter}
        setCategoryFilter={setCategoryFilter}
        stockFilter={stockFilter}
        setStockFilter={setStockFilter}
        categories={categories}
      />

      {loadError && (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-6 text-center mb-6">
          <p className="text-red-300 mb-3">{loadError}</p>
          <button type="button" onClick={() => loadProducts()} className="inline-flex items-center gap-2 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-200 rounded-xl font-medium transition-colors">
            <RefreshCw className="w-4 h-4" aria-hidden />
            {t('products.btnRetry')}
          </button>
        </div>
      )}

      {!loadError && loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-blue-400 animate-spin" aria-hidden />
        </div>
      ) : !loadError && filteredProducts.length === 0 ? (
        <div className="text-center py-20">
          <div className="w-20 h-20 bg-space-800 rounded-3xl flex items-center justify-center mx-auto mb-6">
            <Package className="w-10 h-10 text-gray-600" aria-hidden />
          </div>
          <h2 className="text-xl font-semibold text-gray-300 mb-2">
            {products.length === 0 ? t('products.emptyNoProduct') : t('products.emptyNoResult')}
          </h2>
          <p className="text-gray-500 mb-6">
            {products.length === 0 ? t('products.emptyHintNone') : t('products.emptyHintFilter')}
          </p>
          {products.length === 0 && (
            <div className="flex gap-3 justify-center">
              <button type="button" onClick={() => setShowImportModal(true)} className="btn-secondary inline-flex items-center gap-2">
                <Upload className="w-4 h-4" aria-hidden />
                {t('products.btnImportCsvShort')}
              </button>
              <button type="button" onClick={() => setShowAddModal(true)} className="btn-primary inline-flex items-center gap-2">
                <Plus className="w-5 h-5" aria-hidden />
                {t('products.btnAddProduct')}
              </button>
            </div>
          )}
        </div>
      ) : !loadError ? (
        <ProductList
          products={filteredProducts}
          formatPrice={formatPrice}
          onEdit={setEditingProduct}
          onDelete={handleDelete}
          onHistory={loadHistory}
        />
      ) : null}

      {(showAddModal || editingProduct) && (
        <ProductModal
          product={editingProduct}
          getSymbol={getSymbol}
          onClose={() => { setShowAddModal(false); setEditingProduct(null) }}
          onSaved={() => { closeModals(); loadProducts() }}
        />
      )}

      {showImportModal && (
        <ImportModal
          onClose={() => setShowImportModal(false)}
          onImported={() => { setShowImportModal(false); loadProducts() }}
        />
      )}

      {showImportUrlModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="fixed inset-0 bg-space-950/80 backdrop-blur-sm" onClick={() => !importUrlLoading && setShowImportUrlModal(false)} aria-hidden />
          <div className="relative z-10 w-full max-w-lg bg-space-900 border border-space-700 rounded-t-2xl sm:rounded-3xl shadow-2xl animate-fadeIn p-4 sm:p-6" role="dialog" aria-modal="true" aria-labelledby="import-url-title" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 id="import-url-title" className="text-lg font-display font-semibold text-gray-100">Importer depuis une URL</h2>
              <button type="button" onClick={() => setShowImportUrlModal(false)} disabled={importUrlLoading} className="p-2 -m-2 text-gray-500 hover:text-gray-300 disabled:opacity-50">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-sm text-gray-400 mb-4">Collez l&apos;URL d&apos;une page catalogue (site e‑commerce) pour extraire les produits.</p>
            <form onSubmit={handleImportFromUrl} className="space-y-4">
              <input
                type="url"
                value={importUrlValue}
                onChange={(e) => setImportUrlValue(e.target.value)}
                placeholder="https://..."
                className="w-full px-4 py-3 rounded-xl border border-space-700 bg-space-800 text-gray-100 placeholder-gray-500 focus:outline-none focus:border-gold-400/50"
                required
                disabled={importUrlLoading}
              />
              <div className="flex gap-3">
                <button type="button" onClick={() => setShowImportUrlModal(false)} disabled={importUrlLoading} className="btn-secondary flex-1 min-h-[44px] touch-target disabled:opacity-50">
                  Annuler
                </button>
                <button type="submit" disabled={importUrlLoading || !importUrlValue?.trim()} className="btn-primary flex-1 min-h-[44px] touch-target inline-flex items-center justify-center gap-2 disabled:opacity-50">
                  {importUrlLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                  Importer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showHistory && (
        <HistoryModal
          history={historyList}
          loading={historyLoading}
          productId={historyProductId}
          productName={historyProductId ? products.find(p => p.id === historyProductId)?.name : null}
          formatPrice={formatPrice}
          onClose={() => { setShowHistory(false); setHistoryProductId(null); setHistoryList([]) }}
        />
      )}
    </div>
  )
}
