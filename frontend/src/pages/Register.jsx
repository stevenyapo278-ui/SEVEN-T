import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { Mail, Lock, User, Building, ArrowRight, Sparkles, AlertCircle, Eye, EyeOff, Check, ArrowLeft } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import AnimatedBackground from '../components/AnimatedBackground'
import { useTheme } from '../contexts/ThemeContext'
import toast from 'react-hot-toast'

// Logo du SaaS (fichier public/logo.svg)
const Logo = () => (
  <img src="/logo.svg" alt="SEVEN T" className="h-10 w-auto object-contain" />
)

const INDUSTRIES = [
  'Immobilier', 'E-commerce', 'Services B2B', 'Formation / Éducation', 
  'Santé', 'Technologie / SaaS', 'Restauration / Hôtellerie', 'Autre'
]

const ROLES = [
  'Fondateur / CEO', 'Commercial / Sales', 'Marketing', 'Manager', 'Autre'
]

const SIZES = [
  'Indépendant', '2-10 employés', '11-50 employés', '51-200 employés', '201+ employés'
]

const GOALS = [
  'Automatiser mes relances', 'Qualifier mes leads', 'Créer un assistant de vente', 'Support client IA', 'Autre'
]

export default function Register() {
  const [step, setStep] = useState(1)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    company: '',
    industry: '',
    job_title: '',
    company_size: '',
    primary_goal: ''
  })
  const [acceptTerms, setAcceptTerms] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const { register } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const planParam = searchParams.get('plan')

  const handleChange = (e) => {
    let value = e.target.value;
    if (e.target.name === 'phone') {
      value = value.replace(/[^\d]/g, '');
    }
    setFormData({ ...formData, [e.target.name]: value })
  }

  const nextStep = () => {
    if (step === 1) {
      if (!formData.name || !formData.email || !formData.password) {
        return toast.error('Veuillez remplir tous les champs obligatoires')
      }
      if (formData.password !== formData.confirmPassword) {
        return toast.error('Les mots de passe ne correspondent pas')
      }
      if (formData.password.length < 8) {
        return toast.error('Le mot de passe doit faire au moins 8 caractères')
      }
    }
    if (step === 2) {
      if (!formData.company || !formData.job_title || !formData.industry) {
        return toast.error('Veuillez remplir les informations sur votre entreprise')
      }
    }
    setStep(prev => prev + 1)
  }

  const prevStep = () => setStep(prev => prev - 1)

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
    if (step !== 3) return
    
    if (!acceptTerms) {
      toast.error('Veuillez accepter les conditions d\'utilisation')
      return
    }
    if (!formData.phone || !formData.primary_goal) {
      toast.error('Veuillez remplir toutes les informations')
      return
    }

    setLoading(true)
    try {
      await register({
        ...formData,
        plan: planParam || 'starter'
      })
      toast.success('Compte créé ! Bienvenue chez SEVEN-T')
      navigate('/dashboard')
    } catch (error) {
      const errorData = error.response?.data
      const message = errorData?.details 
        ? errorData.details.map(d => d.message).join(', ')
        : (errorData?.error || 'Erreur lors de l\'inscription')
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  const StepIndicator = () => (
    <div className="flex items-center justify-center space-x-4 mb-8">
      {[1, 2, 3].map((s) => (
        <div key={s} className="flex items-center">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300 ${
            step === s 
              ? 'bg-gold-400 text-black scale-110 ring-4 ring-gold-400/20' 
              : step > s 
                ? 'bg-green-500 text-white' 
                : isDark ? 'bg-white/10 text-gray-500' : 'bg-gray-200 text-gray-400'
          }`}>
            {step > s ? <Check className="w-5 h-5" /> : s}
          </div>
          {s < 3 && (
            <div className={`w-12 h-0.5 mx-2 transition-colors duration-300 ${
              step > s ? 'bg-green-500' : isDark ? 'bg-white/10' : 'bg-gray-200'
            }`} />
          )}
        </div>
      ))}
    </div>
  )

  return (
    <div className={`min-h-screen flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden transition-colors duration-300 ${
      isDark ? 'bg-space-950/50' : 'bg-gray-50'
    }`}>
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
            {step === 1 ? 'Créons votre compte' : step === 2 ? 'Votre entreprise' : 'Dernière étape'}
          </h2>
          <p className={`mt-3 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
            {step === 1 
              ? 'Commencez l\'aventure avec votre identité.' 
              : step === 2 
                ? 'Dites-nous en plus sur votre business.' 
                : 'Finalisons votre configuration personnalisée.'}
          </p>
        </motion.div>

        <motion.div 
          variants={itemVariants}
          className={`backdrop-blur-xl border rounded-[2.5rem] p-6 sm:p-10 shadow-2xl relative overflow-hidden transition-all duration-500 ${
            isDark ? 'bg-white/[0.03] border-white/[0.08] shadow-black/50' : 'bg-white border-gray-100 shadow-gray-200'
          }`}
        >
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-gold-400/20 to-transparent" />
          
          <StepIndicator />

          <form onSubmit={handleSubmit} className="space-y-6">
            <AnimatePresence mode="wait">
              {step === 1 && (
                <motion.div
                  key="step1"
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  exit={{ x: 20, opacity: 0 }}
                  className="space-y-4"
                >
                  <div className="space-y-1.5">
                    <label htmlFor="name" className="block text-xs font-bold uppercase tracking-widest text-gray-500 ml-1">
                      Nom complet
                    </label>
                    <div className="group/input relative">
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within/input:text-gold-400 transition-colors pointer-events-none">
                        <User className="w-5 h-5" />
                      </div>
                      <input
                        id="name" name="name" type="text" required
                        value={formData.name} onChange={handleChange} placeholder="Jean Dupont"
                        className={`w-full pl-12 pr-4 py-3 border rounded-2xl placeholder-gray-600 focus:outline-none focus:border-gold-400/50 focus:ring-4 focus:ring-gold-400/10 transition-all font-medium text-sm ${
                          isDark ? 'bg-space-900/50 border-white/10 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'
                        }`}
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="email" className="block text-xs font-bold uppercase tracking-widest text-gray-500 ml-1">
                      Email professionnel
                    </label>
                    <div className="group/input relative">
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within/input:text-gold-400 transition-colors pointer-events-none">
                        <Mail className="w-5 h-5" />
                      </div>
                      <input
                        id="email" name="email" type="email" required
                        value={formData.email} onChange={handleChange} placeholder="jean@entreprise.com"
                        className={`w-full pl-12 pr-4 py-3 border rounded-2xl placeholder-gray-600 focus:outline-none focus:border-gold-400/50 focus:ring-4 focus:ring-gold-400/10 transition-all font-medium text-sm ${
                          isDark ? 'bg-space-900/50 border-white/10 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'
                        }`}
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
                        id="password" name="password" type={showPassword ? "text" : "password"} required minLength={8}
                        value={formData.password} onChange={handleChange} placeholder="••••••••"
                        className={`w-full pl-12 pr-12 py-3 border rounded-2xl placeholder-gray-600 focus:outline-none focus:border-gold-400/50 focus:ring-4 focus:ring-gold-400/10 transition-all font-medium text-sm ${
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

                  <div className="space-y-1.5">
                    <label htmlFor="confirmPassword" className="block text-xs font-bold uppercase tracking-widest text-gray-500 ml-1">
                      Confirmer le mot de passe
                    </label>
                    <div className="group/input relative">
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within/input:text-gold-400 transition-colors pointer-events-none">
                        <Lock className="w-5 h-5" />
                      </div>
                      <input
                        id="confirmPassword" name="confirmPassword" type={showConfirmPassword ? "text" : "password"} required
                        value={formData.confirmPassword} onChange={handleChange} placeholder="••••••••"
                        className={`w-full pl-12 pr-12 py-3 border rounded-2xl placeholder-gray-600 focus:outline-none focus:border-gold-400/50 focus:ring-4 focus:ring-gold-400/10 transition-all font-medium text-sm ${
                          isDark ? 'bg-space-900/50 border-white/10 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'
                        }`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gold-400 transition-colors focus:outline-none"
                      >
                        {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}

              {step === 2 && (
                <motion.div
                  key="step2"
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  exit={{ x: 20, opacity: 0 }}
                  className="space-y-4"
                >
                  <div className="space-y-1.5">
                    <label htmlFor="company" className="block text-xs font-bold uppercase tracking-widest text-gray-500 ml-1">
                      Nom de l'entreprise
                    </label>
                    <div className="group/input relative">
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within/input:text-gold-400 transition-colors pointer-events-none">
                        <Building className="w-5 h-5" />
                      </div>
                      <input
                        id="company" name="company" type="text" required
                        value={formData.company} onChange={handleChange} placeholder="Ma Super Boîte"
                        className={`w-full pl-12 pr-4 py-3 border rounded-2xl placeholder-gray-600 focus:outline-none focus:border-gold-400/50 focus:ring-4 focus:ring-gold-400/10 transition-all font-medium text-sm ${
                          isDark ? 'bg-space-900/50 border-white/10 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'
                        }`}
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="job_title" className="block text-xs font-bold uppercase tracking-widest text-gray-500 ml-1">
                      Votre rôle
                    </label>
                    <select
                      id="job_title" name="job_title" required
                      value={formData.job_title} onChange={handleChange}
                      className={`w-full px-4 py-3 border rounded-2xl focus:outline-none focus:border-gold-400/50 focus:ring-4 focus:ring-gold-400/10 transition-all font-medium text-sm ${
                        isDark ? 'bg-space-900/50 border-white/10 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'
                      } appearance-none cursor-pointer`}
                    >
                      <option value="">Sélectionnez votre rôle</option>
                      {ROLES.map(role => <option key={role} value={role}>{role}</option>)}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label htmlFor="company_size" className="block text-xs font-bold uppercase tracking-widest text-gray-500 ml-1">
                        Taille
                      </label>
                      <select
                        id="company_size" name="company_size" required
                        value={formData.company_size} onChange={handleChange}
                        className={`w-full px-4 py-3 border rounded-2xl focus:outline-none focus:border-gold-400/50 focus:ring-4 focus:ring-gold-400/10 transition-all font-medium text-sm ${
                          isDark ? 'bg-space-900/50 border-white/10 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'
                        } appearance-none cursor-pointer`}
                      >
                        <option value="">Effectif</option>
                        {SIZES.map(size => <option key={size} value={size}>{size}</option>)}
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <label htmlFor="industry" className="block text-xs font-bold uppercase tracking-widest text-gray-500 ml-1">
                        Secteur
                      </label>
                      <select
                        id="industry" name="industry" required
                        value={formData.industry} onChange={handleChange}
                        className={`w-full px-4 py-3 border rounded-2xl focus:outline-none focus:border-gold-400/50 focus:ring-4 focus:ring-gold-400/10 transition-all font-medium text-sm ${
                          isDark ? 'bg-space-900/50 border-white/10 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'
                        } appearance-none cursor-pointer`}
                      >
                        <option value="">Industrie</option>
                        {INDUSTRIES.map(ind => <option key={ind} value={ind}>{ind}</option>)}
                      </select>
                    </div>
                  </div>
                </motion.div>
              )}

              {step === 3 && (
                <motion.div
                  key="step3"
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  exit={{ x: 20, opacity: 0 }}
                  className="space-y-4"
                >
                  <div className="space-y-1.5">
                    <label htmlFor="primary_goal" className="block text-xs font-bold uppercase tracking-widest text-gray-500 ml-1">
                      Objectif principal
                    </label>
                    <select
                      id="primary_goal" name="primary_goal" required
                      value={formData.primary_goal} onChange={handleChange}
                      className={`w-full px-4 py-3 border rounded-2xl focus:outline-none focus:border-gold-400/50 focus:ring-4 focus:ring-gold-400/10 transition-all font-medium text-sm ${
                        isDark ? 'bg-space-900/50 border-white/10 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'
                      } appearance-none cursor-pointer`}
                    >
                      <option value="">Que souhaitez-vous faire ?</option>
                      {GOALS.map(goal => <option key={goal} value={goal}>{goal}</option>)}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="phone" className="block text-xs font-bold uppercase tracking-widest text-gray-500 ml-1">
                      Numéro de téléphone
                    </label>
                    <div className="group/input relative">
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within/input:text-gold-400 transition-colors pointer-events-none text-sm font-bold">
                        +
                      </div>
                      <input
                        id="phone" name="phone" type="tel" required
                        value={formData.phone} onChange={handleChange} placeholder="33612345678"
                        className={`w-full pl-10 pr-4 py-3 border rounded-2xl placeholder-gray-600 focus:outline-none focus:border-gold-400/50 focus:ring-4 focus:ring-gold-400/10 transition-all font-medium text-sm ${
                          isDark ? 'bg-space-900/50 border-white/10 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'
                        }`}
                      />
                    </div>
                    <p className="text-[10px] text-gray-500 mt-1 ml-1 italic">Format international requis (ex: 2250700000000)</p>
                  </div>

                  <div className="flex items-start space-x-3 pt-2">
                    <div className="flex items-center h-5">
                      <input
                        id="terms"
                        type="checkbox"
                        checked={acceptTerms}
                        onChange={(e) => setAcceptTerms(e.target.checked)}
                        className="w-4 h-4 rounded border-gray-300 text-gold-500 focus:ring-gold-500"
                      />
                    </div>
                    <label htmlFor="terms" className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                      J'accepte les <Link to="/legal?tab=terms" className="text-gold-400 hover:underline">conditions d'utilisation</Link> et la <Link to="/legal?tab=privacy" className="text-gold-400 hover:underline">politique de confidentialité</Link>.
                    </label>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="flex items-center space-x-3 pt-4">
              {step > 1 && (
                <button
                  type="button"
                  onClick={prevStep}
                  disabled={loading}
                  className={`flex-1 flex items-center justify-center space-x-2 py-3 rounded-2xl font-bold text-sm transition-all duration-300 ${
                    isDark ? 'bg-white/5 text-white hover:bg-white/10' : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
                  } disabled:opacity-50`}
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Retour</span>
                </button>
              )}
              
              {step < 3 ? (
                <button
                  type="button"
                  onClick={nextStep}
                  className="flex-[2] flex items-center justify-center space-x-2 bg-gradient-to-r from-gold-400 to-gold-600 text-black py-3 rounded-2xl font-bold text-sm hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 shadow-lg shadow-gold-500/20 group"
                >
                  <span>Continuer</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-[2] flex items-center justify-center space-x-2 bg-gradient-to-r from-gold-400 to-gold-600 text-black py-3 rounded-2xl font-bold text-sm hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 shadow-lg shadow-gold-500/20 disabled:opacity-50 disabled:hover:scale-100"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                  ) : (
                    <>
                      <span>Créer mon compte</span>
                      <Sparkles className="w-4 h-4" />
                    </>
                  )}
                </button>
              )}
            </div>
          </form>

          {step === 1 && (
            <>
              <div className="relative py-6">
                <div className="absolute inset-0 flex items-center"><div className={`w-full border-t ${isDark ? 'border-white/5' : 'border-gray-100'}`} /></div>
                <div className={`relative flex justify-center text-[10px] font-bold uppercase tracking-widest ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>
                  <span className={`px-3 ${isDark ? 'bg-[#0b0c10]' : 'bg-white'}`}>Ou s'inscrire avec</span>
                </div>
              </div>

              <motion.a
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                href="/api/auth/google"
                className={`w-full flex items-center justify-center gap-3 px-4 py-3 rounded-2xl border transition-all text-sm font-bold ${
                  isDark ? 'border-white/10 bg-white/5 text-white hover:bg-white/10' : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                <span>S'inscrire avec Google</span>
              </motion.a>
            </>
          )}

          <div className="mt-8 pt-6 border-t border-gray-100 dark:border-white/10 text-center">
            <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              Déjà un compte ?{' '}
              <Link to="/login" className="text-gold-500 font-bold hover:text-gold-400 transition-colors">
                Connectez-vous
              </Link>
            </p>
          </div>
        </motion.div>
      </motion.div>
    </div>
  )
}
