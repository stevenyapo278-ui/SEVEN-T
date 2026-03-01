import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Lock, ArrowRight, AlertCircle, CheckCircle2, ArrowLeft, Eye, EyeOff } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../services/api'

const Logo = () => (
  <img src="/logo.svg" alt="SEVEN T" className="h-8 sm:h-10 w-auto object-contain max-w-[200px] sm:max-w-none" />
)

const API_URL = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '') || '/api'

export default function ResetPassword() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState(null)
  
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const token = searchParams.get('token')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)

    if (password !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas')
      return
    }

    if (password.length < 8) {
      setError('Le mot de passe doit contenir au moins 8 caractères')
      return
    }

    if (!token) {
      setError('Token manquant ou invalide')
      return
    }

    setLoading(true)

    try {
      await api.post('/auth/reset-password', { token, password })
      setSuccess(true)
      toast.success('Mot de passe réinitialisé avec succès !')
      setTimeout(() => navigate('/login'), 5000)
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
      className="min-h-screen bg-space-950 flex flex-col justify-center py-6 sm:py-12 px-4 sm:px-6 lg:px-8 relative overflow-x-hidden overflow-y-auto"
      style={{ paddingTop: 'max(1.5rem, env(safe-area-inset-top))', paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))' }}
    >
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-64 sm:w-96 h-64 sm:h-96 bg-blue-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-64 sm:w-96 h-64 sm:h-96 bg-gold-400/5 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-md mx-auto relative z-10 min-w-0">
        <Link to="/" className="flex items-center justify-center mb-6 sm:mb-8">
          <Logo />
        </Link>
        <h2 className="text-center text-2xl sm:text-3xl font-display font-bold text-gray-100">
          Nouveau mot de passe
        </h2>
        <p className="mt-2 text-center text-sm sm:text-base text-gray-400 px-1">
          Créez un nouveau mot de passe pour votre compte
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

        <div className="card py-6 sm:py-8 px-4 sm:px-10">
          {!success ? (
            <form onSubmit={handleSubmit} className="space-y-5 sm:space-y-6">
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-1">
                  Nouveau mot de passe
                </label>
                <div className="input-with-icon">
                  <div className="pl-3 flex items-center justify-center flex-shrink-0 text-gray-500">
                    <Lock className="w-5 h-5" />
                  </div>
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="min-h-[44px] touch-target pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 text-gray-400 hover:text-gray-300"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-300 mb-1">
                  Confirmer le mot de passe
                </label>
                <div className="input-with-icon">
                  <div className="pl-3 flex items-center justify-center flex-shrink-0 text-gray-500">
                    <Lock className="w-5 h-5" />
                  </div>
                  <input
                    id="confirmPassword"
                    type={showPassword ? "text" : "password"}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="min-h-[44px] touch-target"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || !token}
                className="btn-primary w-full flex items-center justify-center gap-2 min-h-[44px] touch-target disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-space-950 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    Réinitialiser le mot de passe
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </button>

              {!token && (
                <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-sm text-red-400 text-center">
                  Lien de réinitialisation invalide ou manquant.
                </div>
              )}
            </form>
          ) : (
            <div className="text-center space-y-6">
              <div className="flex justify-center">
                <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center">
                  <CheckCircle2 className="w-10 h-10 text-green-500" />
                </div>
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-bold text-gray-100">Mot de passe modifié !</h3>
                <p className="text-gray-400">
                  Votre mot de passe a été mis à jour avec succès. Vous allez être redirigé vers la page de connexion.
                </p>
              </div>
              <div className="pt-4">
                <Link to="/login" className="btn-primary w-full inline-flex items-center justify-center gap-2">
                  Se connecter maintenant
                  <ArrowRight className="w-5 h-5" />
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
