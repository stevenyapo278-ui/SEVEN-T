import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Package, Plus, Upload, History, RefreshCw, Loader2 } from 'lucide-react'
import { useLockBodyScroll } from '../hooks/useLockBodyScroll'
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
  const { formatPrice, getSymbol } = useCurrency()
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
  const [editingProduct, setEditingProduct] = useState(null)
  const [showHistory, setShowHistory] = useState(false)
  const [historyProductId, setHistoryProductId] = useState(null)
  const [historyList, setHistoryList] = useState([])
  const [historyLoading, setHistoryLoading] = useState(false)

  const anyModalOpen = showAddModal || !!editingProduct || showImportModal || showHistory
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
    setShowHistory(false)
    setHistoryProductId(null)
    setHistoryList([])
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
