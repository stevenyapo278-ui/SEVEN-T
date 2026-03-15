import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { X, Download, Upload, Loader2, FileText, CheckCircle, Info } from 'lucide-react'
import api from '../../services/api'
import toast from 'react-hot-toast'

export default function ImportModal({ onClose, onImported }) {
  const { t } = useTranslation()
  const [loading, setLoading] = useState(false)
  const fileInputRef = useRef(null)

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = 'unset' }
  }, [])

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

  return createPortal(
    <div 
      className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center p-0 lg:p-4 bg-black/80 backdrop-blur-md animate-fade-in"
      onClick={onClose}
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
              <h2 className="text-2xl font-display font-bold text-gray-100 truncate">{t('products.importTitle')}</h2>
              <p className="text-sm text-gray-500 mt-1 truncate">Importez vos produits en masse via un fichier CSV</p>
            </div>
            <button 
              type="button" 
              onClick={onClose} 
              className="p-2 -mr-2 text-gray-500 hover:text-white transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl hover:bg-white/5"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 sm:p-8 pt-0 space-y-8 custom-scrollbar overscroll-contain">
          <div className="space-y-6">
            <div className="p-5 bg-blue-500/5 border border-blue-500/10 rounded-2xl flex items-start gap-4">
              <div className="p-3 bg-blue-500/10 rounded-xl text-blue-400">
                <Info className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-bold text-blue-100">{t('products.importFormat')}</p>
                <p className="text-xs text-blue-100/60 leading-relaxed font-medium">
                  Le fichier doit inclure : name, sku, price, cost_price, stock, category, description, image_url.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
              <button 
                type="button" 
                onClick={downloadTemplate} 
                className="w-full flex items-center justify-between p-5 bg-white/5 hover:bg-white/10 text-gray-200 rounded-2xl transition-all border border-white/5 group"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-400 group-hover:scale-110 transition-transform">
                    <FileText className="w-6 h-6" />
                  </div>
                  <div className="text-left">
                    <p className="font-bold">Modèle CSV</p>
                    <p className="text-[10px] text-gray-500 uppercase font-black tracking-widest">Télécharger le template</p>
                  </div>
                </div>
                <Download className="w-5 h-5 text-gray-600 group-hover:text-white transition-colors" />
              </button>

              <div 
                onClick={() => !loading && fileInputRef.current?.click()} 
                className={`relative border-2 border-dashed rounded-[2.5rem] p-10 text-center cursor-pointer transition-all flex flex-col items-center group ${
                  loading ? 'border-gold-400/50 bg-gold-400/5' : 'border-white/5 hover:border-white/20 hover:bg-white/5'
                }`}
              >
                <input ref={fileInputRef} type="file" accept=".csv" onChange={handleFileUpload} className="hidden" />
                <div className={`w-20 h-20 rounded-3xl flex items-center justify-center mb-6 transition-all duration-500 group-hover:rotate-6 group-hover:scale-110 ${
                  loading ? 'bg-gold-400/20 text-gold-400' : 'bg-white/5 text-gray-400 group-hover:text-white group-hover:bg-white/10'
                }`}>
                  {loading ? <Loader2 className="w-10 h-10 animate-spin" /> : <Upload className="w-10 h-10" />}
                </div>
                <h3 className="text-lg font-bold text-gray-100 mb-2">
                  {loading ? 'Importation...' : 'Cliquez pour uploader'}
                </h3>
                <p className="text-sm text-gray-500 max-w-[240px] leading-relaxed">
                  Glissez-déposez votre fichier .csv ici ou parcourez vos fichiers.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex-shrink-0 p-6 sm:p-8 pt-4 border-t border-white/5 bg-black/20" style={{ paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))' }}>
          <button 
            type="button" 
            onClick={onClose} 
            className="w-full py-4 px-6 rounded-2xl font-bold text-gray-500 hover:text-white hover:bg-white/5 transition-all"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}
