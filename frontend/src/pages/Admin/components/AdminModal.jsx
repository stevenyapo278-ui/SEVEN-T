import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { useLockBodyScroll } from '../../../hooks/useLockBodyScroll'

export default function AdminModal({ 
  children, 
  title, 
  subtitle, 
  onClose, 
  maxWidth = 'max-w-md',
  showClose = true,
  headerAddon
}) {
  useLockBodyScroll(true)

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-4" style={{ paddingLeft: 'env(safe-area-inset-left)', paddingRight: 'env(safe-area-inset-right)' }}>
      <div 
        className="fixed inset-0 bg-black/50 backdrop-blur-sm animate-fadeIn" 
        onClick={onClose}
        aria-hidden 
      />
      <div 
        className={`relative z-10 w-full ${maxWidth} bg-space-900 border border-space-700 rounded-t-3xl sm:rounded-2xl shadow-2xl animate-fadeIn flex flex-col max-h-[90dvh] sm:max-h-[85vh] max-sm:rounded-b-none overflow-hidden`}
      >
        {/* Header */}
        <div className="flex-shrink-0 border-b border-space-700">
          <div className="flex items-center justify-between px-4 sm:px-5 pt-4 sm:pt-5 pb-4" style={{ paddingTop: 'max(1rem, env(safe-area-inset-top))' }}>
            <div>
              <h3 className="text-lg font-display font-semibold text-gray-100">{title}</h3>
              {subtitle && <p className="text-xs text-gray-500">{subtitle}</p>}
            </div>
            <div className="flex items-center gap-2">
              {headerAddon}
              {showClose && (
                <button 
                  onClick={onClose} 
                  className="p-2 -m-2 text-gray-500 hover:text-gray-100 min-w-[44px] min-h-[44px] flex items-center justify-center transition-colors"
                  aria-label="Fermer"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto overscroll-contain">
          {children}
        </div>
      </div>
    </div>,
    document.body
  )
}
