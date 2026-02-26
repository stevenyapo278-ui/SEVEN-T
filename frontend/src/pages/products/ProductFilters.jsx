import { useTranslation } from 'react-i18next'
import { Search } from 'lucide-react'

export default function ProductFilters({
  searchQuery,
  setSearchQuery,
  categoryFilter,
  setCategoryFilter,
  stockFilter,
  setStockFilter,
  categories
}) {
  const { t } = useTranslation()
  return (
    <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 min-w-0">
      <div className="input-with-icon flex-1 min-w-0">
        <div className="pl-3 flex items-center justify-center flex-shrink-0 text-gray-500" aria-hidden>
          <Search className="w-5 h-5" />
        </div>
        <input
          id="products-search"
          type="text"
          placeholder={t('products.filterSearch')}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="min-h-[44px] touch-target text-base"
          aria-label={t('products.filterSearch')}
        />
      </div>
      <select
        id="products-category"
        value={categoryFilter}
        onChange={(e) => setCategoryFilter(e.target.value)}
        className="input-dark w-full sm:w-auto sm:min-w-[160px] min-h-[44px] touch-target"
        aria-label={t('products.filterAllCategories')}
      >
        <option value="all">{t('products.filterAllCategories')}</option>
        {categories.map(cat => (
          <option key={cat} value={cat}>{cat}</option>
        ))}
      </select>
      <select
        id="products-stock"
        value={stockFilter}
        onChange={(e) => setStockFilter(e.target.value)}
        className="input-dark w-full sm:w-auto sm:min-w-[140px] min-h-[44px] touch-target"
        aria-label={t('products.filterAllStock')}
      >
        <option value="all">{t('products.filterAllStock')}</option>
        <option value="in_stock">{t('products.filterInStock')}</option>
        <option value="low_stock">{t('products.filterLowStock')}</option>
        <option value="out_of_stock">{t('products.filterOutOfStock')}</option>
      </select>
    </div>
  )
}
