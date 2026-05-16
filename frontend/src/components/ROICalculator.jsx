import { useState } from 'react'
import { TrendingUp, Users, ShoppingCart, ArrowRight } from 'lucide-react'

export default function ROICalculator({ isDark = true }) {
  const [leads, setLeads] = useState(500)
  const [conversion, setConversion] = useState(5)
  const [basket, setBasket] = useState(25000)

  // Estimations : SEVEN-T augmente le taux de conversion de ~30%
  // et réduit le temps de réponse drastiquement.
  const currentRevenue = leads * (conversion / 100) * basket
  const boostedConversion = conversion * 1.35 // +35% boost
  const boostedRevenue = leads * (boostedConversion / 100) * basket
  const gain = boostedRevenue - currentRevenue

  const text = isDark ? 'text-white' : 'text-gray-900'
  const textMuted = isDark ? 'text-gray-400' : 'text-gray-600'
  const bgCard = isDark ? 'bg-white/5 border-white/10' : 'bg-white border-gray-200 shadow-sm'

  return (
    <div className={`p-8 md:p-12 rounded-[2.5rem] border ${bgCard}`}>
      <div className="grid lg:grid-cols-2 gap-12 items-center">
        <div>
          <h3 className={`text-3xl font-bold mb-6 ${text}`}>Estimez votre gain de croissance</h3>
          <p className={`mb-8 ${textMuted}`}>
            Voyez comment l'automatisation et la réponse instantanée impactent directement votre chiffre d'affaires sur WhatsApp.
          </p>

          <div className="space-y-8">
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <label className={`text-sm font-semibold ${textMuted}`}>Leads WhatsApp / mois</label>
                <span className={`px-3 py-1 rounded-lg bg-amber-500/10 text-amber-500 font-bold`}>{leads}</span>
              </div>
              <input 
                type="range" min="50" max="5000" step="50" 
                value={leads} onChange={(e) => setLeads(parseInt(e.target.value))}
                className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-amber-500"
              />
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <label className={`text-sm font-semibold ${textMuted}`}>Taux de conversion actuel (%)</label>
                <span className={`px-3 py-1 rounded-lg bg-blue-500/10 text-blue-500 font-bold`}>{conversion}%</span>
              </div>
              <input 
                type="range" min="1" max="20" step="1" 
                value={conversion} onChange={(e) => setConversion(parseInt(e.target.value))}
                className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
              />
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <label className={`text-sm font-semibold ${textMuted}`}>Panier moyen (FCFA)</label>
                <span className={`px-3 py-1 rounded-lg bg-emerald-500/10 text-emerald-500 font-bold`}>{basket.toLocaleString()}</span>
              </div>
              <input 
                type="range" min="1000" max="200000" step="1000" 
                value={basket} onChange={(e) => setBasket(parseInt(e.target.value))}
                className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
              />
            </div>
          </div>
        </div>

        <div className="relative">
          <div className={`p-8 rounded-3xl bg-gradient-to-br ${isDark ? 'from-amber-500/20 to-orange-500/10' : 'from-amber-50 to-orange-50'} border border-amber-500/20 text-center`}>
            <div className={`inline-flex p-3 rounded-2xl bg-amber-500 ${isDark ? 'text-black' : 'text-white'} mb-6`}>
              <TrendingUp size={24} />
            </div>
            <p className={`text-sm uppercase tracking-widest font-bold mb-2 ${textMuted}`}>Gain mensuel estimé</p>
            <h4 className={`text-4xl md:text-5xl font-black text-amber-500 mb-6`}>
              +{Math.round(gain).toLocaleString()} FCFA
            </h4>
            
            <div className="space-y-3 mb-8">
               <div className="flex items-center justify-between text-xs p-3 rounded-xl bg-black/20">
                  <span className={textMuted}>CA Actuel :</span>
                  <span className={text}>{Math.round(currentRevenue).toLocaleString()} FCFA</span>
               </div>
               <div className="flex items-center justify-between text-xs p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                  <span className="text-emerald-500 font-bold">CA avec SEVEN-T :</span>
                  <span className="text-emerald-500 font-bold">{Math.round(boostedRevenue).toLocaleString()} FCFA</span>
               </div>
            </div>

            <p className={`text-[10px] ${textMuted} italic mb-8`}>
              *Basé sur une augmentation moyenne de 35% du taux de conversion observée sur nos clients utilisant l'IA.
            </p>

            <button className={`w-full py-4 bg-amber-500 ${isDark ? 'text-black' : 'text-white'} rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-amber-400 transition-all shadow-lg shadow-amber-500/20`}>
              Capturer ce gain maintenant <ArrowRight size={18} />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
