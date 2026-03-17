import { Outlet, Navigate, useNavigate } from 'react-router-dom'
import { usePartnerAuth } from '../contexts/PartnerAuthContext'
import { LogOut, Menu, X, Crown } from 'lucide-react'
import { useState } from 'react'

export default function PartnerLayout() {
  const { partner, loading, logoutPartner } = usePartnerAuth()
  const navigate = useNavigate()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  if (loading) {
    return (
      <div className="min-h-screen bg-space-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gold-400" />
      </div>
    )
  }

  if (!partner) {
    return <Navigate to="/partner/login" replace />
  }

  const handleLogout = async () => {
    await logoutPartner()
    navigate('/partner/login')
  }

  return (
    <div className="min-h-screen bg-space-950 flex flex-col font-sans transition-colors duration-200">
      {/* Top Navbar */}
      <nav className="bg-space-900 border-b border-space-800 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-gold-400 to-gold-600 flex items-center justify-center shadow-lg shadow-gold-500/20">
                <span className="text-white font-bold text-lg">7</span>
              </div>
              <span className="font-display font-bold text-xl text-white tracking-wide">
                Seven T <span className="text-gold-400 font-medium">Partenaire</span>
              </span>
            </div>

            {/* Desktop Nav */}
            <div className="hidden md:flex items-center gap-6">
              <div className="flex items-center gap-2 text-gray-300 bg-space-800/50 px-4 py-1.5 rounded-full border border-space-700/50">
                 <Crown className="w-4 h-4 text-gold-400" />
                 <span className="text-sm font-medium">{partner.name || partner.email}</span>
              </div>
              
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 text-gray-400 hover:text-white hover:bg-space-800 px-3 py-2 rounded-lg transition-colors"
                title="Se déconnecter"
              >
                <LogOut className="w-5 h-5" />
                <span className="text-sm font-medium">Déconnexion</span>
              </button>
            </div>

            {/* Mobile menu button */}
            <div className="md:hidden flex items-center">
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="text-gray-400 hover:text-white focus:outline-none p-2"
              >
                {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-space-800 bg-space-900">
            <div className="px-4 py-3 border-b border-space-800">
              <div className="flex items-center gap-2 text-gray-300">
                 <Crown className="w-4 h-4 text-gold-400" />
                 <span className="text-sm font-medium truncate">{partner.name || partner.email}</span>
              </div>
            </div>
            <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
              <button
                onClick={handleLogout}
                className="flex items-center gap-3 w-full text-left px-3 py-2 rounded-md text-base font-medium text-red-400 hover:text-red-300 hover:bg-space-800"
              >
                <LogOut className="w-5 h-5" />
                Déconnexion
              </button>
            </div>
          </div>
        )}
      </nav>

      {/* Main Content */}
      <main className="flex-1 w-full relative z-0">
        <Outlet />
      </main>
    </div>
  )
}
