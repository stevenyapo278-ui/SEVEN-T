import { createContext, useContext, useState, useCallback, useRef } from 'react'
import ConfirmDialog from '../components/ConfirmDialog'

const ConfirmContext = createContext(null)

/**
 * Hook pour afficher des boîtes de confirmation (évite tout conflit avec window.confirm).
 * @returns {{ showConfirm: (options) => Promise<boolean> }}
 * @example
 * const { showConfirm } = useConfirm()
 * const ok = await showConfirm({ title: 'Supprimer ?', message: 'Cette action est irréversible.', variant: 'danger' })
 * if (ok) { ... }
 */
export function useConfirm() {
  const context = useContext(ConfirmContext)
  if (!context) {
    throw new Error('useConfirm must be used within a ConfirmProvider')
  }
  return context
}

const defaults = {
  title: 'Confirmation',
  message: 'Êtes-vous sûr ?',
  variant: 'warning',
  confirmLabel: 'Confirmer',
  cancelLabel: 'Annuler',
  keyword: null,
}

export function ConfirmProvider({ children }) {
  const [state, setState] = useState({
    open: false,
    ...defaults,
  })
  const resolveRef = useRef(null)
  const rejectRef = useRef(null)

  const showConfirm = useCallback((options = {}) => {
    return new Promise((resolve, reject) => {
      resolveRef.current = resolve
      rejectRef.current = reject
      let title = defaults.title
      let message = defaults.message
      try {
        title = typeof options.title === 'string' ? options.title : String(options?.title ?? defaults.title)
        message = typeof options.message === 'string' ? options.message : (options?.message?.message ?? String(options?.message ?? defaults.message))
      } catch (_) {}
      setState({
        open: true,
        title,
        message,
        variant: options.variant ?? defaults.variant,
        confirmLabel: options.confirmLabel ?? defaults.confirmLabel,
        cancelLabel: options.cancelLabel ?? defaults.cancelLabel,
        keyword: options.keyword ?? defaults.keyword,
      })
    })
  }, [])

  const handleConfirm = useCallback(() => {
    resolveRef.current?.(true)
    resolveRef.current = null
    rejectRef.current = null
    setState((prev) => ({ ...prev, open: false }))
  }, [])

  const handleCancel = useCallback(() => {
    resolveRef.current?.(false)
    rejectRef.current?.(new Error('Cancelled'))
    resolveRef.current = null
    rejectRef.current = null
    setState((prev) => ({ ...prev, open: false }))
  }, [])

  return (
    <ConfirmContext.Provider value={{ showConfirm }}>
      {children}
      <ConfirmDialog
        open={state.open}
        title={state.title}
        message={state.message}
        variant={state.variant}
        confirmLabel={state.confirmLabel}
        cancelLabel={state.cancelLabel}
        keyword={state.keyword}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />
    </ConfirmContext.Provider>
  )
}
