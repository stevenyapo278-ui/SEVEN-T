import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { AlertTriangle, Info, Loader2, X } from 'lucide-react'
import { useTheme } from '../contexts/ThemeContext'

const VARIANTS = {
  danger: {
    icon: AlertTriangle,
    iconBg: 'bg-red-500/20',
    iconColor: 'text-red-400',
    confirmBg: 'bg-red-500 hover:bg-red-600',
    confirmBorder: 'border-red-500/30',
    keywordHighlight: 'text-red-400',
    inputValid: 'border-emerald-500 bg-emerald-500/10',
    inputInvalid: 'border-red-500 bg-red-500/10',
  },
  warning: {
    icon: AlertTriangle,
    iconBg: 'bg-amber-500/20',
    iconColor: 'text-amber-400',
    confirmBg: 'bg-amber-500 hover:bg-amber-600',
    confirmBorder: 'border-amber-500/30',
    keywordHighlight: 'text-amber-400',
    inputValid: 'border-emerald-500 bg-emerald-500/10',
    inputInvalid: 'border-amber-500 bg-amber-500/10',
  },
  info: {
    icon: Info,
    iconBg: 'bg-blue-500/20',
    iconColor: 'text-blue-400',
    confirmBg: 'bg-blue-500 hover:bg-blue-600',
    confirmBorder: 'border-blue-500/30',
    keywordHighlight: 'text-blue-400',
    inputValid: 'border-emerald-500 bg-emerald-500/10',
    inputInvalid: 'border-blue-500 bg-blue-500/10',
  },
}

/**
 * Boîte de dialogue de confirmation réutilisable.
 * @param {boolean} open - Afficher ou masquer
 * @param {string} title - Titre du dialogue
 * @param {string} message - Message principal
 * @param {'danger'|'warning'|'info'} variant - Style (danger=rouge, warning=ambre, info=bleu)
 * @param {string} confirmLabel - Texte du bouton confirmer
 * @param {string} cancelLabel - Texte du bouton annuler
 * @param {string} [keyword] - Si fourni, l'utilisateur doit taper ce mot pour débloquer Confirmer
 * @param {function} onConfirm - Callback au clic sur Confirmer (peut être async)
 * @param {function} onCancel - Callback au clic sur Annuler ou fermeture
 * @param {boolean} loading - Afficher un spinner sur le bouton Confirmer
 */
export default function ConfirmDialog({
  open,
  title = 'Confirmation',
  message,
  variant = 'warning',
  confirmLabel = 'Confirmer',
  cancelLabel = 'Annuler',
  keyword = null,
  onConfirm,
  onCancel,
  loading = false,
}) {
  const { isDark } = useTheme()
  const [inputValue, setInputValue] = useState('')
  const [confirming, setConfirming] = useState(false)

  const config = VARIANTS[variant] || VARIANTS.warning
  const Icon = config.icon
  const requireKeyword = Boolean(keyword && keyword.trim())
  const isValid = !requireKeyword || inputValue.trim().toUpperCase() === keyword.trim().toUpperCase()

  // Reset input when dialog opens/closes
  useEffect(() => {
    if (open) setInputValue('')
    if (!open) setConfirming(false)
  }, [open])

  // Escape to cancel
  useEffect(() => {
    if (!open) return
    const handleEscape = (e) => {
      if (e.key === 'Escape') onCancel?.()
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [open, onCancel])

  const handleConfirm = async () => {
    if (!isValid || confirming) return
    setConfirming(true)
    try {
      await onConfirm?.()
      onCancel?.()
    } finally {
      setConfirming(false)
    }
  }

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) onCancel?.()
  }

  const messageStr = typeof message === 'string' ? message : (message?.message ?? String(message ?? ''))

  if (!open) return null

  const dialogContent = (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 animate-fadeIn"
      onClick={handleBackdropClick}
    >
      {/* Backdrop moderne */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-md" aria-hidden />

      {/* Carte dialogue moderne */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        aria-describedby="confirm-dialog-desc"
        className={`relative w-full max-w-[400px] rounded-2xl shadow-2xl animate-fadeIn overflow-hidden ${
          isDark
            ? 'bg-space-900 border border-space-600/80 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)]'
            : 'bg-white border border-gray-200/80 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.15)]'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 sm:p-8">
          {/* Bouton fermer discret */}
          <button
            type="button"
            onClick={onCancel}
            className={`absolute top-4 right-4 rounded-xl p-2 transition-colors ${
              isDark ? 'text-gray-500 hover:text-gray-300 hover:bg-space-800' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
            }`}
            aria-label="Fermer"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Icône dans un cercle moderne */}
          <div className="flex justify-center mb-6">
            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${config.iconBg} ring-4 ${
              isDark ? 'ring-space-800' : 'ring-gray-100'
            }`}>
              <Icon className={`w-8 h-8 ${config.iconColor}`} />
            </div>
          </div>

          {/* Titre */}
          <h2
            id="confirm-dialog-title"
            className={`text-xl font-display font-bold text-center mb-3 ${
              isDark ? 'text-gray-100' : 'text-gray-900'
            }`}
          >
            {typeof title === 'string' ? title : String(title ?? 'Confirmation')}
          </h2>

          {/* Message */}
          <p
            id="confirm-dialog-desc"
            className={`text-center mb-6 text-[15px] leading-relaxed ${
              isDark ? 'text-gray-400' : 'text-gray-600'
            }`}
          >
            {messageStr}
          </p>

          {/* Champ mot-clé (optionnel) */}
          {requireKeyword && (
            <div className="mb-6">
              <label className={`block text-sm font-medium text-center mb-2 ${
                isDark ? 'text-gray-300' : 'text-gray-600'
              }`}>
                Pour confirmer, tapez{' '}
                <span className={`font-bold ${config.keywordHighlight}`}>{keyword}</span>
              </label>
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder={`Tapez "${keyword}"`}
                className={`input w-full text-center text-base font-mono rounded-xl ${
                  inputValue.length > 0
                    ? isValid
                      ? config.inputValid
                      : config.inputInvalid
                    : ''
                }`}
                autoFocus
                autoComplete="off"
              />
              {inputValue.length > 0 && !isValid && (
                <p className="text-xs text-red-400 mt-1.5 text-center">
                  Le mot ne correspond pas
                </p>
              )}
            </div>
          )}

          {/* Boutons modernes */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onCancel}
              disabled={confirming || loading}
              className={`flex-1 py-3 px-4 rounded-xl font-semibold text-sm transition-all ${
                isDark
                  ? 'bg-space-800 text-gray-300 hover:bg-space-700 border border-space-600'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-200'
              }`}
            >
              {cancelLabel}
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={!isValid || confirming || loading}
              className={`flex-1 py-3 px-4 rounded-xl font-semibold text-sm transition-all text-white disabled:opacity-50 disabled:cursor-not-allowed ${
                isValid ? config.confirmBg : 'bg-gray-500 cursor-not-allowed'
              }`}
            >
              {(confirming || loading) ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Confirmation...
                </span>
              ) : (
                confirmLabel
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )

  return createPortal(dialogContent, document.body)
}
