import { useEffect } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { Loader2 } from 'lucide-react'

export default function AuthCallback() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { exchangeCode, loginWithToken } = useAuth()

  useEffect(() => {
    const code = searchParams.get('code')
    const token = searchParams.get('token') // Fallback during migration
    const error = searchParams.get('error')

    if (error) {
      navigate(`/login?error=${encodeURIComponent(error)}`, { replace: true })
      return
    }

    if (code || token) {
      const finish = async () => {
        try {
          if (code) {
            await exchangeCode(code)
          } else if (token) {
            await loginWithToken(token)
          }
          navigate('/dashboard', { replace: true })
        } catch {
          navigate('/login', { replace: true })
        }
      }
      finish()
    } else {
      navigate('/login', { replace: true })
    }
  }, [searchParams, navigate, loginWithToken])

  return (
    <div className="min-h-screen bg-space-950 flex flex-col items-center justify-center">
      <Loader2 className="w-10 h-10 text-gold-400 animate-spin mb-4" />
      <p className="text-gray-400">Connexion en cours...</p>
      <Link to="/login" className="mt-4 text-sm text-gold-400 hover:text-gold-300">
        Retour à la connexion
      </Link>
    </div>
  )
}
