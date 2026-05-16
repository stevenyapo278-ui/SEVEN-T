import { useState, useEffect } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { getAndClearSessionLocation } from '../utils/sessionLocation'
import { useAuth } from '../contexts/AuthContext'
import { Mail, Lock, ArrowRight, AlertCircle, Sparkles, Eye, EyeOff } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import AnimatedBackground from '../components/AnimatedBackground'
import { useTheme } from '../contexts/ThemeContext'
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
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [loginError, setLoginError] = useState(null)
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const { user, login } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  useEffect(() => {
    if (user) {
      const redirect = searchParams.get('redirect')
      // Priorité au paramètre redirect (venant du logout), sinon fallback sur la valeur persistée
      let savedFromStorage = getAndClearSessionLocation(user.id)

      const target =
        (redirect && redirect.startsWith('/dashboard') && redirect) ||
        (savedFromStorage && savedFromStorage.startsWith('/dashboard') && savedFromStorage) ||
        '/dashboard'

      navigate(target, { replace: true })
    }
  }, [user, navigate, searchParams])

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
      // La redirection est gérée par le useEffect (user devient truthy)
    } catch (error) {
      const msg = error.response?.data?.error || 'Erreur de connexion'
      setLoginError(msg)
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  const clearError = () => setLoginError(null)

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { staggerChildren: 0.1, delayChildren: 0.2 }
    }
  }

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1, transition: { duration: 0.5, ease: "easeOut" } }
  }

  return (
    <div
      className={`min-h-screen flex flex-col justify-center py-6 sm:py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden transition-colors duration-300 ${
        isDark ? 'bg-space-950/50' : 'bg-gray-50'
      }`}
      style={{ paddingTop: 'max(1.5rem, env(safe-area-inset-top))', paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))' }}
    >
      <AnimatedBackground />

      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="relative z-10 w-full max-w-md mx-auto"
      >
        <motion.div variants={itemVariants} className="text-center mb-8">
          <Link to="/" className="inline-flex items-center justify-center mb-6 hover:scale-105 transition-transform duration-300">
            <Logo />
          </Link>
          <h2 className={`text-3xl sm:text-4xl font-display font-bold tracking-tight ${isDark ? 'text-white' : 'text-gray-900'}`}>
            Heureux de vous revoir
          </h2>
          <p className={`mt-3 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
            Gérez vos agents IA en toute simplicité
          </p>
        </motion.div>

        <AnimatePresence mode="wait">
          {loginError && (
            <motion.div
              initial={{ opacity: 0, height: 0, scale: 0.95 }}
              animate={{ opacity: 1, height: 'auto', scale: 1 }}
              exit={{ opacity: 0, height: 0, scale: 0.95 }}
              className="mb-6 overflow-hidden"
            >
              <div className="p-4 rounded-2xl border border-red-500/30 bg-red-500/5 backdrop-blur-md flex items-start gap-4">
                <div className="p-2 bg-red-500/20 rounded-lg">
                  <AlertCircle className="w-5 h-5 text-red-400" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-red-200">{loginError}</p>
                  <button onClick={clearError} className="mt-1 text-xs text-red-400/80 hover:text-red-300 underline underline-offset-2">Fermer</button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <motion.div 
          variants={itemVariants}
          className={`backdrop-blur-xl border rounded-[2rem] p-6 sm:p-10 shadow-2xl relative overflow-hidden group transition-all ${
            isDark ? 'bg-white/[0.03] border-white/[0.08]' : 'bg-white border-gray-100'
          }`}
        >
          {/* Subtle inner glow */}
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-gold-400/20 to-transparent" />
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-1.5">
              <label htmlFor="email" className="block text-xs font-bold uppercase tracking-widest text-gray-500 ml-1">
                Email Professionnel
              </label>
              <div className="group/input relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within/input:text-gold-400 transition-colors pointer-events-none">
                  <Mail className="w-5 h-5" />
                </div>
                <input
                  id="email" type="email" required value={email}
                  onChange={(e) => { setEmail(e.target.value); clearError(); }}
                  placeholder="nom@entreprise.com"
                  className={`w-full pl-12 pr-4 py-3.5 border rounded-2xl placeholder-gray-600 focus:outline-none focus:border-gold-400/50 focus:ring-4 focus:ring-gold-400/10 transition-all ${
                    isDark ? 'bg-space-900/50 border-white/10 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'
                  }`}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between items-center ml-1">
                <label htmlFor="password" className="block text-xs font-bold uppercase tracking-widest text-gray-500">
                  Mot de passe
                </label>
                <Link to="/forgot-password" size="sm" className="text-xs font-semibold text-gold-400 hover:text-gold-300 transition-colors">
                  Oublié ?
                </Link>
              </div>
              <div className="group/input relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within/input:text-gold-400 transition-colors pointer-events-none">
                  <Lock className="w-5 h-5" />
                </div>
                <input
                  id="password" type={showPassword ? "text" : "password"} required value={password}
                  onChange={(e) => { setPassword(e.target.value); clearError(); }}
                  placeholder="••••••••"
                  className={`w-full pl-12 pr-12 py-3.5 border rounded-2xl placeholder-gray-600 focus:outline-none focus:border-gold-400/50 focus:ring-4 focus:ring-gold-400/10 transition-all ${
                    isDark ? 'bg-space-900/50 border-white/10 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gold-400 transition-colors focus:outline-none"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <motion.button
              type="submit"
              disabled={loading}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className={`w-full py-4 bg-gradient-to-r from-gold-400 to-gold-500 ${isDark ? 'text-black' : 'text-white'} font-bold rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-gold-400/20 hover:shadow-gold-400/30 transition-all disabled:opacity-50`}
            >
              {loading ? (
                <div className={`w-5 h-5 border-2 ${isDark ? 'border-black' : 'border-white'} border-t-transparent rounded-full animate-spin`} />
              ) : (
                <>
                  Se connecter
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </motion.button>

            <div className="relative py-2">
              <div className="absolute inset-0 flex items-center"><div className={`w-full border-t ${isDark ? 'border-white/5' : 'border-gray-100'}`} /></div>
              <div className={`relative flex justify-center text-[10px] font-bold uppercase tracking-widest ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>
                <span className={`px-3 ${isDark ? 'bg-transparent' : 'bg-white'}`}>Ou continuer avec</span>
              </div>
            </div>

            <motion.a
              whileHover={{ backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)' }}
              href={GOOGLE_LOGIN_URL}
              className={`w-full flex items-center justify-center gap-3 px-4 py-3.5 rounded-2xl border transition-all ${
                isDark ? 'border-white/10 bg-transparent text-gray-200' : 'border-gray-200 bg-white text-gray-700'
              }`}
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              <span>Continuer avec Google</span>
            </motion.a>
          </form>
        </motion.div>

        <motion.p variants={itemVariants} className={`mt-8 text-center text-sm ${isDark ? 'text-gray-500' : 'text-gray-600'}`}>
          Pas encore de compte?{' '}
          <Link to="/register" className="text-gold-400 hover:text-gold-500 font-bold transition-colors inline-flex items-center gap-1 group">
            Commencez l'essai gratuit
            <Sparkles className="w-3.5 h-3.5 group-hover:animate-pulse" />
          </Link>
        </motion.p>
      </motion.div>
    </div>
  )
}
