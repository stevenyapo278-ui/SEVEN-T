import { useState } from 'react'
import { createPortal } from 'react-dom'
import { AlertTriangle } from 'lucide-react'

export default function ConfirmActionModal({ message, keyword, onConfirm, onCancel }) {
  const [inputValue, setInputValue] = useState('')
  const [confirming, setConfirming] = useState(false)
  
  const isValid = inputValue.toUpperCase() === keyword.toUpperCase()

  const handleConfirm = async () => {
    if (!isValid) return
    setConfirming(true)
    await onConfirm()
    setConfirming(false)
  }

  return createPortal(
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 sm:p-4" style={{ paddingLeft: 'env(safe-area-inset-left)', paddingRight: 'env(safe-area-inset-right)' }}>
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm" aria-hidden />
      <div className="relative z-10 w-full max-w-md bg-space-900 border border-space-700 rounded-t-3xl sm:rounded-2xl shadow-2xl animate-fadeIn flex flex-col overflow-hidden">
        <div className="p-6 sm:p-8" style={{ paddingTop: 'max(1.5rem, env(safe-area-inset-top))', paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))' }}>
          <div className="flex justify-center mb-6">
            <div className="w-20 h-20 bg-yellow-500/20 rounded-full flex items-center justify-center">
              <AlertTriangle className="w-10 h-10 text-yellow-400" />
            </div>
          </div>
          
          <h3 className="text-2xl font-display font-bold text-gray-100 text-center mb-2">
            Confirmation
          </h3>
          
          <p className="text-gray-400 text-center mb-8">
            {message}
          </p>
          
          <div className="mb-8">
            <label className="block text-sm font-medium text-gray-300 mb-3 text-center">
              Tapez <span className="font-bold text-yellow-400 uppercase">{keyword}</span> pour confirmer
            </label>
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              className="input-dark w-full text-center text-xl font-mono uppercase min-h-[56px] tracking-widest"
              autoFocus
            />
          </div>
          
          <div className="flex gap-4">
            <button 
              onClick={onCancel}
              className="flex-1 btn-secondary min-h-[56px]"
              disabled={confirming}
            >
              Annuler
            </button>
            <button 
              onClick={handleConfirm}
              disabled={!isValid || confirming}
              className={`flex-1 rounded-xl font-bold min-h-[56px] transition-all ${
                isValid 
                  ? 'bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-600/20' 
                  : 'bg-space-800 text-gray-600 cursor-not-allowed'
              }`}
            >
              {confirming ? '...' : 'Confirmer'}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}
