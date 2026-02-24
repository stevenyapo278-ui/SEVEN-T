import { useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import api from '../services/api'
import { useCurrency } from '../contexts/CurrencyContext'
import { useConfirm } from '../contexts/ConfirmContext'
import { 
  Package, 
  Plus, 
  Search, 
  Filter, 
  Upload, 
  Download,
  Edit,
  Trash2,
  X,
  AlertTriangle,
  Image,
  DollarSign,
  Archive,
  Tag,
  MoreVertical,
  FileSpreadsheet,
  Check,
  Loader2,
  History,
  RefreshCw
} from 'lucide-react'
import toast from 'react-hot-toast'

export default function Products() {
  const { t } = useTranslation()
  const { formatPrice, getSymbol } = useCurrency()
  const { showConfirm } = useConfirm()
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [stockFilter, setStockFilter] = useState('all')
  const [showAddModal, setShowAddModal] = useState(false)
  const [showImportModal, setShowImportModal] = useState(false)
  const [editingProduct, setEditingProduct] = useState(null)
  const [categories, setCategories] = useState([])
  const [showHistory, setShowHistory] = useState(false)
  const [historyProductId, setHistoryProductId] = useState(null)
  const [historyList, setHistoryList] = useState([])
  const [historyLoading, setHistoryLoading] = useState(false)

  useEffect(() => {
    loadProducts()
  }, [])

  const loadProducts = async () => {
    setLoadError(null)
    setLoading(true)
    try {
      const response = await api.get('/products')
      setProducts(response.data.products || [])
      // Extract unique categories
      const uniqueCategories = [...new Set(response.data.products?.map(p => p.category).filter(Boolean))]
      setCategories(uniqueCategories)
    } catch (error) {
      const message = error.response?.data?.error || error.message || t('messages.errorLoad')
      setLoadError(message)
      console.error('Error loading products:', error)
      toast.error(t('messages.errorLoad'))
    } finally {
      setLoading(false)
    }
  }

  const loadHistory = async (productId = null) => {
    setHistoryLoading(true)
    setHistoryProductId(productId)
    setShowHistory(true)
    try {
      const url = productId ? `/products/history?product_id=${productId}` : '/products/history'
      const response = await api.get(url)
      setHistoryList(response.data.history || [])
    } catch (error) {
      console.error('Error loading history:', error)
      toast.error(t('messages.historyLoadError'))
      setHistoryList([])
    } finally {
      setHistoryLoading(false)
    }
  }

  const handleDelete = async (id) => {
    const ok = await showConfirm({
      title: 'Supprimer le produit',
      message: 'Supprimer définitivement ce produit ? Cette action est irréversible.',
      variant: 'danger',
      confirmLabel: 'Supprimer'
    })
    if (!ok) return
    try {
      await api.delete(`/products/${id}`)
      toast.success(t('messages.productDeleted'))
      loadProducts()
    } catch (error) {
      toast.error(t('messages.errorDelete'))
    }
  }

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         product.sku?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         product.description?.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory = categoryFilter === 'all' || product.category === categoryFilter
    const matchesStock = stockFilter === 'all' || 
                        (stockFilter === 'in_stock' && product.stock > 0) ||
                        (stockFilter === 'low_stock' && product.stock > 0 && product.stock <= 10) ||
                        (stockFilter === 'out_of_stock' && product.stock === 0)
    return matchesSearch && matchesCategory && matchesStock
  })

  // Stats
  const stats = {
    total: products.length,
    inStock: products.filter(p => p.stock > 0).length,
    lowStock: products.filter(p => p.stock > 0 && p.stock <= 10).length,
    outOfStock: products.filter(p => p.stock === 0).length,
    totalValue: products.reduce((sum, p) => sum + ((p.price || 0) * (p.stock || 0)), 0),
    totalCost: products.reduce((sum, p) => sum + ((p.cost_price || 0) * (p.stock || 0)), 0)
  }

  const totalMargin = stats.totalValue - stats.totalCost

  return (
    <div className="space-y-6">
      {/* Header Hero */}
      <div className="relative overflow-hidden rounded-3xl border border-space-700 p-8" style={{ backgroundColor: 'var(--bg-secondary)' }}>
        <div className="absolute inset-0 bg-[url('data:image/svg+xml,...')] opacity-5 hero-pattern-overlay" aria-hidden="true" />
        <div className="relative z-10">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div className="min-w-0">
              <h1 className="text-3xl font-display font-bold text-gray-100 mb-2 flex flex-wrap items-center gap-3 truncate">
                <div className="p-3 bg-gradient-to-br from-blue-500 to-gold-400 rounded-2xl flex-shrink-0">
                  <Package className="w-8 h-8 icon-on-gradient" />
                </div>
                {t('products.title')}
              </h1>
              <p className="text-gray-400">
                {t('products.subtitle')}
              </p>
            </div>
            <div className="flex flex-wrap gap-3 flex-shrink-0">
              <button
                onClick={() => loadHistory(null)}
                className="btn-secondary inline-flex items-center justify-center gap-2 touch-target"
              >
                <History className="w-4 h-4" />
                Historique
              </button>
              <button
                onClick={() => setShowImportModal(true)}
                className="btn-secondary inline-flex items-center justify-center gap-2 touch-target"
              >
                <Upload className="w-4 h-4" />
                Importer CSV
              </button>
              <button
                onClick={() => setShowAddModal(true)}
                className="btn-primary inline-flex items-center justify-center gap-2 touch-target"
              >
                <Plus className="w-5 h-5" />
                Ajouter un produit
              </button>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-8 min-w-0">
            <div className="bg-space-800/50 backdrop-blur-sm rounded-2xl p-4 border border-space-700 min-w-0">
              <div className="flex items-center gap-3 min-w-0">
                <div className="p-2 bg-blue-500/20 rounded-xl flex-shrink-0">
                  <Package className="w-5 h-5 text-blue-400" />
                </div>
                <div className="min-w-0">
                  <p className="text-lg md:text-2xl font-bold text-gray-100 break-words" title={stats.total}>{stats.total}</p>
                  <p className="text-xs text-gray-500 break-words">Total produits</p>
                </div>
              </div>
            </div>
            <div className="bg-space-800/50 backdrop-blur-sm rounded-2xl p-4 border border-space-700 min-w-0">
              <div className="flex items-center gap-3 min-w-0">
                <div className="p-2 bg-green-500/20 rounded-xl flex-shrink-0">
                  <Check className="w-5 h-5 text-green-400" />
                </div>
                <div className="min-w-0">
                  <p className="text-lg md:text-2xl font-bold text-gray-100 break-words" title={stats.inStock}>{stats.inStock}</p>
                  <p className="text-xs text-gray-500 break-words">En stock</p>
                </div>
              </div>
            </div>
            <div className="bg-space-800/50 backdrop-blur-sm rounded-2xl p-4 border border-space-700 min-w-0">
              <div className="flex items-center gap-3 min-w-0">
                <div className="p-2 bg-amber-500/20 rounded-xl flex-shrink-0">
                  <AlertTriangle className="w-5 h-5 text-amber-400" />
                </div>
                <div className="min-w-0">
                  <p className="text-lg md:text-2xl font-bold text-gray-100 break-words" title={stats.lowStock}>{stats.lowStock}</p>
                  <p className="text-xs text-gray-500 break-words">Stock faible</p>
                </div>
              </div>
            </div>
            <div className="bg-space-800/50 backdrop-blur-sm rounded-2xl p-4 border border-space-700 min-w-0">
              <div className="flex items-center gap-3 min-w-0">
                <div className="p-2 bg-red-500/20 rounded-xl flex-shrink-0">
                  <Archive className="w-5 h-5 text-red-400" />
                </div>
                <div className="min-w-0">
                  <p className="text-lg md:text-2xl font-bold text-gray-100 break-words" title={stats.outOfStock}>{stats.outOfStock}</p>
                  <p className="text-xs text-gray-500 break-words">Rupture</p>
                </div>
              </div>
            </div>
            <div className="bg-space-800/50 backdrop-blur-sm rounded-2xl p-4 border border-space-700 min-w-0">
              <div className="flex items-center gap-3 min-w-0">
                <div className="p-2 bg-gold-400/20 rounded-xl flex-shrink-0">
                  <DollarSign className="w-5 h-5 text-gold-400" />
                </div>
                <div className="min-w-0 flex-1 overflow-hidden">
                  <p className="text-lg md:text-2xl font-bold text-gray-100 break-words" title={formatPrice(stats.totalValue)}>{formatPrice(stats.totalValue)}</p>
                  <p className="text-xs text-gray-500 break-words">Valeur stock</p>
                </div>
              </div>
            </div>
            <div className="bg-space-800/50 backdrop-blur-sm rounded-2xl p-4 border border-space-700 min-w-0">
              <div className="flex items-center gap-3 min-w-0">
                <div className="p-2 bg-emerald-500/20 rounded-xl flex-shrink-0">
                  <DollarSign className="w-5 h-5 text-emerald-400" />
                </div>
                <div className="min-w-0 flex-1 overflow-hidden">
                  <p className="text-lg md:text-2xl font-bold text-gray-100 break-words" title={formatPrice(totalMargin)}>{formatPrice(totalMargin)}</p>
                  <p className="text-xs text-gray-500 break-words">Marge potentielle stock</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
          <input
            type="text"
            placeholder="Rechercher un produit (nom, SKU, description)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input-dark w-full pl-12"
          />
        </div>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="input-dark min-w-[180px]"
        >
          <option value="all">Toutes catégories</option>
          {categories.map(cat => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
        <select
          value={stockFilter}
          onChange={(e) => setStockFilter(e.target.value)}
          className="input-dark min-w-[150px]"
        >
          <option value="all">Tout stock</option>
          <option value="in_stock">En stock</option>
          <option value="low_stock">Stock faible</option>
          <option value="out_of_stock">Rupture</option>
        </select>
      </div>

      {/* Load error + Retry */}
      {loadError && (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-6 text-center mb-6">
          <p className="text-red-300 mb-3">{loadError}</p>
          <button
            type="button"
            onClick={() => loadProducts()}
            className="inline-flex items-center gap-2 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-200 rounded-xl font-medium transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Réessayer
          </button>
        </div>
      )}

      {/* Products List */}
      {!loadError && loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
        </div>
      ) : !loadError && filteredProducts.length === 0 ? (
        <div className="text-center py-20">
          <div className="w-20 h-20 bg-space-800 rounded-3xl flex items-center justify-center mx-auto mb-6">
            <Package className="w-10 h-10 text-gray-600" />
          </div>
          <h3 className="text-xl font-semibold text-gray-300 mb-2">
            {products.length === 0 ? 'Aucun produit' : 'Aucun résultat'}
          </h3>
          <p className="text-gray-500 mb-6">
            {products.length === 0 
              ? 'Commencez par ajouter vos produits ou importez un fichier CSV'
              : 'Essayez de modifier vos filtres de recherche'}
          </p>
          {products.length === 0 && (
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => setShowImportModal(true)}
                className="btn-secondary inline-flex items-center gap-2"
              >
                <Upload className="w-4 h-4" />
                Importer CSV
              </button>
              <button
                onClick={() => setShowAddModal(true)}
                className="btn-primary inline-flex items-center gap-2"
              >
                <Plus className="w-5 h-5" />
                Ajouter un produit
              </button>
            </div>
          )}
        </div>
      ) : !loadError ? (
        <div className="grid gap-4">
          {/* Table Header */}
          <div className="hidden md:grid grid-cols-12 gap-4 px-6 py-3 text-sm font-medium text-gray-500">
            <div className="col-span-4">Produit</div>
            <div className="col-span-2">SKU</div>
            <div className="col-span-2">Prix</div>
            <div className="col-span-2">Stock</div>
            <div className="col-span-2 text-right">Actions</div>
          </div>

          {/* Products */}
          {filteredProducts.map((product, index) => (
            <div 
              key={product.id}
              className="card p-4 md:p-6 hover:border-space-600 transition-all"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                {/* Product Info */}
                <div className="col-span-4 flex items-center gap-4">
                  <div className="w-14 h-14 bg-space-800 rounded-xl flex items-center justify-center flex-shrink-0 overflow-hidden">
                    {product.image_url ? (
                      <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
                    ) : (
                      <Package className="w-6 h-6 text-gray-600" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-medium text-gray-100 truncate">{product.name}</h3>
                    <div className="flex flex-wrap items-center gap-2 mt-1">
                      {product.category && (
                        <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                          <Tag className="w-3 h-3" />
                          {product.category}
                        </span>
                      )}
                      {(!product.description?.trim() || !product.image_url?.trim()) && (
                        <span className="inline-flex items-center gap-1 text-xs text-amber-500/90" title="Ajoutez une description et/ou une image pour améliorer les réponses de l'agent">
                          <Image className="w-3 h-3" />
                          Fiche à compléter
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* SKU */}
                <div className="col-span-2">
                  <span className="text-sm font-mono text-gray-400">{product.sku || '-'}</span>
                </div>

                {/* Price & Margin */}
                <div className="col-span-2">
                  <div>
                    <span className="text-lg font-semibold text-gold-400">
                      {formatPrice(product.price)}
                    </span>
                  </div>
                  {typeof product.cost_price === 'number' && product.cost_price > 0 && (
                    <div className="mt-1 text-xs text-gray-400 space-y-0.5">
                      <div>
                        Prix achat : <span className="text-gray-300">{formatPrice(product.cost_price)}</span>
                      </div>
                      <div>
                        Marge unitaire :{' '}
                        <span className="text-emerald-400">
                          {formatPrice((product.price || 0) - (product.cost_price || 0))}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Stock */}
                <div className="col-span-2">
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium ${
                    product.stock === 0 
                      ? 'bg-red-500/20 text-red-400'
                      : product.stock <= 10
                        ? 'bg-amber-500/20 text-amber-400'
                        : 'bg-green-500/20 text-green-400'
                  }`}>
                    {product.stock === 0 ? 'Rupture' : `${product.stock} unités`}
                  </span>
                </div>

                {/* Actions */}
                <div className="col-span-2 flex items-center justify-end gap-2">
                  <button
                    onClick={() => loadHistory(product.id)}
                    className="p-2 text-gray-400 hover:text-amber-400 hover:bg-space-700 rounded-lg transition-colors"
                    title="Historique"
                  >
                    <History className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setEditingProduct(product)}
                    className="p-2 text-gray-400 hover:text-blue-400 hover:bg-space-700 rounded-lg transition-colors"
                    title="Modifier"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(product.id)}
                    className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                    title="Supprimer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {/* Add/Edit Product Modal */}
      {(showAddModal || editingProduct) && (
        <ProductModal
          product={editingProduct}
          getSymbol={getSymbol}
          onClose={() => {
            setShowAddModal(false)
            setEditingProduct(null)
          }}
          onSaved={() => {
            setShowAddModal(false)
            setEditingProduct(null)
            loadProducts()
          }}
        />
      )}

      {/* Import Modal */}
      {showImportModal && (
        <ImportModal
          onClose={() => setShowImportModal(false)}
          onImported={() => {
            setShowImportModal(false)
            loadProducts()
          }}
        />
      )}

      {/* History Modal */}
      {showHistory && (
        <HistoryModal
          history={historyList}
          loading={historyLoading}
          productId={historyProductId}
          productName={historyProductId ? products.find(p => p.id === historyProductId)?.name : null}
          formatPrice={formatPrice}
          onClose={() => {
            setShowHistory(false)
            setHistoryProductId(null)
            setHistoryList([])
          }}
        />
      )}
    </div>
  )
}

function ProductModal({ product, onClose, onSaved, getSymbol }) {
  const { t } = useTranslation()
  const [formData, setFormData] = useState({
    name: product?.name || '',
    sku: product?.sku || '',
    price: product?.price || '',
    cost_price: product?.cost_price || '',
    stock: product?.stock ?? 0,
    category: product?.category || '',
    description: product?.description || '',
    image_url: product?.image_url || ''
  })
  const [loading, setLoading] = useState(false)
  const currencySymbol = getSymbol ? getSymbol() : 'FCFA'

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!formData.name.trim()) {
      toast.error(t('messages.productNameRequired'))
      return
    }
    setLoading(true)
    try {
      if (product) {
        await api.put(`/products/${product.id}`, formData)
        toast.success(t('messages.productUpdated'))
      } else {
        await api.post('/products', formData)
        toast.success(t('messages.productAdded'))
      }
      onSaved()
    } catch (error) {
      toast.error(error.response?.data?.error || t('messages.errorGeneric'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-space-950/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-xl bg-space-900 border border-space-700 rounded-3xl shadow-2xl">
        <div className="p-6 border-b border-space-700">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-display font-semibold text-gray-100">
              {product ? 'Modifier le produit' : 'Ajouter un produit'}
            </h2>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-300">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-300 mb-2">Nom du produit *</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ex: iPhone 15 Pro"
                className="input-dark w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">SKU</label>
              <input
                type="text"
                value={formData.sku}
                onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                placeholder="Ex: IP15-PRO-256"
                className="input-dark w-full font-mono"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Catégorie</label>
              <input
                type="text"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                placeholder="Ex: Smartphones"
                className="input-dark w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Prix de vente ({currencySymbol})</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                placeholder="0.00"
                className="input-dark w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Prix d'achat ({currencySymbol})</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={formData.cost_price}
                onChange={(e) => setFormData({ ...formData, cost_price: e.target.value })}
                placeholder="0.00"
                className="input-dark w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Stock</label>
              <input
                type="number"
                min="0"
                value={formData.stock}
                onChange={(e) => setFormData({ ...formData, stock: parseInt(e.target.value) || 0 })}
                placeholder="0"
                className="input-dark w-full"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                URL de l'image
                {!formData.image_url?.trim() && (
                  <span className="ml-2 text-amber-400/90 text-xs font-normal">(recommandé)</span>
                )}
              </label>
              <input
                type="url"
                value={formData.image_url}
                onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                placeholder="https://exemple.com/image.jpg — pour le catalogue et l'agent e-commerce"
                className="input-dark w-full"
              />
              {!formData.image_url?.trim() && (
                <p className="mt-1 text-xs text-gray-500">Une image aide l'IA à présenter le produit aux clients.</p>
              )}
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Description
                {!formData.description?.trim() && (
                  <span className="ml-2 text-amber-400/90 text-xs font-normal">(recommandé)</span>
                )}
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Décrivez le produit pour que l'agent e-commerce puisse le présenter correctement aux clients (recommandé)"
                rows={3}
                className="input-dark w-full resize-none"
              />
              {!formData.description?.trim() && (
                <p className="mt-1 text-xs text-gray-500">Une description améliore les réponses de l'agent sur le catalogue.</p>
              )}
            </div>
          </div>
          <div className="flex gap-3 pt-4">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">
              Annuler
            </button>
            <button type="submit" disabled={loading} className="btn-primary flex-1">
              {loading ? 'Enregistrement...' : (product ? 'Mettre à jour' : 'Ajouter')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function ImportModal({ onClose, onImported }) {
  const { t } = useTranslation()
  const [loading, setLoading] = useState(false)
  const fileInputRef = useRef(null)

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    const formData = new FormData()
    formData.append('file', file)

    setLoading(true)
    try {
      const response = await api.post('/products/import', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      toast.success(t('messages.productsImported', { count: response.data.imported }))
      onImported()
    } catch (error) {
      toast.error(error.response?.data?.error || t('messages.errorImport'))
    } finally {
      setLoading(false)
    }
  }

  const downloadTemplate = () => {
    const template = 'name,sku,price,cost_price,stock,category,description,image_url\nProduit exemple,SKU-001,29.99,20.00,100,Catégorie,Description du produit,https://example.com/image.jpg'
    const blob = new Blob([template], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'template_produits.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-space-950/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-lg bg-space-900 border border-space-700 rounded-3xl shadow-2xl">
        <div className="p-6 border-b border-space-700">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-display font-semibold text-gray-100">
              Importer des produits
            </h2>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-300">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
        <div className="p-6 space-y-6">
          <div className="flex items-center gap-3 p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl">
            <FileSpreadsheet className="w-6 h-6 text-blue-400" />
            <div>
              <p className="text-sm font-medium text-blue-400">Format CSV</p>
              <p className="text-xs text-gray-400">Colonnes: name, sku, price, cost_price, stock, category, description, image_url</p>
            </div>
          </div>

          <button
            onClick={downloadTemplate}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-space-800 hover:bg-space-700 text-gray-300 rounded-xl transition-colors"
          >
            <Download className="w-4 h-4" />
            Télécharger le template CSV
          </button>

          <div 
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-space-600 hover:border-blue-500/50 rounded-2xl p-8 text-center cursor-pointer transition-colors"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileUpload}
              className="hidden"
            />
            <div className="w-16 h-16 bg-space-800 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Upload className="w-8 h-8 text-blue-400" />
            </div>
            <p className="text-gray-300 font-medium mb-2">
              {loading ? 'Import en cours...' : 'Cliquez pour sélectionner un fichier CSV'}
            </p>
            <p className="text-sm text-gray-500">
              ou glissez-déposez ici
            </p>
          </div>

          <button onClick={onClose} className="btn-secondary w-full">
            Fermer
          </button>
        </div>
      </div>
    </div>
  )
}

const ACTION_LABELS = {
  created: 'Création',
  updated: 'Modification',
  stock_add: 'Ajout stock',
  stock_remove: 'Sortie stock'
}

function HistoryModal({ history, loading, productId, productName, formatPrice, onClose }) {
  const formatDate = (d) => {
    if (!d) return '-'
    const date = new Date(d)
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const renderChange = (entry) => {
    const parts = []
    if (entry.quantity_change != null && entry.quantity_change !== 0) {
      const sign = entry.quantity_change > 0 ? '+' : ''
      parts.push(
        <span key="stock-qty" className="text-amber-400">
          Stock {entry.stock_before} → {entry.stock_after} ({sign}{entry.quantity_change})
        </span>
      )
    }
    if (entry.details && typeof entry.details === 'object') {
      Object.entries(entry.details).forEach(([field, [oldVal, newVal]], index) => {
        const label = { name: 'Nom', sku: 'SKU', price: 'Prix', cost_price: 'Prix d\'achat', stock: 'Stock', category: 'Catégorie' }[field] || field
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-space-950/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-2xl max-h-[85vh] flex flex-col bg-space-900 border border-space-700 rounded-3xl shadow-2xl">
        <div className="p-6 border-b border-space-700 flex-shrink-0">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-display font-semibold text-gray-100">
              {productId ? `Historique – ${productName || 'Produit'}` : 'Historique des modifications'}
            </h2>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-300">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
        <div className="p-6 overflow-y-auto flex-1 min-h-0">
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
            </div>
          ) : history.length === 0 ? (
            <p className="text-gray-500 text-center py-8">Aucune modification enregistrée.</p>
          ) : (
            <ul className="space-y-3">
              {history.map((entry) => (
                <li
                  key={entry.id}
                  className="p-4 rounded-xl bg-space-800 border border-space-700"
                >
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-blue-500/20 text-blue-400 text-sm font-medium">
                      {ACTION_LABELS[entry.action] || entry.action}
                    </span>
                    {!productId && entry.product_name && (
                      <span className="text-gray-300 font-medium">{entry.product_name}</span>
                    )}
                    <span className="text-gray-500 text-sm ml-auto">{formatDate(entry.created_at)}</span>
                  </div>
                  {renderChange(entry) && (
                    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-sm">
                      {renderChange(entry)}
                    </div>
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
