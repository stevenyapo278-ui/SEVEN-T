import { useState, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { X, Download, Upload } from 'lucide-react'
import api from '../../services/api'
import toast from 'react-hot-toast'

export default function ImportModal({ onClose, onImported }) {
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
      const response = await api.post('/products/import', formData, { headers: { 'Content-Type': 'multipart/form-data' } })
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
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="fixed inset-0 bg-space-950/80 backdrop-blur-sm" onClick={onClose} aria-hidden />
      <div className="relative z-10 w-full max-w-lg max-h-[90vh] sm:max-h-[85vh] flex flex-col bg-space-900 border border-space-700 rounded-t-2xl sm:rounded-3xl shadow-2xl animate-fadeIn" role="dialog" aria-modal="true" aria-labelledby="import-modal-title">
        <div className="flex-shrink-0 p-4 sm:p-6 border-b border-space-700">
          <div className="flex items-center justify-between">
            <h2 id="import-modal-title" className="text-lg sm:text-xl font-display font-semibold text-gray-100">{t('products.importTitle')}</h2>
            <button type="button" onClick={onClose} className="p-2 -m-2 text-gray-500 hover:text-gray-300 touch-target" aria-label={t('products.importClose')}>
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto min-h-0 p-4 sm:p-6 space-y-6">
          <div className="flex items-center gap-3 p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl">
            <Upload className="w-6 h-6 text-blue-400 flex-shrink-0" aria-hidden />
            <div>
              <p className="text-sm font-medium text-blue-400">{t('products.importFormat')}</p>
              <p className="text-xs text-gray-400">{t('products.importColumns')}</p>
            </div>
          </div>
          <button type="button" onClick={downloadTemplate} className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-space-800 hover:bg-space-700 text-gray-300 rounded-xl transition-colors">
            <Download className="w-4 h-4" aria-hidden />
            {t('products.importDownloadTemplate')}
          </button>
          <div onClick={() => fileInputRef.current?.click()} className="border-2 border-dashed border-space-600 hover:border-blue-500/50 rounded-2xl p-8 text-center cursor-pointer transition-colors" role="button" tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && fileInputRef.current?.click()} aria-label={loading ? t('products.importImporting') : t('products.importClickOrDrop')}>
            <input ref={fileInputRef} type="file" accept=".csv" onChange={handleFileUpload} className="hidden" aria-hidden />
            <div className="w-16 h-16 bg-space-800 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Upload className="w-8 h-8 text-blue-400" aria-hidden />
            </div>
            <p className="text-gray-300 font-medium mb-2">{loading ? t('products.importImporting') : t('products.importClickOrDrop')}</p>
            <p className="text-sm text-gray-500">{t('products.importOrDrop')}</p>
          </div>
          <div className="flex-shrink-0 pt-4 border-t border-space-700">
            <button type="button" onClick={onClose} className="btn-secondary w-full min-h-[44px] touch-target">{t('products.importClose')}</button>
          </div>
        </div>
      </div>
    </div>
  )
}
