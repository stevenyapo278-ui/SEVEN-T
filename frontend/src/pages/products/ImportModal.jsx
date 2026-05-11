import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { X, Download, Upload, Loader2, FileText, CheckCircle, Info } from 'lucide-react'
import api from '../../services/api'
import toast from 'react-hot-toast'
import { useTheme } from '../../contexts/ThemeContext'

export default function ImportModal({ onClose, onImported }) {
  const { t } = useTranslation()
  const { isDark } = useTheme()
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
      className="fixed inset-0 z-[70] flex items-center justify-center p-4 lg:p-4 bg-black/80 backdrop-blur-md animate-fade-in"
      onClick={onClose}
      style={{ paddingLeft: 'env(safe-area-inset-left)', paddingRight: 'env(safe-area-inset-right)' }}
    >
      <div 
        className={`relative z-10 w-full max-w-lg border rounded-t-[2.5rem] sm:rounded-3xl shadow-[0_32px_128px_-16px_rgba(0,0,0,0.8)] flex flex-col max-h-[92dvh] sm:max-h-[85vh] overflow-hidden animate-slideUp sm:animate-zoomIn ${
          isDark ? 'bg-[#0B0F1A] border-white/10' : 'bg-white border-gray-200'
        }`}
        onClick={e => e.stopPropagation()}
      >
        {/* Mobile Handle */}
        <div className="flex-shrink-0 w-full flex justify-center pt-2 pb-1 sm:hidden">
          <div className={`w-12 h-1.5 rounded-full ${isDark ? 'bg-white/10' : 'bg-gray-200'}`} />
        </div>

        <div className="flex-shrink-0 p-6 sm:p-8" style={{ paddingTop: 'max(1.5rem, env(safe-area-inset-top))' }}>
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <h2 className={`text-2xl font-display font-bold truncate ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>
                {t('products.importTitle')}
              </h2>
              <p className="text-sm text-gray-500 mt-1 truncate">Importez vos produits en masse via un fichier CSV</p>
            </div>
            <button 
              type="button" 
              onClick={onClose} 
              className={`p-2 -mr-2 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl ${
                isDark ? 'text-gray-500 hover:text-white hover:bg-white/5' : 'text-gray-400 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 sm:p-8 pt-0 space-y-8 custom-scrollbar overscroll-contain">
          <div className="space-y-6">
            <div className={`p-5 rounded-2xl flex items-start gap-4 border ${
              isDark ? 'bg-blue-500/5 border-blue-500/10' : 'bg-blue-50 border-blue-100'
            }`}>
              <div className={`p-3 rounded-xl ${isDark ? 'bg-blue-500/10 text-blue-400' : 'bg-blue-100 text-blue-600'}`}>
                <Info className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <p className={`text-sm font-bold ${isDark ? 'text-blue-100' : 'text-blue-900'}`}>
                  {t('products.importFormat', 'Format du fichier')}
                </p>
                <div className={`text-xs leading-relaxed font-medium space-y-2 break-words ${
                  isDark ? 'text-blue-100/60' : 'text-blue-800/70'
                }`}>
                  <p>Déposez l'export brut depuis <strong className={isDark ? 'text-blue-300' : 'text-blue-600'}>WhatsApp Business</strong> (Retailer ID, Name, Sale price, etc.)</p>
                  <p>Ou utilisez notre format standard : name, sku, price, cost_price, stock, category, description, image_url.</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
              <button 
                type="button" 
                onClick={downloadTemplate} 
                className={`w-full flex items-center justify-between p-5 rounded-2xl transition-all border group ${
                  isDark ? 'bg-white/5 hover:bg-white/10 text-gray-200 border-white/5' : 'bg-gray-50 hover:bg-gray-100 text-gray-900 border-gray-200'
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform ${
                    isDark ? 'bg-purple-500/10 text-purple-400' : 'bg-purple-50 text-purple-600'
                  }`}>
                    <FileText className="w-6 h-6" />
                  </div>
                  <div className="text-left">
                    <p className="font-bold">Modèle CSV</p>
                    <p className="text-[10px] text-gray-500 uppercase font-black tracking-widest">Télécharger le template</p>
                  </div>
                </div>
                <Download className={`w-5 h-5 transition-colors ${isDark ? 'text-gray-600 group-hover:text-white' : 'text-gray-400 group-hover:text-gray-900'}`} />
              </button>

              <div 
                onClick={() => !loading && fileInputRef.current?.click()} 
                className={`relative border-2 border-dashed rounded-[2.5rem] p-10 text-center cursor-pointer transition-all flex flex-col items-center group ${
                  loading 
                    ? 'border-gold-400/50 bg-gold-400/5' 
                    : isDark 
                      ? 'border-white/5 hover:border-white/20 hover:bg-white/5' 
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                }`}
              >
                <input ref={fileInputRef} type="file" accept=".csv" onChange={handleFileUpload} className="hidden" />
                <div className={`w-20 h-20 rounded-3xl flex items-center justify-center mb-6 transition-all duration-500 group-hover:rotate-6 group-hover:scale-110 ${
                  loading 
                    ? 'bg-gold-400/20 text-gold-400' 
                    : isDark 
                      ? 'bg-white/5 text-gray-400 group-hover:text-white group-hover:bg-white/10' 
                      : 'bg-gray-100 text-gray-400 group-hover:text-gray-900 group-hover:bg-gray-200'
                }`}>
                  {loading ? <Loader2 className="w-10 h-10 animate-spin" /> : <Upload className="w-10 h-10" />}
                </div>
                <h3 className={`text-lg font-bold mb-2 ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>
                  {loading ? 'Importation...' : 'Cliquez pour uploader'}
                </h3>
                <p className="text-sm text-gray-500 max-w-[240px] leading-relaxed">
                  Glissez-déposez votre fichier .csv ici ou parcourez vos fichiers.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className={`flex-shrink-0 p-6 sm:p-8 pt-4 border-t ${
          isDark ? 'border-white/5 bg-black/20' : 'border-gray-100 bg-gray-50/50'
        }`} style={{ paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))' }}>
          <button 
            type="button" 
            onClick={onClose} 
            className={`w-full py-4 px-6 rounded-2xl font-bold transition-all ${
              isDark ? 'text-gray-500 hover:text-white hover:bg-white/5' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'
            }`}
          >
            Fermer
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}
