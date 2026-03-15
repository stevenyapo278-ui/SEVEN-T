import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { Mail, Lock, User, Building, ArrowRight, Sparkles, AlertCircle, Eye, EyeOff } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import AnimatedBackground from '../components/AnimatedBackground'
import toast from 'react-hot-toast'

const GOOGLE_LOGIN_URL = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '') ? `${import.meta.env.VITE_API_URL}/auth/google` : '/api/auth/google'

// Logo du SaaS (fichier public/logo.svg)
const Logo = () => (
  <img src="/logo.svg" alt="SEVEN T" className="h-10 w-auto object-contain" />
)

export default function Register() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    company: ''
  })
  const [acceptTerms, setAcceptTerms] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const { register } = useAuth()
  const navigate = useNavigate()

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { staggerChildren: 0.1, delayChildren: 0.1 }
    }
  }

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1, transition: { duration: 0.5, ease: "easeOut" } }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!acceptTerms) {
      toast.error('Veuillez accepter les conditions d\'utilisation')
      return
    }
    setLoading(true)

    try {
      await register(formData)
      toast.success('Compte créé avec succès!')
      navigate('/dashboard')
    } catch (error) {
      toast.error(error.response?.data?.error || 'Erreur lors de l\'inscription')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-space-950/50 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
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
          <h2 className="text-3xl sm:text-4xl font-display font-bold text-white tracking-tight">
            Prêt à commencer ?
          </h2>
          <p className="mt-3 text-gray-400">
            Rejoignez SEVEN-T et propulsez votre business avec l'IA
          </p>
        </motion.div>

        <motion.div 
          variants={itemVariants}
          className="bg-white/[0.03] backdrop-blur-xl border border-white/[0.08] rounded-[2rem] p-6 sm:p-10 shadow-2xl relative overflow-hidden group"
        >
          {/* Subtle inner glow */}
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-gold-400/20 to-transparent" />
          
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <label htmlFor="name" className="block text-xs font-bold uppercase tracking-widest text-gray-500 ml-1">
                Nom complet
              </label>
              <div className="group/input relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within/input:text-gold-400 transition-colors pointer-events-none">
                  <User className="w-5 h-5" />
                </div>
                <input
                  id="name" name="name" type="text" required value={formData.name}
                  onChange={handleChange} placeholder="Jean Dupont"
                  className="w-full pl-12 pr-4 py-3 bg-space-900/50 border border-white/10 rounded-2xl text-white placeholder-gray-600 focus:outline-none focus:border-gold-400/50 focus:ring-4 focus:ring-gold-400/10 transition-all font-medium text-sm"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="email" className="block text-xs font-bold uppercase tracking-widest text-gray-500 ml-1">
                Email Professionnel
              </label>
              <div className="group/input relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within/input:text-gold-400 transition-colors pointer-events-none">
                  <Mail className="w-5 h-5" />
                </div>
                <input
                  id="email" name="email" type="email" required value={formData.email}
                  onChange={handleChange} placeholder="vous@entreprise.com"
                  className="w-full pl-12 pr-4 py-3 bg-space-900/50 border border-white/10 rounded-2xl text-white placeholder-gray-600 focus:outline-none focus:border-gold-400/50 focus:ring-4 focus:ring-gold-400/10 transition-all font-medium text-sm"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="password" className="block text-xs font-bold uppercase tracking-widest text-gray-500 ml-1">
                Mot de passe
              </label>
              <div className="group/input relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within/input:text-gold-400 transition-colors pointer-events-none">
                  <Lock className="w-5 h-5" />
                </div>
                <input
                  id="password" name="password" type={showPassword ? "text" : "password"} required minLength={6}
                  value={formData.password} onChange={handleChange} placeholder="••••••••"
                  className="w-full pl-12 pr-12 py-3 bg-space-900/50 border border-white/10 rounded-2xl text-white placeholder-gray-600 focus:outline-none focus:border-gold-400/50 focus:ring-4 focus:ring-gold-400/10 transition-all font-medium text-sm"
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

            <div className="space-y-1.5">
              <label htmlFor="company" className="block text-xs font-bold uppercase tracking-widest text-gray-500 ml-1">
                Entreprise <span className="opacity-50">(Optionnel)</span>
              </label>
              <div className="group/input relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within/input:text-gold-400 transition-colors pointer-events-none">
                  <Building className="w-5 h-5" />
                </div>
                <input
                  id="company" name="company" type="text" value={formData.company}
                  onChange={handleChange} placeholder="Ma Société"
                  className="w-full pl-12 pr-4 py-3 bg-space-900/50 border border-white/10 rounded-2xl text-white placeholder-gray-600 focus:outline-none focus:border-gold-400/50 focus:ring-4 focus:ring-gold-400/10 transition-all font-medium text-sm"
                />
              </div>
            </div>

            <div className={`p-4 rounded-xl bg-white/5 border border-white/10 transition-all ${acceptTerms ? 'border-gold-400/30' : ''}`}>
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox" checked={acceptTerms} onChange={(e) => setAcceptTerms(e.target.checked)}
                  className="mt-1 w-4 h-4 rounded border-white/20 bg-space-900 text-gold-400 focus:ring-gold-400/50 transition-colors"
                />
                <span className="text-xs text-gray-400 leading-relaxed font-medium">
                  J'accepte les <Link to="/legal?tab=terms" className="text-gold-400 hover:text-gold-300 underline font-bold transition-colors">Conditions d'Utilisation</Link> et la <Link to="/legal?tab=privacy" className="text-gold-400 hover:text-gold-300 underline font-bold transition-colors">Politique de Confidentialité</Link>.
                </span>
              </label>
            </div>

            <motion.button
              type="submit"
              disabled={loading || !acceptTerms}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full py-4 bg-gradient-to-r from-gold-400 to-gold-500 text-black font-bold rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-gold-400/20 hover:shadow-gold-400/30 transition-all disabled:opacity-50 disabled:grayscale mt-4"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  Créer mon compte
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </motion.button>

            <div className="relative py-2">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-white/5" /></div>
              <div className="relative flex justify-center text-[10px] font-bold uppercase tracking-widest text-gray-600">
                <span className="px-3 bg-transparent">Ou continuer avec</span>
              </div>
            </div>

            <motion.a
              whileHover={{ backgroundColor: 'rgba(255,255,255,0.05)' }}
              href={GOOGLE_LOGIN_URL}
              className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-2xl border border-white/10 bg-transparent text-gray-200 font-medium transition-all text-sm"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              <span>S'inscrire avec Google</span>
            </motion.a>
          </form>
        </motion.div>

        <motion.p variants={itemVariants} className="mt-8 text-center text-sm text-gray-500">
          Déjà un compte?{' '}
          <Link to="/login" className="text-gold-400 hover:text-gold-300 font-bold transition-colors inline-flex items-center gap-1">
            Connectez-vous ici
          </Link>
        </motion.p>
      </motion.div>
    </div>
  )
}
