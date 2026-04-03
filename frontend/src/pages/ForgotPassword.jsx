import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Mail, ArrowRight, AlertCircle, CheckCircle2, ArrowLeft } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../services/api'
import { useTheme } from '../contexts/ThemeContext'

// Logo du SaaS (fichier public/logo.svg)
const Logo = () => (
  <img src="/logo.svg" alt="SEVEN T" className="h-8 sm:h-10 w-auto object-contain max-w-[200px] sm:max-w-none" />
)

const API_URL = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '') || '/api'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState(null)
  const { theme } = useTheme()
  const isDark = theme === 'dark'

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      await api.post('/auth/forgot-password', { email })
      setSent(true)
      toast.success('Lien envoyé avec succès !')
    } catch (error) {
      const msg = error.response?.data?.error || 'Une erreur est survenue'
      setError(msg)
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className={`min-h-screen flex flex-col justify-center py-6 sm:py-12 px-4 sm:px-6 lg:px-8 relative overflow-x-hidden overflow-y-auto transition-colors duration-300 ${
        isDark ? 'bg-space-950' : 'bg-gray-50'
      }`}
      style={{ paddingTop: 'max(1.5rem, env(safe-area-inset-top))', paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))' }}
    >
      {/* Background effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-64 sm:w-96 h-64 sm:h-96 bg-blue-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-64 sm:w-96 h-64 sm:h-96 bg-gold-400/5 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-md mx-auto relative z-10 min-w-0">
        <Link to="/" className="flex items-center justify-center mb-6 sm:mb-8">
          <Logo />
        </Link>
        <h2 className={`text-center text-2xl sm:text-3xl font-display font-bold ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>
          Mot de passe oublié
        </h2>
        <p className={`mt-2 text-center text-sm sm:text-base px-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
          Entrez votre email pour recevoir un lien de réinitialisation
        </p>
      </div>

      <div className="mt-6 sm:mt-8 w-full max-w-md mx-auto relative z-10 min-w-0">
        {error && (
          <div
            role="alert"
            className="mb-4 sm:mb-6 p-4 sm:p-5 rounded-xl sm:rounded-2xl border border-red-500/40 bg-red-500/10 flex items-start gap-3 sm:gap-4 animate-fadeIn"
          >
            <AlertCircle className="w-6 h-6 sm:w-8 sm:h-8 text-red-400 flex-shrink-0 mt-0.5" />
            <div className="min-w-0 flex-1">
              <p className="text-base sm:text-lg font-semibold text-red-300 break-words">
                {error}
              </p>
              <button
                type="button"
                onClick={() => setError(null)}
                className="mt-3 text-sm font-medium text-red-400 hover:text-red-300 underline min-h-[44px] touch-target -ml-2 pl-2"
              >
                Fermer
              </button>
            </div>
          </div>
        )}

        <div className={`card py-6 sm:py-8 px-4 sm:px-10 transition-all ${
          isDark ? '' : 'bg-white border-gray-100 shadow-xl'
        }`}>
          {!sent ? (
            <form onSubmit={handleSubmit} className="space-y-5 sm:space-y-6">
              <div>
                <label htmlFor="email" className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                  Email
                </label>
                <div className="input-with-icon">
                  <div className="pl-3 flex items-center justify-center flex-shrink-0 text-gray-500">
                    <Mail className="w-5 h-5" />
                  </div>
                  <input
                    id="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="vous@exemple.com"
                    className="min-h-[44px] touch-target"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full flex items-center justify-center gap-2 min-h-[44px] touch-target disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-space-950 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    Envoyer le lien
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </button>

              <div className="text-center">
                <Link to="/login" className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-gold-400 transition-colors">
                  <ArrowLeft className="w-4 h-4" />
                  Retour à la connexion
                </Link>
              </div>
            </form>
          ) : (
            <div className="text-center space-y-6">
              <div className="flex justify-center">
                <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center">
                  <CheckCircle2 className="w-10 h-10 text-green-500" />
                </div>
              </div>
              <div className="space-y-2">
                <h3 className={`text-xl font-bold ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>Email envoyé !</h3>
                <p className={isDark ? 'text-gray-400' : 'text-gray-600'}>
                  Si un compte correspond à <strong>{email}</strong>, vous recevrez un email avec les instructions pour réinitialiser votre mot de passe d'ici quelques minutes.
                </p>
              </div>
              <div className="pt-4">
                <Link to="/login" className="btn-secondary w-full inline-flex items-center justify-center gap-2">
                  <ArrowLeft className="w-5 h-5" />
                  Retour à la connexion
                </Link>
              </div>
              <button 
                onClick={() => setSent(false)} 
                className="text-sm text-gray-500 hover:text-gray-300 transition-colors"
              >
                Je n'ai rien reçu, réessayer
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
