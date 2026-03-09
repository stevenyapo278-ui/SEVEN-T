import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Cookie, X } from 'lucide-react'

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
    <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:bottom-6 z-[100] max-w-sm animate-fadeIn">
      <div className="bg-space-900/90 backdrop-blur-xl border border-space-700 shadow-2xl rounded-2xl p-5 overflow-hidden relative">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-gold-400 to-blue-500" />
        <button
          onClick={accept}
          className="absolute top-3 right-3 text-gray-500 hover:text-white transition-colors"
          aria-label="Fermer"
        >
          <X className="w-4 h-4" />
        </button>
        
        <div className="flex items-start gap-4 mb-3 pr-4">
          <div className="p-2.5 bg-space-800 rounded-xl flex-shrink-0 border border-space-700">
            <Cookie className="w-5 h-5 text-gold-400" />
          </div>
          <div>
            <h3 className="text-gray-100 font-display font-semibold text-base mb-1">Cookies & Préférences</h3>
            <p className="text-xs text-gray-400 leading-relaxed">
              Nous utilisons le stockage local strictement nécessaire au fonctionnement du service (connexion, thème). Aucun traceur publicitaire n'est utilisé.{' '}
              <Link to="/legal?tab=cookies" className="text-blue-400 hover:text-blue-300 hover:underline inline-flex items-center">
                En savoir plus
              </Link>
            </p>
          </div>
        </div>

        <div className="flex gap-3 mt-4">
          <button
            onClick={accept}
            className="flex-1 py-2 px-4 rounded-xl text-sm font-semibold bg-space-800 text-gray-300 hover:bg-space-700 border border-space-600 transition-colors"
          >
            Strictement nécessaires
          </button>
          <button
            onClick={accept}
            className="flex-1 py-2 px-4 rounded-xl text-sm font-bold bg-blue-500 text-white hover:bg-blue-600 hover:scale-[1.02] transition-all shadow-lg shadow-blue-500/20"
          >
            Compris
          </button>
        </div>
      </div>
    </div>
  )
}
