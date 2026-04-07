import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Package, Plus, Upload, History, RefreshCw, Loader2, Link, X, XCircle, Target, ShoppingCart, TrendingUp, Phone, User, Trash2, CheckCircle, ArrowLeft, Layers } from 'lucide-react'
import { useLockBodyScroll } from '../hooks/useLockBodyScroll'
import { useAuth } from '../contexts/AuthContext'
import { useCurrency } from '../contexts/CurrencyContext'
import { useTheme } from '../contexts/ThemeContext'
import api from '../services/api'
import toast from 'react-hot-toast'
import { useProducts } from './products/useProducts'
import ProductStats from './products/ProductStats'
import ProductFilters from './products/ProductFilters'
import ProductList from './products/ProductList'
import ProductModal from './products/ProductModal'
import ImportModal from './products/ImportModal'
import HistoryModal from './products/HistoryModal'
import CategoryModal from './products/CategoryModal'
import { useOnboardingTour } from '../components/Onboarding'
import EmptyState from '../components/EmptyState'

export default function Products() {
  const { t } = useTranslation()
  const { startTour, completedTours } = useOnboardingTour()
  const { theme } = useTheme()
  const [searchParams, setSearchParams] = useSearchParams()
  const isDark = theme === 'dark'
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
    handleDelete,
    addCategory,
    deleteCategory,
    selectedIds,
    toggleSelect,
    toggleSelectAll,
    handleBulkDelete
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
  const [selectedProductView, setSelectedProductView] = useState(null)
  const [showCategoryModal, setShowCategoryModal] = useState(false)
  const [imageZoom, setImageZoom] = useState(null)

  const anyModalOpen = showAddModal || !!editingProduct || showImportModal || showImportUrlModal || showHistory || !!selectedProductView || showCategoryModal
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

  useEffect(() => {
    if (searchParams.get('create') === 'true') {
      setShowAddModal(true)
      searchParams.delete('create')
      setSearchParams(searchParams, { replace: true })
    }
  }, [searchParams, setSearchParams])

  useEffect(() => {
    if (!completedTours.includes('products')) {
      startTour('products')
    }
  }, [completedTours, startTour])

  return (
    <div className="max-w-full mx-auto w-full space-y-6 px-4 sm:px-6 lg:px-8 min-w-0">
      {/* Header Hero */}
      <div className={`relative rounded-2xl sm:rounded-3xl border p-4 sm:p-8 mb-4 sm:mb-8 ${
        isDark ? 'bg-gradient-to-br from-space-800 via-space-900 to-space-800 border-space-700/50' : 'bg-gradient-to-br from-gray-50 via-white to-gray-50 border-gray-200'
      }`}>
        <div
          className="absolute inset-0 opacity-50"
          style={{ backgroundImage: `url(${isDark ? "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wMiI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMiIvPjwvZz48L2c+PC9zdmc+" : "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgdmlld0JveD0iMCAwIDYwIDYwIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiM2NDc0OGIiIGZpbGwtb3BhY2l0eT0iMC4wNiI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMiIvPjwvZz48L2c+PC9zdmc+"})` }}
          aria-hidden
        />
        <div className="relative z-10">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div className="min-w-0">
              <div className="flex items-center gap-3 mb-2 min-w-0">
                <div className="p-2 bg-blue-500/10 rounded-xl flex-shrink-0">
                  <Package className="w-6 h-6 text-blue-400" />
                </div>
                <h1 className={`text-2xl sm:text-3xl font-display font-bold break-words ${isDark ? 'text-white' : 'text-gray-900'}`}>{t('products.title')}</h1>
              </div>
              <p className={`text-base sm:text-lg break-words ${isDark ? 'text-gray-400' : 'text-gray-700'}`}>{t('products.subtitle')}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2 sm:gap-3 flex-shrink-0 relative z-20">
              <button type="button" onClick={() => loadHistory(null)} className={`flex items-center justify-center gap-2 px-4 py-2 rounded-xl transition-all duration-200 min-h-[44px] ${
                isDark ? 'bg-space-800 text-gray-300 hover:bg-space-700 hover:text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}>
                <History className="w-4 h-4" aria-hidden />
                <span className="hidden sm:inline">{t('products.btnHistory')}</span>
              </button>
              <button type="button" onClick={() => setShowCategoryModal(true)} className={`flex items-center justify-center gap-2 px-4 py-2 rounded-xl transition-all duration-200 min-h-[44px] ${
                isDark ? 'bg-space-800 text-gray-300 hover:bg-space-700 hover:text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}>
                <Layers className="w-4 h-4" aria-hidden />
                <span className="hidden sm:inline">Catégories</span>
              </button>
              <button type="button" onClick={() => setShowImportModal(true)} className={`flex items-center justify-center gap-2 px-4 py-2 rounded-xl transition-all duration-200 min-h-[44px] ${
                isDark ? 'bg-space-800 text-gray-300 hover:bg-space-700 hover:text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}>
                <Upload className="w-4 h-4" aria-hidden />
                <span className="hidden sm:inline">{t('products.btnImportCsv')}</span>
              </button>
              {hasCatalogImport && (
                <button type="button" onClick={() => setShowImportUrlModal(true)} className={`flex items-center justify-center gap-2 px-4 py-2 rounded-xl transition-all duration-200 min-h-[44px] ${
                  isDark ? 'bg-space-800 text-gray-300 hover:bg-space-700 hover:text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}>
                  <Link className="w-4 h-4" aria-hidden />
                  <span className="hidden sm:inline">Importer URL</span>
                </button>
              )}
              <button type="button" onClick={() => setShowAddModal(true)} className="btn-primary flex items-center gap-2 min-h-[44px]" data-tour="create-product">
                <Plus className="w-5 h-5" aria-hidden />
                <span>{t('products.btnAdd')}</span>
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
        onToggleSelectAll={toggleSelectAll}
        allSelected={filteredProducts.length > 0 && selectedIds.size === filteredProducts.length}
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

      {!loadError && !loading && filteredProducts.length === 0 ? (
        <EmptyState
          icon={Package}
          title={products.length === 0 ? t('products.emptyNoProduct') : t('products.emptyNoResult')}
          description={products.length === 0 ? t('products.emptyHintNone') : t('products.emptyHintFilter')}
          primaryAction={products.length === 0 ? {
            label: t('products.btnAddProduct'),
            icon: Plus,
            onClick: () => setShowAddModal(true)
          } : {
            label: 'Effacer les filtres',
            onClick: () => {
              setSearchQuery('')
              setCategoryFilter('all')
              setStockFilter('all')
            }
          }}
          secondaryAction={products.length === 0 ? {
            label: t('products.btnImportCsvShort'),
            icon: Upload,
            onClick: () => setShowImportModal(true)
          } : null}
        />
      ) : !loadError ? (
        <>
          {/* Bulk Action Bar */}
          {selectedIds.size > 0 && (
            <div className={`sticky top-4 z-40 flex items-center justify-between p-3 sm:p-4 mb-6 rounded-2xl shadow-2xl animate-slideUp border ${
              isDark ? 'bg-space-800 border-blue-500/50 text-white' : 'bg-white border-blue-200 text-gray-900'
            }`}>
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-blue-500 text-white font-bold text-sm sm:text-base">
                  {selectedIds.size}
                </div>
                <div className="hidden sm:block">
                  <p className="font-bold text-sm">Produits sélectionnés</p>
                  <p className="text-[10px] text-gray-500 uppercase font-black tracking-widest">Actions groupées</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => toggleSelectAll()}
                  className={`px-4 py-2 text-sm font-medium rounded-xl transition-colors ${
                    isDark ? 'hover:bg-white/5 text-gray-400' : 'hover:bg-gray-100 text-gray-600'
                  }`}
                >
                  Désélectionner
                </button>
                <button
                  onClick={handleBulkDelete}
                  className="flex items-center gap-2 px-3 sm:px-5 py-2 sm:py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-xl font-bold transition-all shadow-lg shadow-red-500/20 text-xs sm:text-sm"
                >
                  <Trash2 className="w-4 h-4" />
                  <span className="hidden xs:inline">Supprimer</span>
                </button>
              </div>
            </div>
          )}

          <ProductList
            products={filteredProducts}
            formatPrice={formatPrice}
            onEdit={setEditingProduct}
            onDelete={handleDelete}
            onHistory={loadHistory}
            onView={setSelectedProductView}
            selectedIds={selectedIds}
            onToggleSelect={toggleSelect}
            data-tour="products-list"
          />
        </>
      ) : null}

      {(showAddModal || editingProduct) && (
        <ProductModal
          product={editingProduct}
          categories={categories}
          getSymbol={getSymbol}
          onClose={() => { setShowAddModal(false); setEditingProduct(null) }}
          onSaved={() => { closeModals(); loadProducts() }}
        />
      )}

      {showCategoryModal && (
        <CategoryModal
          categories={categories}
          loading={false}
          onAdd={addCategory}
          onDelete={deleteCategory}
          onClose={() => setShowCategoryModal(false)}
        />
      )}

      {showImportModal && (
        <ImportModal
          onClose={() => setShowImportModal(false)}
          onImported={() => { setShowImportModal(false); loadProducts() }}
        />
      )}

      {showImportUrlModal && createPortal(
        <div 
          className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
          onClick={() => !importUrlLoading && setShowImportUrlModal(false)}
          style={{ paddingLeft: 'env(safe-area-inset-left)', paddingRight: 'env(safe-area-inset-right)' }}
        >
          <div 
            className="relative z-10 w-full max-w-lg bg-[#0B0F1A] border border-white/10 rounded-t-[2.5rem] sm:rounded-3xl shadow-[0_32px_128px_-16px_rgba(0,0,0,0.8)] flex flex-col max-h-[92dvh] sm:max-h-[85vh] overflow-hidden animate-slideUp sm:animate-zoomIn"
            onClick={e => e.stopPropagation()}
          >
            {/* Mobile Handle */}
            <div className="flex-shrink-0 w-full flex justify-center pt-2 pb-1 sm:hidden">
              <div className="w-12 h-1.5 rounded-full bg-white/10" />
            </div>

            <div className="flex-shrink-0 p-6 sm:p-8" style={{ paddingTop: 'max(1.5rem, env(safe-area-inset-top))' }}>
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <h2 className="text-2xl font-display font-bold text-gray-100 truncate">Importer via URL</h2>
                  <p className="text-sm text-gray-500 mt-1 truncate">Collez l'URL d'un catalogue produit</p>
                </div>
                <button 
                  onClick={() => setShowImportUrlModal(false)} 
                  disabled={importUrlLoading}
                  className="p-2 -mr-2 text-gray-500 hover:text-white transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl hover:bg-white/5"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 sm:p-8 pt-0 custom-scrollbar overscroll-contain">
              <form onSubmit={handleImportFromUrl} className="space-y-6">
                <div className="space-y-2">
                  <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">URL du catalogue</label>
                  <div className="relative group">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">
                      <Link className="w-4 h-4" />
                    </div>
                    <input
                      type="url"
                      value={importUrlValue}
                      onChange={(e) => setImportUrlValue(e.target.value)}
                      placeholder="https://votre-boutique.com/produits"
                      className="input-dark w-full py-4 pl-12 pr-5 text-base rounded-2xl"
                      required
                      disabled={importUrlLoading}
                    />
                  </div>
                </div>

                <div className="p-5 bg-blue-500/5 border border-blue-500/10 rounded-2xl flex items-start gap-4">
                  <div className="p-3 bg-blue-500/10 rounded-xl text-blue-400">
                    <Target className="w-5 h-5" />
                  </div>
                  <p className="text-sm text-blue-100/60 leading-relaxed">
                    Notre IA va analyser la page pour extraire automatiquement les photos, noms et prix des produits.
                  </p>
                </div>

                <div className="flex flex-col-reverse sm:flex-row gap-3 pt-4" style={{ paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))' }}>
                  <button 
                    type="button" 
                    onClick={() => setShowImportUrlModal(false)} 
                    disabled={importUrlLoading} 
                    className="flex-1 py-4 px-6 rounded-2xl font-bold text-gray-500 hover:text-white hover:bg-white/5 transition-all"
                  >
                    Annuler
                  </button>
                  <button 
                    type="submit" 
                    disabled={importUrlLoading || !importUrlValue?.trim()} 
                    className="flex-1 py-4 px-6 rounded-2xl font-syne font-black italic bg-white text-black hover:bg-gold-400 transition-all hover:scale-[1.02] active:scale-[0.98] shadow-xl inline-flex items-center justify-center gap-2 uppercase tracking-tight"
                  >
                    {importUrlLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <RefreshCw className="w-5 h-5" />}
                    {importUrlLoading ? 'Analyse...' : 'Lancer l\'import'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>,
        document.body
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

      {selectedProductView && (
        <DetailOverlay onClose={() => setSelectedProductView(null)}>
          <div className="flex flex-col">
            <div className="flex items-center gap-6 mb-10">
              <div
                className={`w-28 h-28 bg-white/5 rounded-3xl flex items-center justify-center flex-shrink-0 overflow-hidden shadow-2xl ring-1 ring-white/10 ${
                  selectedProductView.image_url ? 'cursor-zoom-in group' : ''
                }`}
                onClick={() => selectedProductView.image_url && setImageZoom(getProductImageUrl(selectedProductView.image_url))}
              >
                {selectedProductView.image_url ? (
                  <img src={getProductImageUrl(selectedProductView.image_url)} alt={selectedProductView.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                ) : (
                  <Package className="w-12 h-12 text-gray-700" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-3xl font-display font-bold text-gray-100 mb-3 truncate leading-tight">{selectedProductView.name}</h3>
                <div className="flex flex-wrap gap-2">
                  {selectedProductView.category && (
                    <span className="px-3 py-1 rounded-full bg-blue-500/10 text-blue-400 text-[10px] font-black uppercase tracking-widest border border-blue-500/20">
                      {selectedProductView.category}
                    </span>
                  )}
                  <span className="px-3 py-1 rounded-full bg-white/5 text-gray-400 text-[10px] font-mono font-bold tracking-wider border border-white/5">
                    {selectedProductView.sku || 'AUCUN-SKU'}
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-8">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-5 bg-white/5 rounded-3xl border border-white/5">
                  <p className="text-[10px] text-gray-500 uppercase font-black tracking-widest mb-2">Prix de vente</p>
                  <p className="text-3xl font-display font-bold text-emerald-400 font-mono italic">{formatPrice(selectedProductView.price)}</p>
                </div>
                <div className="p-5 bg-white/5 rounded-3xl border border-white/5">
                  <p className="text-[10px] text-gray-500 uppercase font-black tracking-widest mb-2">Stock actuel</p>
                  <p className={`text-3xl font-display font-bold font-mono italic ${
                    selectedProductView.stock === 0 ? 'text-red-400' : 
                    selectedProductView.stock <= 10 ? 'text-amber-400' : 'text-blue-400'
                  }`}>
                    {selectedProductView.stock}
                    <span className="text-xs uppercase font-black ml-1.5 opacity-50 not-italic">unités</span>
                  </p>
                </div>
              </div>

              {selectedProductView.description && (
                <div className="p-6 bg-white/[0.02] rounded-3xl border border-white/5 border-dashed">
                  <p className="text-[10px] text-gray-500 uppercase font-black mb-3 tracking-widest">Description</p>
                  <p className="text-gray-300 leading-relaxed italic text-sm">{selectedProductView.description}</p>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex items-center gap-4 p-5 bg-white/5 rounded-3xl border border-white/5">
                  <div className="w-12 h-12 rounded-2xl bg-purple-500/10 flex items-center justify-center text-purple-400">
                    <ShoppingCart className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest">Ventes totales</p>
                    <p className="text-gray-100 font-bold font-mono">{selectedProductView.total_sold || 0} vendus</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 p-5 bg-white/5 rounded-3xl border border-white/5">
                  <div className="w-12 h-12 rounded-2xl bg-gold-400/10 flex items-center justify-center text-gold-400">
                    <TrendingUp className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest">Marge unitaire</p>
                    <p className="text-gray-100 font-bold font-mono">
                      {formatPrice((selectedProductView.price || 0) - (selectedProductView.cost_price || 0))}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-4 pt-4">
                <button 
                  onClick={() => {
                    setSelectedProductView(null)
                    setEditingProduct(selectedProductView)
                  }}
                  className="w-full sm:flex-1 py-4 px-8 bg-white text-black rounded-2xl font-syne font-black italic uppercase tracking-tight hover:bg-gold-400 transition-all hover:scale-[1.02] active:scale-[0.98] shadow-xl flex items-center justify-center gap-2"
                >
                  Modifier le produit
                </button>
                <button 
                  onClick={() => setSelectedProductView(null)} 
                  className="w-full sm:w-auto py-4 px-8 bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white rounded-2xl font-bold transition-colors border border-white/5"
                >
                  Fermer
                </button>
              </div>
            </div>
          </div>
        </DetailOverlay>
      )}

      {imageZoom && (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/90 backdrop-blur-sm cursor-zoom-out animate-fadeIn"
          onClick={() => setImageZoom(null)}
        >
          <button
            onClick={() => setImageZoom(null)}
            className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
          <img
            src={imageZoom}
            alt="Aperçu"
            className="max-w-[90vw] max-h-[90vh] object-contain rounded-2xl shadow-2xl ring-1 ring-white/10"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  )
}

function getProductImageUrl(url) {
  if (!url) return null
  const u = url.trim()
  if (u.startsWith('http')) return u
  if (u.startsWith('/api/') || u.startsWith('/products/')) return u
  return `/api/products/image/${u}`
}

function DetailOverlay({ children, onClose }) {
  return createPortal(
    <div 
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in" 
      onClick={onClose}
      style={{ paddingLeft: 'env(safe-area-inset-left)', paddingRight: 'env(safe-area-inset-right)' }}
    >
      <div 
        className="relative z-10 w-full max-w-2xl bg-[#0B0F1A] border border-white/10 rounded-t-[2.5rem] sm:rounded-3xl shadow-[0_32px_128px_-16px_rgba(0,0,0,0.8)] flex flex-col max-h-[92dvh] sm:max-h-[85vh] overflow-hidden animate-slideUp sm:animate-zoomIn"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex-shrink-0 w-full flex justify-center pt-2 pb-1 sm:hidden">
          <div className="w-12 h-1.5 rounded-full bg-white/10" />
        </div>

        <div className="flex-shrink-0 p-6 sm:p-10 flex justify-end" style={{ paddingTop: 'max(1.5rem, env(safe-area-inset-top))' }}>
          <button 
            onClick={onClose} 
            className="p-2 -mr-2 text-gray-500 hover:text-white transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl hover:bg-white/5"
          >
            <XCircle className="w-7 h-7" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar overscroll-contain px-6 sm:px-10 pb-10" style={{ paddingBottom: 'max(2.5rem, env(safe-area-inset-bottom))' }}>
          {children}
        </div>
      </div>
    </div>,
    document.body
  )
}
