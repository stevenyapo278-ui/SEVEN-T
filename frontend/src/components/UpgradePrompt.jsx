import { Link } from 'react-router-dom'
import { Sparkles, Crown } from 'lucide-react'

export default function UpgradePrompt({ 
  title, 
  description, 
  icon: Icon = Crown,
  ctaText = "Mettre à niveau mon plan"
}) {
  return (
    <div className="card p-6 border border-gold-400/20 bg-gradient-to-br from-space-800 to-space-900 text-center relative overflow-hidden">
      {/* Decorative background flair */}
      <div className="absolute top-0 right-0 p-8 opacity-5">
        <Sparkles className="w-32 h-32" />
      </div>
      <div className="relative z-10 flex flex-col items-center">
        <div className="w-12 h-12 rounded-full bg-gold-400/10 flex items-center justify-center mb-4">
          <Icon className="w-6 h-6 text-gold-400" />
        </div>
        <h3 className="text-lg font-display font-semibold text-gray-100 mb-2">
          {title}
        </h3>
        <p className="text-gray-400 mb-6 max-w-sm">
          {description}
        </p>
        <Link 
          to="/dashboard/settings?tab=subscription" 
          className="btn-primary"
        >
          <Sparkles className="w-4 h-4 mr-2" />
          {ctaText}
        </Link>
      </div>
    </div>
  )
}
