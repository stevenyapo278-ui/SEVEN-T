import { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import api from '../../services/api'
import { useConfirm } from '../../contexts/ConfirmContext'
import toast from 'react-hot-toast'

export function useProducts() {
  const { t } = useTranslation()
  const { showConfirm } = useConfirm()
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [stockFilter, setStockFilter] = useState('all')
  const [categories, setCategories] = useState([]) // These are the full category objects from DB
  const [loadingCategories, setLoadingCategories] = useState(false)

  const loadCategories = useCallback(async () => {
    setLoadingCategories(true)
    try {
      const response = await api.get('/products/categories/all')
      setCategories(response.data.categories || [])
    } catch (error) {
      console.error('Error loading categories:', error)
    } finally {
      setLoadingCategories(false)
    }
  }, [])

  const loadProducts = useCallback(async () => {
    setLoadError(null)
    setLoading(true)
    try {
      const response = await api.get('/products')
      setProducts(response.data.products || [])
      // Also refresh categories to ensure we have the latest
      loadCategories()
    } catch (error) {
      const message = error.response?.data?.error || error.message || t('messages.errorLoad')
      setLoadError(message)
      toast.error(t('messages.errorLoad'))
    } finally {
      setLoading(false)
    }
  }, [t, loadCategories])

  useEffect(() => {
    loadProducts()
  }, [loadProducts])

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

  const stats = {
    total: products.length,
    inStock: products.filter(p => p.stock > 0).length,
    lowStock: products.filter(p => p.stock > 0 && p.stock <= 10).length,
    outOfStock: products.filter(p => p.stock === 0).length,
    totalValue: products.reduce((sum, p) => sum + ((p.price || 0) * (p.stock || 0)), 0),
    totalCost: products.reduce((sum, p) => sum + ((p.cost_price || 0) * (p.stock || 0)), 0)
  }
  const totalMargin = stats.totalValue - stats.totalCost

  const handleDelete = async (id) => {
    const ok = await showConfirm({
      title: t('products.deleteConfirmTitle'),
      message: t('products.deleteConfirmMessage'),
      variant: 'danger',
      confirmLabel: t('products.deleteConfirmBtn')
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

  const addCategory = async (name) => {
    try {
      const response = await api.post('/products/categories', { name })
      toast.success('Catégorie ajoutée')
      loadCategories()
      return response.data.category
    } catch (error) {
      toast.error(error.response?.data?.error || 'Erreur lors de l\'ajout')
      throw error
    }
  }

  const deleteCategory = async (id) => {
    const ok = await showConfirm({
      title: 'Supprimer la catégorie',
      message: 'Voulez-vous vraiment supprimer cette catégorie ? Cela ne supprimera pas les produits associés.',
      variant: 'danger',
      confirmLabel: 'Supprimer'
    })
    if (!ok) return
    try {
      await api.delete(`/products/categories/${id}`)
      toast.success('Catégorie supprimée')
      loadCategories()
    } catch (error) {
      toast.error('Erreur lors de la suppression')
    }
  }

  const [selectedIds, setSelectedIds] = useState([])

  const toggleSelect = (id) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    )
  }

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredProducts.length) {
      setSelectedIds([])
    } else {
      setSelectedIds(filteredProducts.map(p => p.id))
    }
  }

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return
    const ok = await showConfirm({
      title: 'Suppression en masse',
      message: `Voulez-vous vraiment supprimer les ${selectedIds.length} produits sélectionnés ?`,
      variant: 'danger',
      confirmLabel: 'Supprimer tout'
    })
    if (!ok) return

    try {
      await api.post('/products/bulk-delete', { ids: selectedIds })
      toast.success(`${selectedIds.length} produits supprimés`)
      setSelectedIds([])
      loadProducts()
    } catch (error) {
      toast.error('Erreur lors de la suppression en masse')
    }
  }

  return {
    products,
    loading,
    loadingCategories,
    loadError,
    loadProducts,
    loadCategories,
    searchQuery,
    setSearchQuery,
    categoryFilter,
    setCategoryFilter,
    stockFilter,
    setStockFilter,
    categories,
    filteredProducts,
    stats: { ...stats, totalMargin },
    handleDelete,
    addCategory,
    deleteCategory,
    selectedIds,
    toggleSelect,
    toggleSelectAll,
    handleBulkDelete
  }
}
