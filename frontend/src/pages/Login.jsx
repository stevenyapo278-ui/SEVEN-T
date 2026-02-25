import { useState, useEffect } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { Mail, Lock, ArrowRight, AlertCircle } from 'lucide-react'
import toast from 'react-hot-toast'

const GOOGLE_LOGIN_URL = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '') ? `${import.meta.env.VITE_API_URL}/auth/google` : '/api/auth/google'

// Logo du SaaS (fichier public/logo.svg)
const Logo = () => (
  <img src="/logo.svg" alt="SEVEN T" className="h-8 sm:h-10 w-auto object-contain max-w-[200px] sm:max-w-none" />
)

const ERROR_MESSAGES = {
  oauth_invalid_state: 'Session expirée. Réessayez.',
  oauth_missing_code: 'Connexion Google annulée.',
  oauth_not_configured: 'Connexion Google non configurée.',
  oauth_failed: 'Échec de la connexion Google. Réessayez.',
  email_missing: 'Impossible de récupérer votre email Google.',
  account_disabled: 'Compte désactivé. Contactez le support.'
}

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [loginError, setLoginError] = useState(null)
  const { login } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  useEffect(() => {
    const error = searchParams.get('error')
    if (error) {
      const msg = ERROR_MESSAGES[error] || 'Erreur de connexion'
      setLoginError(msg)
      toast.error(msg)
      window.history.replaceState({}, '', '/login')
    }
  }, [searchParams])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoginError(null)
    setLoading(true)

    try {
      await login(email, password)
      toast.success('Connexion réussie!')
      navigate('/dashboard')
    } catch (error) {
      const msg = error.response?.data?.error || 'Erreur de connexion'
      setLoginError(msg)
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  const clearError = () => setLoginError(null)

  return (
    <div
      className="min-h-screen bg-space-950 flex flex-col justify-center py-6 sm:py-12 px-4 sm:px-6 lg:px-8 relative overflow-x-hidden overflow-y-auto"
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
        <h2 className="text-center text-2xl sm:text-3xl font-display font-bold text-gray-100">
          Connexion
        </h2>
        <p className="mt-2 text-center text-sm sm:text-base text-gray-400 px-1">
          Pas encore de compte?{' '}
          <Link to="/register" className="text-gold-400 hover:text-gold-300 font-medium transition-colors">
            Inscrivez-vous
          </Link>
        </p>
      </div>

      <div className="mt-6 sm:mt-8 w-full max-w-md mx-auto relative z-10 min-w-0">
        {loginError && (
          <div
            role="alert"
            className="mb-4 sm:mb-6 p-4 sm:p-5 rounded-xl sm:rounded-2xl border border-red-500/40 bg-red-500/10 flex items-start gap-3 sm:gap-4 animate-fadeIn"
          >
            <AlertCircle className="w-6 h-6 sm:w-8 sm:h-8 text-red-400 flex-shrink-0 mt-0.5" />
            <div className="min-w-0 flex-1">
              <p className="text-base sm:text-lg font-semibold text-red-300 break-words">
                {loginError}
              </p>
              <p className="mt-1 text-xs sm:text-sm text-red-400/90">
                Vérifiez votre email et votre mot de passe, puis réessayez.
              </p>
              <button
                type="button"
                onClick={clearError}
                className="mt-3 text-sm font-medium text-red-400 hover:text-red-300 underline min-h-[44px] touch-target -ml-2 pl-2"
              >
                Fermer
              </button>
            </div>
          </div>
        )}
        <div className="card py-6 sm:py-8 px-4 sm:px-10">
          <form onSubmit={handleSubmit} className="space-y-5 sm:space-y-6">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-1">
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
                  onChange={(e) => { setEmail(e.target.value); clearError(); }}
                  placeholder="vous@exemple.com"
                  className="min-h-[44px] touch-target"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-1">
                Mot de passe
              </label>
              <div className="input-with-icon">
                <div className="pl-3 flex items-center justify-center flex-shrink-0 text-gray-500">
                  <Lock className="w-5 h-5" />
                </div>
                <input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); clearError(); }}
                  placeholder="••••••••"
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
                  Se connecter
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>

            <div className="relative my-4 sm:my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-space-600" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-space-800 text-gray-500">ou</span>
              </div>
            </div>

            <a
              href={GOOGLE_LOGIN_URL}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 min-h-[44px] touch-target rounded-xl border border-space-600 bg-space-800/50 text-gray-200 hover:bg-space-700/50 hover:border-space-500 transition-colors text-sm sm:text-base"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              Se connecter avec Google
            </a>
          </form>
        </div>
      </div>
    </div>
  )
}
