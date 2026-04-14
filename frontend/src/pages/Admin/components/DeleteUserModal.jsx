import { useState } from 'react'
import { AlertTriangle, X, Loader2 } from 'lucide-react'
import AdminModal from './AdminModal'

export default function DeleteUserModal({ loading, preview, onClose, onSoftDelete, onHardDelete }) {
  const [confirmText, setConfirmText] = useState('')
  const [deleting, setDeleting] = useState(false)

  const handleHardDelete = async () => {
    setDeleting(true)
    await onHardDelete()
    setDeleting(false)
  }

  const handleSoftDelete = async () => {
    setDeleting(true)
    await onSoftDelete()
    setDeleting(false)
  }

  return (
    <AdminModal
      title="Supprimer l'utilisateur"
      subtitle="Cette action est irréversible"
      onClose={onClose}
      maxWidth="max-w-lg"
    >
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 overscroll-contain">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 text-gold-400 animate-spin" />
          </div>
        ) : preview ? (
          <div className="space-y-6">
            <div className="bg-space-800/50 border border-space-700 rounded-2xl p-4">
              <p className="text-gray-100 font-medium">{preview.user.name}</p>
              <p className="text-sm text-gray-400">{preview.user.email}</p>
            </div>

            {preview.warning && (
              <div className="flex items-start gap-3 p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl">
                <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-amber-400">{preview.warning}</p>
              </div>
            )}

            <div>
              <h3 className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-3">Données impactées</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-space-950/50 border border-space-700/50 rounded-xl p-3 text-center">
                  <p className="text-xl font-bold text-gray-100">{preview.stats.agents}</p>
                  <p className="text-[10px] text-gray-500 uppercase">Agents</p>
                </div>
                <div className="bg-space-950/50 border border-space-700/50 rounded-xl p-3 text-center">
                  <p className="text-xl font-bold text-gray-100">{preview.stats.conversations}</p>
                  <p className="text-[10px] text-gray-500 uppercase">Conv.</p>
                </div>
                <div className="bg-space-950/50 border border-space-700/50 rounded-xl p-3 text-center">
                  <p className="text-xl font-bold text-gray-100">{preview.stats.messages}</p>
                  <p className="text-[10px] text-gray-500 uppercase">Messages</p>
                </div>
                <div className="bg-space-950/50 border border-space-700/50 rounded-xl p-3 text-center">
                  <p className="text-xl font-bold text-gray-100">{preview.stats.knowledgeItems}</p>
                  <p className="text-[10px] text-gray-500 uppercase">Savoirs</p>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-3">Pour confirmer, tapez SUPPRIMER</h3>
              <input
                type="text"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="Tapez SUPPRIMER"
                className="input-dark w-full text-center font-mono uppercase min-h-[44px]"
              />
            </div>
          </div>
        ) : null}
      </div>

      <div className="p-4 sm:p-6 border-t border-space-700 bg-space-900/50 flex flex-col gap-3" style={{ paddingBottom: 'max(1.25rem, env(safe-area-inset-bottom))' }}>
        <div className="flex gap-3">
          <button
            onClick={handleSoftDelete}
            disabled={deleting || loading}
            className="flex-1 px-4 py-3 bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-xl hover:bg-amber-500/30 transition-all font-medium min-h-[48px]"
          >
            {deleting ? '...' : 'Désactiver'}
          </button>
          <button
            onClick={handleHardDelete}
            disabled={deleting || loading || confirmText !== 'SUPPRIMER'}
            className="flex-1 px-4 py-3 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-all font-medium disabled:opacity-50 min-h-[48px]"
          >
            {deleting ? '...' : 'Supprimer'}
          </button>
        </div>
      </div>
    </AdminModal>
  )
}
