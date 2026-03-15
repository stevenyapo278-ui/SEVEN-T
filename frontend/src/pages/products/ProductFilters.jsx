import { useTranslation } from 'react-i18next'
import { Search } from 'lucide-react'
import { useTheme } from '../../contexts/ThemeContext'

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
  const { theme } = useTheme()
  const isDark = theme === 'dark'

  return (
    <div className="flex flex-col sm:flex-row gap-3 min-w-0 mb-6">
      <div className={`flex-1 flex items-center gap-3 px-4 py-3 sm:py-3.5 rounded-2xl border transition-all duration-300 ${
        isDark ? 'bg-space-800/50 border-space-700/50 focus-within:border-space-600' : 'bg-white border-gray-200 focus-within:border-gray-300'
      }`}>
        <Search className="w-5 h-5 text-gray-400" />
        <input
          id="products-search"
          type="text"
          placeholder={t('products.filterSearch')}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="bg-transparent border-none p-0 focus:ring-0 w-full text-base sm:text-lg placeholder:text-gray-500"
          aria-label={t('products.filterSearch')}
        />
      </div>
      <div className="flex flex-col sm:flex-row gap-3">
        <select
          id="products-category"
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className={`px-4 py-3 sm:py-3.5 rounded-2xl border min-w-[160px] transition-all duration-300 ${
            isDark ? 'bg-space-800 focus:bg-space-700 border-space-700 text-gray-200' : 'bg-white border-gray-200 text-gray-700'
          }`}
          aria-label={t('products.filterAllCategories')}
        >
          <option value="all">{t('products.filterAllCategories')}</option>
          {categories.map(cat => {
            const name = typeof cat === 'object' ? cat.name : cat
            const id = typeof cat === 'object' ? cat.id : cat
            return <option key={id} value={name}>{name}</option>
          })}
        </select>
        <select
          id="products-stock"
          value={stockFilter}
          onChange={(e) => setStockFilter(e.target.value)}
          className={`px-4 py-3 sm:py-3.5 rounded-2xl border min-w-[140px] transition-all duration-300 ${
            isDark ? 'bg-space-800 focus:bg-space-700 border-space-700 text-gray-200' : 'bg-white border-gray-200 text-gray-700'
          }`}
          aria-label={t('products.filterAllStock')}
        >
          <option value="all">{t('products.filterAllStock')}</option>
          <option value="in_stock">{t('products.filterInStock')}</option>
          <option value="low_stock">{t('products.filterLowStock')}</option>
          <option value="out_of_stock">{t('products.filterOutOfStock')}</option>
        </select>
      </div>
    </div>
  )
}
