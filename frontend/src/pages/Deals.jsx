import React from 'react'
import { Briefcase, Clock } from 'lucide-react'

export default function Deals() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6 pb-20">
      <div className="w-16 h-16 bg-blue-500/10 rounded-2xl flex items-center justify-center mb-6 border border-blue-500/20">
        <Briefcase className="w-8 h-8 text-blue-400" />
      </div>
      <h1 className="text-2xl font-bold text-gray-100 mb-2">Gestion des Deals</h1>
      <p className="text-gray-400 max-w-md mx-auto mb-8">
        Le module de gestion des opportunités commerciales est en cours de développement. 
        Bientôt, vous pourrez suivre vos ventes de la qualification à la clôture.
      </p>
      <div className="flex items-center gap-2 px-4 py-2 bg-space-800/50 rounded-full border border-space-700">
        <Clock className="w-4 h-4 text-amber-400" />
        <span className="text-sm font-medium text-amber-400">Arrive prochainement</span>
      </div>
    </div>
  )
}
