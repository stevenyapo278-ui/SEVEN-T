import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'

const STORAGE_KEY = 'cookie_consent'
const STORAGE_VALUE_ACCEPTED = 'accepted'

export default function CookieConsentBanner() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (!stored || stored !== STORAGE_VALUE_ACCEPTED) {
        setVisible(true)
      }
    } catch {
      setVisible(false)
    }
  }, [])

  const accept = () => {
    try {
      localStorage.setItem(STORAGE_KEY, STORAGE_VALUE_ACCEPTED)
      localStorage.setItem(`${STORAGE_KEY}_date`, new Date().toISOString())
      setVisible(false)
    } catch {
      setVisible(false)
    }
  }

  if (!visible) return null

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-[100] p-4 md:p-5 bg-space-900/98 border-t border-space-700 shadow-lg"
      style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}
      role="dialog"
      aria-label="Consentement cookies et stockage local"
    >
      <div className="max-w-4xl mx-auto flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <p className="text-sm text-gray-300">
          Nous utilisons le <strong>stockage local</strong> de votre navigateur (token de connexion, langue, thème, préférences) pour le fonctionnement du service. Nous ne déposons pas de cookies de suivi. En continuant, vous acceptez cette utilisation.{' '}
          <Link to="/legal?tab=cookies" className="text-gold-400 hover:underline inline-flex items-center gap-1">
            En savoir plus
          </Link>
        </p>
        <div className="flex items-center gap-3 flex-shrink-0">
          <Link
            to="/legal?tab=cookies"
            className="text-sm font-medium text-gray-400 hover:text-gray-200 transition-colors"
          >
            Paramètres
          </Link>
          <button
            type="button"
            onClick={accept}
            className="px-4 py-2 rounded-xl text-sm font-medium bg-gold-400 text-space-950 hover:bg-gold-300 transition-colors"
          >
            Tout accepter
          </button>
        </div>
      </div>
    </div>
  )
}
