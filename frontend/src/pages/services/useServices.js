import { useState, useEffect, useCallback } from 'react'
import api from '../../services/api'
import toast from 'react-hot-toast'
import { useTranslation } from 'react-i18next'
import { useConfirm } from '../../contexts/ConfirmContext'

export function useServices() {
  const { t } = useTranslation()
  const { showConfirm } = useConfirm()
  const [services, setServices] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)
  
  // Filters
  const [searchQuery, setSearchQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')

  const loadServices = useCallback(async () => {
    setLoading(true)
    setLoadError(null)
    try {
      const { data } = await api.get('/services')
      setServices(data.services || [])
    } catch (error) {
      console.error('Error loading services:', error)
      setLoadError(t('messages.errorLoadingServices') || 'Erreur lors du chargement des services')
    } finally {
      setLoading(false)
    }
  }, [t])

  useEffect(() => {
    loadServices()
  }, [loadServices])

  const handleDelete = async (id) => {
    const ok = await showConfirm({
      title: t('services.deleteConfirmTitle') || t('common.delete'),
      message: t('messages.confirmDeleteService') || 'Êtes-vous sûr de vouloir supprimer ce service ?',
      variant: 'danger',
      confirmLabel: t('common.delete')
    })
    
    if (!ok) return
    
    try {
      await api.delete(`/services/${id}`)
      setServices(prev => prev.filter(s => s.id !== id))
      toast.success(t('messages.serviceDeleted') || 'Service supprimé')
    } catch (error) {
      toast.error(t('messages.errorDeletingService') || 'Erreur lors de la suppression')
    }
  }

  const categories = [...new Set(services.map(s => s.category).filter(Boolean))]

  const filteredServices = services.filter(service => {
    const matchesSearch = service.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         (service.description && service.description.toLowerCase().includes(searchQuery.toLowerCase()))
    const matchesCategory = categoryFilter === 'all' || service.category === categoryFilter
    return matchesSearch && matchesCategory
  })

  const stats = {
    total: services.length,
    active: services.filter(s => s.is_active).length,
    categories: categories.length
  }

  return {
    services,
    loading,
    loadError,
    loadServices,
    searchQuery,
    setSearchQuery,
    categoryFilter,
    setCategoryFilter,
    categories,
    filteredServices,
    stats,
    handleDelete
  }
}
