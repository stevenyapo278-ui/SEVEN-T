import { useState } from 'react'
import { useNavigate, Navigate } from 'react-router-dom'
import { usePartnerAuth } from '../../contexts/PartnerAuthContext'
import { LogIn, Loader2, AlertCircle } from 'lucide-react'
import toast from 'react-hot-toast'

export default function PartnerLogin() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { partner, loginPartner } = usePartnerAuth()
  const navigate = useNavigate()

  // Redirect to dashboard if already logged in as partner
  if (partner) {
    return <Navigate to="/partner/dashboard" replace />
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsSubmitting(true)
    
    try {
      await loginPartner(email, password)
      toast.success('Connexion réussie')
      navigate('/partner/dashboard')
    } catch (error) {
      toast.error(error.response?.data?.error || 'Email ou mot de passe incorrect')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-space-950 flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute top-0 left-0 right-0 h-96 bg-gradient-to-b from-gold-500/10 to-transparent pointer-events-none" />
      <div className="absolute -top-48 -left-48 w-96 h-96 bg-gold-500/10 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute top-1/2 right-0 w-96 h-96 bg-gold-500/5 blur-[120px] rounded-full pointer-events-none translate-x-1/2" />

      <div className="max-w-md w-full relative z-10">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-gold-400 to-gold-600 mb-6 shadow-xl shadow-gold-500/20">
            <span className="text-3xl font-bold text-white">7</span>
          </div>
          <h1 className="text-3xl font-display font-bold text-white mb-2">
            Portail Partenaire
          </h1>
          <p className="text-gray-400">
            Connectez-vous pour accéder à votre tableau de bord influenceur
          </p>
        </div>

        <div className="bg-space-900 border border-space-700/50 rounded-2xl p-8 shadow-xl relative overflow-hidden">
          {/* Subtle inner reflection */}
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-space-600/50 to-transparent" />

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Adresse Email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-space-800 border-space-700 focus:border-gold-400 focus:ring-gold-400/20 text-white rounded-xl py-3 px-4 shadow-sm"
                placeholder="votre.email@exemple.com"
                disabled={isSubmitting}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Mot de Passe
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-space-800 border-space-700 focus:border-gold-400 focus:ring-gold-400/20 text-white rounded-xl py-3 px-4 shadow-sm"
                placeholder="••••••••"
                disabled={isSubmitting}
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full flex items-center justify-center py-3 px-4 rounded-xl text-white bg-gradient-to-r from-gold-400 to-gold-500 hover:from-gold-500 hover:to-gold-600 focus:outline-none focus:ring-2 focus:ring-gold-400/50 focus:ring-offset-2 focus:ring-offset-space-900 transition-all font-medium shadow-lg shadow-gold-500/20 disabled:opacity-50 disabled:cursor-not-allowed group"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-5 h-5 mr-3 animate-spin" />
                  Connexion...
                </>
              ) : (
                <>
                  <LogIn className="w-5 h-5 mr-3 group-hover:translate-x-1 transition-transform" />
                  Se connecter
                </>
              )}
            </button>
          </form>
          
          <div className="mt-6 flex items-start gap-3 p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl">
             <AlertCircle className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
             <p className="text-sm text-blue-300">
               Cet espace est strictement réservé aux influenceurs et partenaires de Seven T. Les comptes utilisateurs classiques ne peuvent pas s'y connecter.
             </p>
          </div>
        </div>
      </div>
    </div>
  )
}
