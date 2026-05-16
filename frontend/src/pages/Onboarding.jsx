import { useState, useEffect } from 'react'
import { useNavigate, Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { Building, ArrowRight, Sparkles, Check, ArrowLeft, Phone } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import AnimatedBackground from '../components/AnimatedBackground'
import { useTheme } from '../contexts/ThemeContext'
import toast from 'react-hot-toast'
import api from '../services/api'

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

export default function Onboarding() {
  const { user, updateUser, loading: authLoading } = useAuth()
  const [step, setStep] = useState(1)
  const [formData, setFormData] = useState({
    company: '',
    industry: '',
    job_title: '',
    company_size: '',
    primary_goal: '',
    notification_number: ''
  })
  const [loading, setLoading] = useState(false)
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const navigate = useNavigate()

  useEffect(() => {
    if (user) {
      setFormData(prev => ({
        ...prev,
        company: user.company || '',
        industry: user.industry || '',
        job_title: user.job_title || '',
        company_size: user.company_size || '',
        primary_goal: user.primary_goal || '',
        notification_number: user.notification_number || ''
      }))
    }
  }, [user])

  if (authLoading) return null
  if (!user) return <Navigate to="/login" replace />
  if (user.onboarding_completed) return <Navigate to="/dashboard" replace />

  const handleChange = (e) => {
    let value = e.target.value;
    if (e.target.name === 'notification_number' || e.target.name === 'phone') {
      value = value.replace(/[^\d]/g, '');
    }
    setFormData({ ...formData, [e.target.name]: value })
  }

  const nextStep = () => {
    if (step === 1) {
      if (!formData.company || !formData.job_title || !formData.industry) {
        return toast.error('Veuillez remplir les informations sur votre entreprise')
      }
    }
    setStep(prev => prev + 1)
  }

  const prevStep = () => setStep(prev => prev - 1)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (step !== 2) return
    
    if (!formData.notification_number || !formData.primary_goal) {
      toast.error('Veuillez remplir toutes les informations')
      return
    }

    setLoading(true)
    try {
      const response = await api.put('/auth/me', formData)
      updateUser(response.data.user)
      toast.success('Profil complété ! Bienvenue chez SEVEN-T')
      navigate('/dashboard')
    } catch (error) {
      toast.error(error.response?.data?.error || 'Erreur lors de la mise à jour')
    } finally {
      setLoading(false)
    }
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

  const StepIndicator = () => (
    <div className="flex items-center justify-center space-x-4 mb-8">
      {[1, 2].map((s) => (
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
          {s < 2 && (
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
          <div className="inline-flex items-center justify-center mb-6">
            <Logo />
          </div>
          <h2 className={`text-3xl sm:text-4xl font-display font-bold tracking-tight ${isDark ? 'text-white' : 'text-gray-900'}`}>
            {step === 1 ? 'Votre entreprise' : 'Dernière étape'}
          </h2>
          <p className={`mt-3 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
            {step === 1 
              ? 'Dites-nous en plus sur votre business.' 
              : 'Finalisons votre configuration personnalisée.'}
          </p>
        </motion.div>

        <motion.div 
          variants={itemVariants}
          className={`backdrop-blur-xl border rounded-[2.5rem] p-5 sm:p-10 shadow-2xl relative overflow-hidden transition-all duration-500 ${
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
                        className={`w-full pl-12 pr-4 py-3.5 border rounded-2xl placeholder-gray-600 focus:outline-none focus:border-gold-400/50 focus:ring-4 focus:ring-gold-400/10 transition-all font-medium text-sm ${
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
                      className={`w-full px-4 py-3.5 border rounded-2xl focus:outline-none focus:border-gold-400/50 focus:ring-4 focus:ring-gold-400/10 transition-all font-medium text-sm ${
                        isDark ? 'bg-space-900/50 border-white/10 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'
                      } appearance-none cursor-pointer text-ellipsis overflow-hidden`}
                    >
                      <option value="">Sélectionnez votre rôle</option>
                      {ROLES.map(role => <option key={role} value={role}>{role}</option>)}
                    </select>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label htmlFor="company_size" className="block text-xs font-bold uppercase tracking-widest text-gray-500 ml-1">
                        Taille
                      </label>
                      <select
                        id="company_size" name="company_size" required
                        value={formData.company_size} onChange={handleChange}
                        className={`w-full px-4 py-3.5 border rounded-2xl focus:outline-none focus:border-gold-400/50 focus:ring-4 focus:ring-gold-400/10 transition-all font-medium text-sm ${
                          isDark ? 'bg-space-900/50 border-white/10 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'
                        } appearance-none cursor-pointer text-ellipsis overflow-hidden`}
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
                        className={`w-full px-4 py-3.5 border rounded-2xl focus:outline-none focus:border-gold-400/50 focus:ring-4 focus:ring-gold-400/10 transition-all font-medium text-sm ${
                          isDark ? 'bg-space-900/50 border-white/10 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'
                        } appearance-none cursor-pointer text-ellipsis overflow-hidden`}
                      >
                        <option value="">Industrie</option>
                        {INDUSTRIES.map(ind => <option key={ind} value={ind}>{ind}</option>)}
                      </select>
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
                    <label htmlFor="primary_goal" className="block text-xs font-bold uppercase tracking-widest text-gray-500 ml-1">
                      Objectif principal
                    </label>
                    <select
                      id="primary_goal" name="primary_goal" required
                      value={formData.primary_goal} onChange={handleChange}
                      className={`w-full px-4 py-3.5 border rounded-2xl focus:outline-none focus:border-gold-400/50 focus:ring-4 focus:ring-gold-400/10 transition-all font-medium text-sm ${
                        isDark ? 'bg-space-900/50 border-white/10 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'
                      } appearance-none cursor-pointer text-ellipsis overflow-hidden`}
                    >
                      <option value="">Que souhaitez-vous faire ?</option>
                      {GOALS.map(goal => <option key={goal} value={goal}>{goal}</option>)}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="notification_number" className="block text-xs font-bold uppercase tracking-widest text-gray-500 ml-1">
                      Numéro de téléphone
                    </label>
                    <div className="group/input relative">
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within/input:text-gold-400 transition-colors pointer-events-none text-sm font-bold">
                        +
                      </div>
                      <input
                        id="notification_number" name="notification_number" type="tel" required
                        value={formData.notification_number} onChange={handleChange} placeholder="33612345678"
                        className={`w-full pl-10 pr-4 py-3.5 border rounded-2xl placeholder-gray-600 focus:outline-none focus:border-gold-400/50 focus:ring-4 focus:ring-gold-400/10 transition-all font-medium text-sm ${
                          isDark ? 'bg-space-900/50 border-white/10 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'
                        }`}
                      />
                    </div>
                    <p className="text-[10px] text-gray-500 mt-1 ml-1 italic">Format international requis (ex: 2250700000000)</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-4">
              {step > 1 && (
                <button
                  type="button"
                  onClick={prevStep}
                  disabled={loading}
                  className={`w-full sm:w-auto flex-1 flex items-center justify-center space-x-2 py-3.5 px-4 rounded-2xl font-bold text-sm transition-all duration-300 ${
                    isDark ? 'bg-white/5 text-white hover:bg-white/10' : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
                  } disabled:opacity-50 order-2 sm:order-1`}
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Retour</span>
                </button>
              )}
              
              {step < 2 ? (
                <button
                  type="button"
                  onClick={nextStep}
                  className={`w-full sm:w-auto flex-[2] flex items-center justify-center space-x-2 bg-gradient-to-r from-gold-400 to-gold-600 ${isDark ? 'text-black' : 'text-white'} py-3.5 px-4 rounded-2xl font-bold text-sm hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 shadow-lg shadow-gold-500/20 group order-1 sm:order-2`}
                >
                  <span>Continuer</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={loading}
                  className={`w-full sm:w-auto flex-[2] flex items-center justify-center space-x-2 bg-gradient-to-r from-gold-400 to-gold-600 ${isDark ? 'text-black' : 'text-white'} py-3.5 px-4 rounded-2xl font-bold text-sm hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 shadow-lg shadow-gold-500/20 disabled:opacity-50 disabled:hover:scale-100 order-1 sm:order-2`}
                >
                  {loading ? (
                    <div className={`w-5 h-5 border-2 ${isDark ? 'border-black/30 border-t-black' : 'border-white/30 border-t-white'} rounded-full animate-spin`} />
                  ) : (
                    <>
                      <span>Terminer l'installation</span>
                      <Sparkles className="w-4 h-4" />
                    </>
                  )}
                </button>
              )}
            </div>
          </form>
        </motion.div>
      </motion.div>
    </div>
  )
}
