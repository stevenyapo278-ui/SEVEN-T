import { useEffect } from 'react'

/**
 * Bloque le défilement de la page quand un modal/overlay est ouvert (ex: bottom sheet sur mobile).
 * À appeler avec true quand le modal est ouvert, false sinon.
 * @param {boolean} lock - true pour bloquer le scroll du body, false pour restaurer
 */
export function useLockBodyScroll(lock) {
  useEffect(() => {
    if (!lock) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [lock])
}

export default useLockBodyScroll
