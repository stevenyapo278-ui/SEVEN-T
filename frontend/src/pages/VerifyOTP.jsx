import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { KeyRound, ArrowRight, RefreshCw, Sparkles, CheckCircle2 } from 'lucide-react'
import { motion } from 'framer-motion'
import AnimatedBackground from '../components/AnimatedBackground'
import { useTheme } from '../contexts/ThemeContext'
import toast from 'react-hot-toast'
import api from '../services/api'

const Logo = () => (
  <img src="/logo.svg" alt="SEVEN T" className="h-10 w-auto object-contain" />
)

export default function VerifyOTP() {
  const [otp, setOtp] = useState(['', '', '', '', '', ''])
  const [loading, setLoading] = useState(false)
  const [resendLoading, setResendLoading] = useState(false)
  const [countdown, setCountdown] = useState(60)
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const { user, refreshUser } = useAuth()
  const navigate = useNavigate()
  const inputRefs = useRef([])

  useEffect(() => {
    if (user?.email_verified === 1) {
      navigate('/dashboard', { replace: true })
    }
  }, [user, navigate])

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(c => c - 1), 1000)
      return () => clearTimeout(timer)
    }
  }, [countdown])

  const handleChange = (index, value) => {
    if (!/^\d*$/.test(value)) return
    const newOtp = [...otp]
    newOtp[index] = value.substring(value.length - 1)
    setOtp(newOtp)

    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus()
    }
  }

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
  }

  const handlePaste = (e) => {
    e.preventDefault()
    const pastedData = e.clipboardData.getData('text').slice(0, 6).split('')
    if (pastedData.some(char => !/^\d$/.test(char))) return

    const newOtp = [...otp]
    pastedData.forEach((char, i) => {
      if (i < 6) newOtp[i] = char
    })
    setOtp(newOtp)
    inputRefs.current[Math.min(pastedData.length, 5)]?.focus()
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const code = otp.join('')
    if (code.length < 6) {
      toast.error('Veuillez entrer le code à 6 chiffres')
      return
    }

    setLoading(true)
    try {
      const response = await api.post('/auth/verify-otp', { otp: code })
      toast.success(response.data.message || 'Compte vérifié avec succès !')
      await refreshUser()
      navigate('/dashboard', { replace: true })
    } catch (error) {
      const errorData = error.response?.data
      toast.error(errorData?.error || 'Code de vérification invalide')
    } finally {
      setLoading(false)
    }
  }

  const handleResend = async () => {
    if (countdown > 0 || resendLoading) return
    setResendLoading(true)
    try {
      await api.post('/auth/resend-otp')
      toast.success('Nouveau code envoyé par email')
      setCountdown(60)
    } catch (error) {
      const errorData = error.response?.data
      toast.error(errorData?.error || 'Erreur lors de l\'envoi du code')
    } finally {
      setResendLoading(false)
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
          <div className="inline-flex items-center justify-center mb-6 hover:scale-105 transition-transform duration-300 cursor-pointer" onClick={() => navigate('/')}>
            <Logo />
          </div>
          <h2 className={`text-3xl sm:text-4xl font-display font-bold tracking-tight ${isDark ? 'text-white' : 'text-gray-900'}`}>
            Vérifiez votre email
          </h2>
          <p className={`mt-3 text-sm sm:text-base ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
            Nous avons envoyé un code de sécurité à 6 chiffres à l'adresse{' '}
            <strong className={isDark ? 'text-white' : 'text-gray-900'}>{user?.email}</strong>
          </p>
        </motion.div>

        <motion.div 
          variants={itemVariants}
          className={`backdrop-blur-xl border rounded-[2.5rem] p-6 sm:p-10 shadow-2xl relative overflow-hidden transition-all duration-500 ${
            isDark ? 'bg-white/[0.03] border-white/[0.08] shadow-black/50' : 'bg-white border-gray-100 shadow-gray-200'
          }`}
        >
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-gold-400/20 to-transparent" />
          
          <div className="flex justify-center mb-8">
            <div className={`w-16 h-16 rounded-3xl flex items-center justify-center ring-8 ${
              isDark ? 'bg-gold-500/10 text-gold-400 ring-gold-50/5' : 'bg-gold-50 text-gold-600 ring-gold-100/50'
            }`}>
              <KeyRound className="w-8 h-8" />
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="block text-xs font-bold uppercase tracking-widest text-center text-gray-500">
                Code de vérification
              </label>
              <div 
                className="flex justify-center gap-2 sm:gap-3 my-4"
                onPaste={handlePaste}
              >
                {otp.map((digit, index) => (
                  <input
                    key={index}
                    ref={el => inputRefs.current[index] = el}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={e => handleChange(index, e.target.value)}
                    onKeyDown={e => handleKeyDown(index, e)}
                    className={`w-11 h-14 sm:w-12 sm:h-16 text-center font-display text-xl sm:text-2xl font-bold border rounded-2xl focus:outline-none focus:border-gold-400 focus:ring-4 focus:ring-gold-400/10 transition-all ${
                      isDark ? 'bg-space-900/50 border-white/10 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'
                    }`}
                  />
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || otp.join('').length < 6}
              className="w-full flex items-center justify-center space-x-2 bg-gradient-to-r from-gold-400 to-gold-600 text-black py-4 rounded-2xl font-bold text-sm hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 shadow-lg shadow-gold-500/20 disabled:opacity-50 disabled:hover:scale-100 disabled:cursor-not-allowed group"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
              ) : (
                <>
                  <span>Valider mon compte</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-gray-100 dark:border-white/10 text-center space-y-4">
            <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              Vous n'avez pas reçu le code ?
            </p>
            <button
              type="button"
              onClick={handleResend}
              disabled={countdown > 0 || resendLoading}
              className={`inline-flex items-center space-x-2 text-sm font-bold transition-colors ${
                countdown > 0 
                  ? 'text-gray-500 cursor-not-allowed' 
                  : 'text-gold-500 hover:text-gold-400'
              }`}
            >
              {resendLoading ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className={`w-4 h-4 ${countdown > 0 ? '' : 'animate-spin-hover'}`} />
              )}
              <span>
                {countdown > 0 ? `Renvoyer le code dans ${countdown}s` : 'Renvoyer le code'}
              </span>
            </button>
          </div>
        </motion.div>
      </motion.div>
    </div>
  )
}
