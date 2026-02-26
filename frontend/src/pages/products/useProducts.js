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
  const [categories, setCategories] = useState([])

  const loadProducts = useCallback(async () => {
    setLoadError(null)
    setLoading(true)
    try {
      const response = await api.get('/products')
      setProducts(response.data.products || [])
      const uniqueCategories = [...new Set(response.data.products?.map(p => p.category).filter(Boolean))]
      setCategories(uniqueCategories)
    } catch (error) {
      const message = error.response?.data?.error || error.message || t('messages.errorLoad')
      setLoadError(message)
      toast.error(t('messages.errorLoad'))
    } finally {
      setLoading(false)
    }
  }, [t])

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

  return {
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
    stats: { ...stats, totalMargin },
    handleDelete
  }
}
