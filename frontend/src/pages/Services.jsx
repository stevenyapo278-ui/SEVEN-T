import { useState } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { Briefcase, Plus, Search, Filter, Loader2, RefreshCw, XCircle } from 'lucide-react'
import { useTheme } from '../contexts/ThemeContext'
import { useCurrency } from '../contexts/CurrencyContext'
import { useServices } from './services/useServices'
import ServiceList from './services/ServiceList'
import ServiceModal from './services/ServiceModal'

export default function Services() {
  const { t } = useTranslation()
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const { formatPrice, getSymbol } = useCurrency()
  
  const serviceData = useServices()
  const {
    services = [],
    loading,
    loadError,
    loadServices,
    searchQuery,
    setSearchQuery,
    categoryFilter,
    setCategoryFilter,
    categories = [],
    filteredServices = [],
    stats = { total: 0 },
    handleDelete
  } = serviceData

  const [showAddModal, setShowAddModal] = useState(false)
  const [editingService, setEditingService] = useState(null)
  const [selectedServiceView, setSelectedServiceView] = useState(null)

  return (
    <div className="max-w-full mx-auto w-full space-y-6 px-4 sm:px-6 lg:px-8 min-w-0 pb-20">
      {/* Header Hero */}
      <div className={`relative rounded-[2.5rem] border p-6 sm:p-10 mb-8 overflow-hidden ${
        isDark ? 'bg-space-900/40 border-space-700/50' : 'bg-gray-50 border-gray-200'
      }`}>
        <div className="absolute top-0 right-0 size-64 bg-gold-400/5 blur-[100px] rounded-full -mr-20 -mt-20" />
        <div className="absolute bottom-0 left-0 size-64 bg-blue-500/5 blur-[100px] rounded-full -ml-20 -mb-20" />
        
        <div className="relative z-10">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-8">
            <div className="max-w-xl">
              <div className="flex items-center gap-4 mb-4">
                <div className="p-3 bg-gold-400/20 rounded-2xl">
                  <Briefcase className="size-8 text-gold-400" />
                </div>
                <div>
                  <h1 className={`text-3xl sm:text-4xl font-display font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    {t('services.title') || 'Services'}
                  </h1>
                </div>
              </div>
              <p className={`text-lg ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                {t('services.subtitle') || 'Gérez vos prestations, tarifs et durées.'}
              </p>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="text-right hidden sm:block">
                <p className="text-sm text-gray-500 font-medium uppercase tracking-wider">{t('services.totalServices') || 'Total Services'}</p>
                <p className="text-3xl font-display font-bold text-gold-400">{stats.total}</p>
              </div>
              <button
                onClick={() => setShowAddModal(true)}
                className="btn-primary group flex items-center gap-3 px-6 py-4 rounded-2xl shadow-xl shadow-gold-500/20 hover:scale-105 transition-all duration-300"
              >
                <Plus className="size-6 group-hover:rotate-90 transition-transform duration-300" />
                <span className="font-bold">{t('services.btnAdd') || 'Ajouter un service'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Filters Bar */}
      <div className={`p-4 rounded-3xl border flex flex-col md:flex-row gap-4 items-center ${
        isDark ? 'bg-space-900/50 border-space-700/50' : 'bg-white border-gray-200 shadow-sm'
      }`}>
        <div className="input-with-icon flex-1 w-full">
          <div className="pl-3 flex items-center justify-center flex-shrink-0 text-gray-500">
            <Search className="size-5" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder={t('services.searchPlaceholder') || 'Rechercher un service...'}
          />
        </div>
        
        <div className="flex items-center gap-3 w-full md:w-auto">
          <Filter className="size-5 text-gray-500 hidden sm:block" />
          <select
            value={categoryFilter}
            onChange={e => setCategoryFilter(e.target.value)}
            className="input flex-1 md:w-48 px-4 py-3 text-sm"
          >
            <option value="all">{t('common.allCategories') || 'Toutes catégories'}</option>
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Content Area */}
      {loadError ? (
        <div className="rounded-3xl border border-red-500/30 bg-red-500/10 p-10 text-center">
          <p className="text-red-300 text-lg mb-6 font-medium">{loadError}</p>
          <button
            onClick={() => loadServices()}
            className="inline-flex items-center gap-2 px-8 py-3 bg-red-500/20 hover:bg-red-500/30 text-red-200 rounded-2xl font-bold transition-all border border-red-500/20"
          >
            <RefreshCw className="size-5" />
            {t('common.retry')}
          </button>
        </div>
      ) : loading ? (
        <div className="flex flex-col items-center justify-center py-32 gap-4">
          <div className="relative">
            <div className="size-16 border-4 border-gold-400/20 border-t-gold-400 rounded-full animate-spin" />
            <Briefcase className="size-6 text-gold-400 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
          </div>
          <p className="text-gray-500 font-medium animate-pulse">{t('common.loading')}</p>
        </div>
      ) : (filteredServices?.length === 0) ? (
        <div className="text-center py-32 px-6">
          <div className="size-24 bg-space-800/50 rounded-[2rem] flex items-center justify-center mx-auto mb-8 border border-space-700/50">
            <Briefcase className="size-12 text-gray-600" />
          </div>
          <h2 className={`text-2xl font-display font-bold mb-3 ${isDark ? 'text-white' : 'text-gray-900'}`}>
            {(services?.length === 0) ? (t('services.emptyTitle') || 'Aucun service') : (t('services.noResults') || 'Aucun résultat')}
          </h2>
          <p className="text-gray-500 text-lg max-w-sm mx-auto mb-10">
            {(services?.length === 0) 
              ? (t('services.emptyHint') || 'Commencez par ajouter votre première prestation.') 
              : (t('services.noResultsHint') || 'Essayez avec d&apos;autres mots-clés ou filtres.')}
          </p>
          {(services?.length === 0) && (
            <button
              onClick={() => setShowAddModal(true)}
              className="btn-primary px-8 py-4 rounded-2xl font-bold"
            >
              {t('services.btnAddFirst') || 'Ajouter mon premier service'}
            </button>
          )}
        </div>
      ) : (
        <ServiceList
          services={filteredServices}
          formatPrice={formatPrice}
          onEdit={setEditingService}
          onDelete={handleDelete}
          onView={setSelectedServiceView}
        />
      )}

      {/* Modals */}
      {(showAddModal || editingService) && (
        <ServiceModal
          key={editingService?.id || 'new'}
          service={editingService}
          getSymbol={getSymbol}
          onClose={() => { setShowAddModal(false); setEditingService(null) }}
          onSaved={() => { setShowAddModal(false); setEditingService(null); loadServices() }}
        />
      )}

      {/* View Modal (Overlay) */}
      {selectedServiceView && createPortal(
        <div 
          className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-4 bg-black/80 backdrop-blur-md animate-fade-in" 
          onClick={() => setSelectedServiceView(null)}
          onKeyDown={(e) => { if (e.key === 'Escape' || e.key === 'Enter') setSelectedServiceView(null); }}
          role="button"
          tabIndex={0}
          aria-label="Fermer la vue du service"
          style={{ paddingLeft: 'env(safe-area-inset-left)', paddingRight: 'env(safe-area-inset-right)' }}
        >
          <div 
            className="relative z-10 w-full max-w-lg bg-[#0B0F1A] border border-white/10 rounded-t-[2.5rem] sm:rounded-[2.5rem] shadow-2xl animate-zoomIn flex flex-col max-h-[92dvh] sm:max-h-[85vh] overflow-hidden" 
            onClick={e => e.stopPropagation()}
          >
            {/* Mobile Handle */}
            <div className="flex-shrink-0 w-full flex justify-center pt-2 pb-1 sm:hidden">
              <div className="size-12 rounded-full bg-white/10" />
            </div>

            <div className="flex-shrink-0 p-6 sm:p-8 flex justify-end" style={{ paddingTop: 'max(1.5rem, env(safe-area-inset-top))' }}>
              <button 
                onClick={() => setSelectedServiceView(null)} 
                className="p-2 -mr-2 text-gray-500 hover:text-white transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl hover:bg-white/5"
              >
                <XCircle className="size-6" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar overscroll-contain px-6 sm:px-10 pb-10" style={{ paddingBottom: 'max(2.5rem, env(safe-area-inset-bottom))' }}>
              <div className="flex flex-col">
                <div className="aspect-video rounded-3xl overflow-hidden bg-space-800 mb-8 shadow-2xl shadow-black/50">
                   {selectedServiceView.image_url ? (
                    <img src={selectedServiceView.image_url} alt={selectedServiceView.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Briefcase className="size-16 text-space-600" />
                    </div>
                  )}
                </div>
                <h3 className="text-3xl font-display font-bold text-white mb-4">{selectedServiceView.name}</h3>
                <div className="flex flex-wrap gap-3 mb-8">
                  <span className="px-4 py-1.5 rounded-full bg-gold-400/20 text-gold-400 text-sm font-bold font-mono">
                    {formatPrice(selectedServiceView.price)}
                  </span>
                  <span className="px-4 py-1.5 rounded-full bg-blue-500/20 text-blue-400 text-sm font-bold">
                    {selectedServiceView.duration} min
                  </span>
                  {selectedServiceView.category && (
                    <span className="px-4 py-1.5 rounded-full bg-white/5 text-gray-400 text-sm font-medium">
                      {selectedServiceView.category}
                    </span>
                  )}
                </div>
                <p className="text-gray-400 leading-relaxed mb-10 text-lg">{selectedServiceView.description || 'Aucune description fournie.'}</p>
                <button 
                  onClick={() => { setSelectedServiceView(null); setEditingService(selectedServiceView) }}
                  className="btn-primary py-4 rounded-2xl font-bold text-lg shadow-xl shadow-gold-500/20"
                >
                  {t('common.edit')}
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}
