import { useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { X, Upload, Loader2 } from 'lucide-react'
import api from '../../services/api'
import toast from 'react-hot-toast'
import { getProductImageUrl } from './utils'

const MAX_PRODUCT_IMAGES = 4

export default function ProductModal({ product, onClose, onSaved, getSymbol }) {
  const { t } = useTranslation()
  const fileInputRef = useRef(null)
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
  const [productImages, setProductImages] = useState(() => {
    const u = product?.image_url?.trim()
    return u ? [{ url: u }] : []
  })
  const [loading, setLoading] = useState(false)
  const [imageUploading, setImageUploading] = useState(false)
  const [newImageUrl, setNewImageUrl] = useState('')
  const currencySymbol = getSymbol ? getSymbol() : 'FCFA'

  useEffect(() => {
    if (!product?.id) return
    let cancelled = false
    api.get(`/products/${product.id}/images`)
      .then((res) => {
        if (cancelled) return
        const extra = (res.data?.images || []).map((img) => ({ id: img.id, url: img.url }))
        const primary = product.image_url?.trim()
        let list = primary ? [{ url: primary }, ...extra.filter((e) => e.url !== primary)] : extra
        list = list.slice(0, MAX_PRODUCT_IMAGES)
        setProductImages(list.length ? list : [])
      })
      .catch(() => { if (!cancelled) setProductImages(product?.image_url ? [{ url: product.image_url }] : []) })
    return () => { cancelled = true }
  }, [product?.id])

  const addImageUrl = (url) => {
    const u = (url ?? newImageUrl)?.trim()
    if (!u) return
    if (productImages.length >= MAX_PRODUCT_IMAGES) {
      toast.error(t('products.toastMaxPhotos', { max: MAX_PRODUCT_IMAGES }))
      return
    }
    setProductImages((prev) => [...prev, { url: u }])
    setNewImageUrl('')
  }

  const removeImage = (index) => {
    setProductImages((prev) => prev.filter((_, i) => i !== index))
  }

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (productImages.length >= MAX_PRODUCT_IMAGES) {
      toast.error(t('products.toastMaxPhotos', { max: MAX_PRODUCT_IMAGES }))
      e.target.value = ''
      return
    }
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
    if (!allowed.includes(file.type)) {
      toast.error(t('products.toastUnsupportedFormat'))
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error(t('products.toastImageTooBig'))
      return
    }
    setImageUploading(true)
    try {
      const fd = new FormData()
      fd.append('image', file)
      const { data } = await api.post('/products/upload-image', fd)
      if (data?.url) {
        setProductImages((prev) => [...prev, { url: data.url }])
        toast.success(t('products.toastPhotoImported'))
      }
    } catch (err) {
      toast.error(err.response?.data?.error || t('products.toastPhotoImportError'))
    } finally {
      setImageUploading(false)
      e.target.value = ''
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!formData.name.trim()) {
      toast.error(t('messages.productNameRequired'))
      return
    }
    const primaryUrl = productImages[0]?.url?.trim() || ''
    const payload = { ...formData, image_url: primaryUrl }
    setLoading(true)
    try {
      if (product) {
        await api.put(`/products/${product.id}`, payload)
        const toAdd = productImages.slice(1).filter((i) => !i.id)
        for (const img of (await api.get(`/products/${product.id}/images`)).data?.images || []) {
          if (!productImages.slice(1).map((i) => i.id).filter(Boolean).includes(img.id)) {
            await api.delete(`/products/${product.id}/images/${img.id}`)
          }
        }
        for (const item of toAdd) {
          await api.post(`/products/${product.id}/images`, { url: item.url, is_primary: false })
        }
        toast.success(t('messages.productUpdated'))
      } else {
        const { data } = await api.post('/products', payload)
        const newId = data?.product?.id || data?.id
        if (newId && productImages.length > 1) {
          for (let i = 1; i < productImages.length; i++) {
            await api.post(`/products/${newId}/images`, { url: productImages[i].url, is_primary: false })
          }
        }
        toast.success(t('messages.productAdded'))
      }
      onSaved()
    } catch (error) {
      toast.error(error.response?.data?.error || t('messages.errorGeneric'))
    } finally {
      setLoading(false)
    }
  }

  const title = product ? t('products.modalEdit') : t('products.modalAdd')
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" style={{ paddingLeft: 'env(safe-area-inset-left)', paddingRight: 'env(safe-area-inset-right)' }}>
      <div className="fixed inset-0 bg-space-950/80 backdrop-blur-sm" onClick={onClose} aria-hidden />
      <div className="relative z-10 w-full max-w-xl max-h-[90vh] sm:max-h-[80vh] flex flex-col bg-space-900 border border-space-700 rounded-t-2xl sm:rounded-3xl shadow-2xl min-w-0 animate-fadeIn max-sm:rounded-b-none" role="dialog" aria-modal="true" aria-labelledby="product-modal-title">
        <div className="flex-shrink-0 p-4 sm:p-6 border-b border-space-700" style={{ paddingTop: 'max(1rem, env(safe-area-inset-top))' }}>
          <div className="flex items-center justify-between gap-2 min-w-0">
            <h2 id="product-modal-title" className="text-lg sm:text-xl font-display font-semibold text-gray-100 truncate">{title}</h2>
            <button type="button" onClick={onClose} className="p-2 -m-2 min-w-[44px] min-h-[44px] flex items-center justify-center text-gray-500 hover:text-gray-300 touch-target flex-shrink-0 rounded-lg" aria-label={t('products.modalClose')}>
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
          <div className="flex-1 overflow-y-auto min-h-0 overscroll-contain p-4 sm:p-6 pb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="col-span-1 md:col-span-2 min-w-0">
                <label htmlFor="product-name" className="block text-sm font-medium text-gray-300 mb-2">{t('products.modalNameLabel')}</label>
                <input
                  id="product-name"
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder={t('products.modalNamePlaceholder')}
                  className="input-dark w-full min-w-0 min-h-[44px] touch-target"
                />
              </div>
              <div className="min-w-0">
                <label htmlFor="product-sku" className="block text-sm font-medium text-gray-300 mb-2">{t('products.modalSkuLabel')}</label>
                <input id="product-sku" type="text" value={formData.sku} onChange={(e) => setFormData({ ...formData, sku: e.target.value })} placeholder={t('products.modalSkuPlaceholder')} className="input-dark w-full min-w-0 min-h-[44px] touch-target font-mono" />
              </div>
              <div className="min-w-0">
                <label htmlFor="product-category" className="block text-sm font-medium text-gray-300 mb-2">{t('products.modalCategoryLabel')}</label>
                <input id="product-category" type="text" value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })} placeholder={t('products.modalCategoryPlaceholder')} className="input-dark w-full min-w-0 min-h-[44px] touch-target" />
              </div>
              <div className="min-w-0">
                <label htmlFor="product-price" className="block text-sm font-medium text-gray-300 mb-2">{t('products.modalPriceLabel')} ({currencySymbol})</label>
                <input id="product-price" type="number" step="0.01" min="0" value={formData.price} onChange={(e) => setFormData({ ...formData, price: e.target.value })} placeholder="0.00" className="input-dark w-full min-w-0 min-h-[44px] touch-target" />
              </div>
              <div className="min-w-0">
                <label htmlFor="product-cost-price" className="block text-sm font-medium text-gray-300 mb-2">{t('products.modalCostPriceLabel')} ({currencySymbol})</label>
                <input id="product-cost-price" type="number" step="0.01" min="0" value={formData.cost_price} onChange={(e) => setFormData({ ...formData, cost_price: e.target.value })} placeholder="0.00" className="input-dark w-full min-w-0 min-h-[44px] touch-target" />
              </div>
              <div className="min-w-0">
                <label htmlFor="product-stock" className="block text-sm font-medium text-gray-300 mb-2">{t('products.modalStockLabel')}</label>
                <input id="product-stock" type="number" min="0" value={formData.stock} onChange={(e) => setFormData({ ...formData, stock: parseInt(e.target.value) || 0 })} placeholder="0" className="input-dark w-full min-w-0 min-h-[44px] touch-target" />
              </div>
              <div className="col-span-1 md:col-span-2 min-w-0">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  {t('products.modalPhotosLabel')}
                  {productImages.length === 0 && <span className="ml-2 text-amber-400/90 text-xs font-normal">{t('products.modalPhotosRecommended')}</span>}
                </label>
                <p className="text-xs text-gray-500 mb-2">{t('products.modalPhotosHint', { max: MAX_PRODUCT_IMAGES })}</p>
                {productImages.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-3">
                    {productImages.map((img, index) => (
                      <div key={index} className="relative group">
                        <img src={getProductImageUrl(img.url)} alt="" className="w-16 h-16 rounded-lg object-cover border border-space-600" />
                        <button type="button" onClick={() => removeImage(index)} className="absolute -top-1.5 -right-1.5 min-w-[44px] min-h-[44px] w-11 h-11 sm:w-5 sm:h-5 sm:min-w-0 sm:min-h-0 rounded-full bg-red-500/90 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity touch-target" aria-label={t('products.modalPhotoRemove')}>
                          <X className="w-3 h-3" />
                        </button>
                        {index === 0 && <span className="absolute bottom-0 left-0 right-0 text-[10px] bg-gold-400/90 text-space-900 text-center rounded-b-lg">{t('products.modalPhotoPrimary')}</span>}
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex flex-col gap-2">
                  <input type="url" value={newImageUrl} onChange={(e) => setNewImageUrl(e.target.value)} placeholder={t('products.modalPhotoUrlPlaceholder')} className="input-dark w-full min-w-0 min-h-[44px] touch-target" disabled={productImages.length >= MAX_PRODUCT_IMAGES} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addImageUrl(newImageUrl) } }} aria-label={t('products.modalPhotoUrlPlaceholder')} />
                  <div className="flex flex-col md:flex-row gap-2">
                    <button type="button" onClick={() => productImages.length < MAX_PRODUCT_IMAGES && fileInputRef.current?.click()} disabled={imageUploading || productImages.length >= MAX_PRODUCT_IMAGES} className="btn-secondary inline-flex items-center justify-center gap-2 min-h-[44px] touch-target px-4 disabled:opacity-50">
                      {imageUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                      {imageUploading ? t('products.modalPhotoImporting') : t('products.modalPhotoImport')}
                    </button>
                    <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={handleImageUpload} className="hidden" aria-hidden />
                    <button type="button" onClick={() => addImageUrl(newImageUrl)} disabled={productImages.length >= MAX_PRODUCT_IMAGES} className="btn-secondary min-h-[44px] touch-target px-4 whitespace-nowrap disabled:opacity-50">{t('products.modalPhotoAddUrl')}</button>
                  </div>
                  {productImages.length === 0 && <p className="mt-1 text-xs text-gray-500">{t('products.modalPhotoHint')}</p>}
                </div>
              </div>
              <div className="col-span-1 md:col-span-2 min-w-0">
                <label htmlFor="product-description" className="block text-sm font-medium text-gray-300 mb-2">
                  {t('products.modalDescriptionLabel')}
                  {!formData.description?.trim() && <span className="ml-2 text-amber-400/90 text-xs font-normal">{t('products.modalPhotosRecommended')}</span>}
                </label>
                <textarea id="product-description" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder={t('products.modalDescriptionPlaceholder')} rows={3} className="input-dark w-full min-w-0 resize-none min-h-[88px]" />
                {!formData.description?.trim() && <p className="mt-1 text-xs text-gray-500">{t('products.modalDescriptionHint')}</p>}
              </div>
            </div>
          </div>
          <div className="flex-shrink-0 p-4 sm:p-6 pt-3 border-t border-space-700 flex flex-col-reverse md:flex-row gap-3" style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}>
            <button type="button" onClick={onClose} className="btn-secondary flex-1 md:flex-none min-h-[48px] touch-target">{t('products.modalCancel')}</button>
            <button type="submit" disabled={loading} className="btn-primary flex-1 md:flex-none min-h-[48px] touch-target">{loading ? t('products.modalSaving') : (product ? t('products.modalSave') : t('products.modalCreate'))}</button>
          </div>
        </form>
      </div>
    </div>
  )
}
