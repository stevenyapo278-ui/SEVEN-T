import { useEffect } from 'react'

const DEFAULT_TITLE = 'PayneTrust'

/**
 * Sets document.title when mounted and restores the previous title on unmount.
 * @param {string} title - Page title (e.g. "Campagnes", "Support – Agents")
 */
export function usePageTitle(title) {
  useEffect(() => {
    const previous = document.title
    document.title = title ? `${title} – ${DEFAULT_TITLE}` : DEFAULT_TITLE
    return () => {
      document.title = previous
    }
  }, [title])
}

export default usePageTitle
