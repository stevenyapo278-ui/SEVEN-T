import { useState } from 'react'
import { createPortal } from 'react-dom'
import { X, Plus, Trash2, Loader2, Layers, Tag as TagIcon } from 'lucide-react'

export default function CategoryModal({ categories, loading, onAdd, onDelete, onClose }) {
  const [newName, setNewName] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!newName.trim() || isSubmitting) return
    setIsSubmitting(true)
    try {
      await onAdd(newName.trim())
      setNewName('')
    } finally {
      setIsSubmitting(false)
    }
  }

  return createPortal(
    <div 
      className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center p-0 lg:p-4 bg-black/80 backdrop-blur-md animate-fade-in"
      onClick={onClose}
    >
      <div 
        className="relative z-10 w-full max-w-lg bg-[#0B0F1A] border border-white/10 rounded-t-[2.5rem] sm:rounded-3xl shadow-[0_32px_128px_-16px_rgba(0,0,0,0.8)] flex flex-col max-h-[92dvh] sm:max-h-[85vh] overflow-hidden animate-slideUp sm:animate-zoomIn"
        onClick={e => e.stopPropagation()}
      >
        {/* Mobile Handle */}
        <div className="flex-shrink-0 w-full flex justify-center pt-2 pb-1 sm:hidden">
          <div className="w-12 h-1.5 rounded-full bg-white/10" />
        </div>

        <div className="flex-shrink-0 p-6 sm:p-8">
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <h2 className="text-2xl font-display font-bold text-gray-100 truncate">Catégories</h2>
              <p className="text-sm text-gray-500 mt-1">Gérez les catégories de vos produits</p>
            </div>
            <button 
              onClick={onClose} 
              className="p-2 -mr-2 text-gray-500 hover:text-white transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl hover:bg-white/5"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 sm:p-8 pt-0 space-y-8 custom-scrollbar overscroll-contain">
          {/* Add Form */}
          <form onSubmit={handleSubmit} className="relative group">
            <div className="space-y-2">
              <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Nouvelle catégorie</label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Layers className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input
                    type="text"
                    required
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className="input-dark w-full pl-12 py-4 pr-5 text-base rounded-2xl"
                    placeholder="Ex: Électronique"
                    disabled={isSubmitting}
                  />
                </div>
                <button
                  type="submit"
                  disabled={!newName.trim() || isSubmitting}
                  className="px-6 rounded-2xl bg-white text-black font-syne font-black italic uppercase tracking-tight hover:bg-gold-400 transition-all disabled:opacity-50 flex items-center justify-center"
                >
                  {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
                </button>
              </div>
            </div>
          </form>

          {/* List */}
          <div className="space-y-3">
            <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Existantes ({categories.length})</label>
            {loading ? (
              <div className="flex justify-center py-10">
                <Loader2 className="w-8 h-8 animate-spin text-gold-400" />
              </div>
            ) : categories.length === 0 ? (
              <div className="text-center py-10 border-2 border-dashed border-white/5 rounded-3xl">
                <TagIcon className="w-8 h-8 text-gray-700 mx-auto mb-3" />
                <p className="text-gray-500 text-sm">Aucune catégorie créée</p>
              </div>
            ) : (
              <div className="grid gap-2">
                {categories.map((cat) => (
                  <div 
                    key={cat.id}
                    className="flex items-center justify-between p-4 bg-white/5 border border-white/5 rounded-2xl group hover:border-white/10 transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400">
                        <Layers className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-gray-100 truncate">{cat.name}</p>
                        <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest">{cat.product_count || 0} produits</p>
                      </div>
                    </div>
                    <button
                      onClick={() => onDelete(cat.id)}
                      className="p-2 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex-shrink-0 p-6 sm:p-8 pt-4 border-t border-white/5 bg-black/20" style={{ paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))' }}>
          <button
            type="button"
            onClick={onClose}
            className="w-full py-4 px-6 rounded-2xl font-bold bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 transition-all"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}
