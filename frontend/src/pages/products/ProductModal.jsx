import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { X, Upload, Loader2, Package, Tag, CreditCard, Layout, Plus, Trash2, Link2, Type, Hash, Layers } from 'lucide-react'
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
  }, [product?.id, product?.image_url])

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

  return createPortal(
    <div 
      className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center p-0 lg:p-4 bg-black/80 backdrop-blur-md animate-fade-in"
      onClick={onClose}
      style={{ paddingLeft: 'env(safe-area-inset-left)', paddingRight: 'env(safe-area-inset-right)' }}
    >
      <div 
        className="relative z-10 w-full max-w-2xl bg-[#0B0F1A] border border-white/10 rounded-t-[2.5rem] sm:rounded-3xl shadow-[0_32px_128px_-16px_rgba(0,0,0,0.8)] flex flex-col max-h-[92dvh] sm:max-h-[85vh] overflow-hidden animate-slideUp sm:animate-zoomIn" 
        onClick={e => e.stopPropagation()}
      >
        {/* Mobile Handle */}
        <div className="flex-shrink-0 w-full flex justify-center pt-2 pb-1 sm:hidden">
          <div className="w-12 h-1.5 rounded-full bg-white/10" />
        </div>

        <div className="flex-shrink-0 p-6 sm:p-8" style={{ paddingTop: 'max(1.5rem, env(safe-area-inset-top))' }}>
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <h2 className="text-2xl font-display font-bold text-gray-100 truncate">{title}</h2>
              <p className="text-sm text-gray-500 mt-1 truncate">{product ? 'Modifier l\'article' : 'Ajouter un nouveau produit'}</p>
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

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <div className="flex-1 overflow-y-auto p-6 sm:p-8 pt-0 space-y-10 custom-scrollbar overscroll-contain">
            {/* General Info */}
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Nom du produit *</label>
                <div className="relative group">
                  <Type className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="input-dark w-full pl-12 py-4 px-5 text-base rounded-2xl"
                    placeholder="Ex: iPhone 15 Pro Max"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">SKU / Référence</label>
                  <div className="relative">
                    <Hash className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <input
                      type="text"
                      value={formData.sku}
                      onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                      className="input-dark w-full pl-12 py-4 px-5 font-mono text-sm rounded-2xl"
                      placeholder="IPH15-PRO-BK"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Catégorie</label>
                  <div className="relative">
                    <Layers className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <input
                      type="text"
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      className="input-dark w-full pl-12 py-4 px-5 text-base rounded-2xl"
                      placeholder="High-Tech, Mode..."
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Prix de vente</label>
                  <div className="relative">
                    <CreditCard className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-400/50" />
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                      className="input-dark w-full pl-12 py-4 px-5 font-mono font-bold text-emerald-400 rounded-2xl"
                      placeholder={`0 ${currencySymbol}`}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Prix d'achat</label>
                  <div className="relative">
                    <Tag className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.cost_price}
                      onChange={(e) => setFormData({ ...formData, cost_price: e.target.value })}
                      className="input-dark w-full pl-12 py-4 px-5 font-mono rounded-2xl"
                      placeholder={`0 ${currencySymbol}`}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Stock initial</label>
                  <div className="relative">
                    <Package className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <input
                      type="number"
                      min="0"
                      value={formData.stock}
                      onChange={(e) => setFormData({ ...formData, stock: parseInt(e.target.value) || 0 })}
                      className="input-dark w-full pl-12 py-4 px-5 font-mono rounded-2xl"
                      placeholder="0"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Photos Section */}
            <div className="space-y-6">
              <div className="flex items-center justify-between px-1">
                <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest">Photos du produit</label>
                <span className="text-[10px] font-black text-gray-600 bg-white/5 px-2 py-0.5 rounded-full">
                  {productImages.length} / {MAX_PRODUCT_IMAGES}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {productImages.map((img, index) => (
                  <div key={index} className="relative aspect-square group">
                    <img src={getProductImageUrl(img.url)} alt="" className="w-full h-full rounded-2xl object-cover border-2 border-white/5 transition-all group-hover:border-white/10" />
                    <button 
                      type="button" 
                      onClick={() => removeImage(index)} 
                      className="absolute -top-2 -right-2 w-7 h-7 bg-red-500 text-white rounded-full flex items-center justify-center shadow-lg hover:scale-110 active:scale-90 transition-transform z-10"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    {index === 0 && (
                      <div className="absolute inset-x-0 bottom-0 py-1 bg-emerald-500/80 backdrop-blur-sm text-[8px] font-black text-white text-center rounded-b-2xl uppercase tracking-tighter">
                        Photo principale
                      </div>
                    )}
                  </div>
                ))}
                {productImages.length < MAX_PRODUCT_IMAGES && (
                  <button
                    type="button"
                    onClick={() => !imageUploading && fileInputRef.current?.click()}
                    disabled={imageUploading}
                    className="aspect-square rounded-2xl border-2 border-dashed border-white/10 hover:border-white/20 hover:bg-white/5 transition-all flex flex-col items-center justify-center gap-2 text-gray-500 group"
                  >
                    <div className="p-3 bg-white/5 rounded-xl group-hover:bg-white/10 transition-colors">
                      {imageUploading ? <Loader2 className="w-6 h-6 animate-spin text-gold-400" /> : <Upload className="w-6 h-6" />}
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-widest">Uploader</span>
                  </button>
                )}
              </div>

              <div className="relative">
                <input 
                  type="url" 
                  value={newImageUrl} 
                  onChange={(e) => setNewImageUrl(e.target.value)} 
                  placeholder="Ou collez l'URL d'une image ici..." 
                  className="input-dark w-full py-4 pl-12 pr-28 text-sm rounded-2xl" 
                  disabled={productImages.length >= MAX_PRODUCT_IMAGES}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addImageUrl(newImageUrl) } }} 
                />
                <Link2 className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <button 
                  type="button" 
                  onClick={() => addImageUrl(newImageUrl)} 
                  disabled={productImages.length >= MAX_PRODUCT_IMAGES || !newImageUrl.trim()} 
                  className="absolute right-2 top-2 bottom-2 px-4 rounded-xl bg-white text-black font-bold text-xs hover:bg-gold-400 transition-all disabled:opacity-0"
                >
                  Ajouter
                </button>
              </div>
              <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={handleImageUpload} className="hidden" />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Description produit</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="input-dark w-full min-h-[120px] py-4 px-5 rounded-3xl resize-none text-gray-300 leading-relaxed custom-scrollbar"
                placeholder="Détails techniques, garanties, caractéristiques..."
              />
            </div>
          </div>

          <div className="flex-shrink-0 p-6 sm:p-8 pt-4 border-t border-white/5 bg-black/20 flex flex-col-reverse sm:flex-row gap-3" style={{ paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))' }}>
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 py-4 px-6 rounded-2xl font-bold text-gray-500 hover:text-white hover:bg-white/5 transition-all text-center"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-4 px-8 bg-white text-black rounded-2xl font-syne font-black italic uppercase tracking-tight hover:bg-gold-400 transition-all hover:scale-[1.02] active:scale-[0.98] shadow-xl flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
              {loading ? 'Enregistrement...' : product ? 'Mettre à jour' : 'Ajouter le produit'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  )
}
