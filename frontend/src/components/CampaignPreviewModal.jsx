import React from 'react'
import { createPortal } from 'react-dom'
import { AlertTriangle, Send, XCircle, Users, Eye } from 'lucide-react'
import { useTheme } from '../contexts/ThemeContext'

export default function CampaignPreviewModal({ isOpen, onClose, onConfirm, campaign, isSending }) {
  const { isDark } = useTheme()
  if (!isOpen || !campaign) return null

  // Simulate whatsapp message replacement for preview
  const simulatedMessage = campaign.message
    ? campaign.message
        .replace(/\{\{nom\}\}/gi, '*[Prénom du client]*')
        .replace(/\{\{telephone\}\}/gi, '*[Tel du client]*')
    : ''

  const contactCount = campaign.recipients_count ?? campaign.total_recipients ?? 0

  return createPortal(
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
      onClick={onClose}
    >
      <div 
        className={`relative z-10 w-full max-w-3xl max-h-[90vh] flex flex-col rounded-[2.5rem] shadow-2xl border overflow-hidden ${
          isDark ? 'bg-space-900 border-space-700' : 'bg-white border-gray-200'
        }`}
        onClick={e => e.stopPropagation()}
      >
        <div className={`p-6 sm:p-8 flex items-center gap-4 ${isDark ? 'bg-space-800/50' : 'bg-blue-50/50'}`}>
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-gold-400 to-amber-500 flex items-center justify-center shadow-lg flex-shrink-0">
            <Eye className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className={`text-xl sm:text-2xl font-black italic tracking-tight uppercase ${isDark ? 'text-white' : 'text-gray-900'}`}>Aperçu avant envoi</h2>
            <p className={`text-sm mt-1 truncate ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>{campaign.name}</p>
          </div>
          <button onClick={onClose} className={`p-2 rounded-xl transition-all ${isDark ? 'hover:bg-space-700 text-gray-500 hover:text-white' : 'hover:bg-gray-200 text-gray-500 hover:text-black'}`}>
            <XCircle className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 sm:p-8 flex flex-col md:flex-row gap-8">
          
          {/* Left: Summary & Warning */}
          <div className="flex-1 space-y-6">
             <div className={`p-5 rounded-3xl border ${isDark ? 'bg-amber-500/10 border-amber-500/20 text-amber-500' : 'bg-amber-50 border-amber-200 text-amber-700'}`}>
                <div className="flex items-start gap-3">
                    <AlertTriangle className="w-6 h-6 flex-shrink-0 mt-0.5" />
                    <div>
                        <h4 className="font-bold text-lg mb-1">Attention, envoi imminent</h4>
                        <p className="text-sm opacity-90 leading-relaxed">
                            Vous êtes sur le point d'envoyer ce message à <strong className="font-black text-lg mx-1">{contactCount}</strong> contact{contactCount !== 1 ? 's' : ''}. 
                            <br/>Assurez-vous que l'aperçu soit exact, car une fois lancé, l'envoi ne peut être annulé qu'en mettant en pause.
                        </p>
                    </div>
                </div>
             </div>

             <div>
                <h4 className={`text-[10px] font-black uppercase tracking-widest mb-3 ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>Statistiques cibles</h4>
                <div className={`flex items-center gap-3 p-4 rounded-2xl border ${isDark ? 'bg-space-800/30 border-space-700' : 'bg-gray-50 border-gray-100'}`}>
                    <div className={`p-3 rounded-xl ${isDark ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-100 text-blue-600'}`}>
                        <Users className="w-5 h-5" />
                    </div>
                    <div>
                        <p className={`text-sm font-bold ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>{contactCount} Destinataires</p>
                        <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>Qui recevront ce message</p>
                    </div>
                </div>
             </div>
          </div>

          {/* Right: Phone Simulation */}
          <div className="flex-shrink-0 w-full md:w-[320px] flex justify-center">
            <div className={`relative w-[280px] h-[520px] rounded-[3rem] p-2 sm:p-3 border-[6px] shadow-2xl flex flex-col overflow-hidden ${isDark ? 'border-space-950 bg-[#c7d5db]/10' : 'border-gray-900 bg-[#efeae2]'}`}>
                {/* Notch */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 bg-current rounded-b-2xl z-20" style={{ color: isDark ? '#020617' : '#111827' }} />
                
                {/* Screen Header */}
                <div className="bg-[#00a884] h-20 pt-8 px-4 flex items-center gap-3 z-10 shadow-sm relative rounded-t-[2.2rem]">
                    <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                        <Users className="w-4 h-4 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-white font-semibold text-sm truncate">Vos Contacts</p>
                    </div>
                </div>

                {/* WhatsApp Chat Area */}
                <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2 relative z-10 custom-scrollbar" style={{ backgroundImage: 'url("https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png")', backgroundSize: 'cover', opacity: 0.9 }}>
                    <div className="self-center bg-[#e1f3fb] text-gray-600 text-[10px] px-3 py-1 rounded-lg mt-2 shadow-sm font-medium">Aujourd'hui</div>
                    
                    {/* Simulated Bubble */}
                    <div className="bg-white p-3 rounded-2xl rounded-tl-sm shadow-sm max-w-[90%] self-start mt-2 relative">
                        {/* Tail pointer */}
                        <div className="absolute top-0 -left-2 w-2 h-3 bg-white" style={{ clipPath: 'polygon(100% 0, 0 0, 100% 100%)' }} />
                        <p className="text-gray-800 text-[13px] whitespace-pre-wrap leading-relaxed">{simulatedMessage}</p>
                        <p className="text-right text-[10px] text-gray-400 mt-1 uppercase">12:34</p>
                    </div>
                </div>
            </div>
          </div>
        </div>

        <div className={`p-6 border-t flex flex-col sm:flex-row gap-3 ${isDark ? 'border-space-700 bg-space-800/30' : 'border-gray-200 bg-gray-50/50'}`}>
            <button
                onClick={onClose}
                disabled={isSending}
                className="flex-1 py-4 px-6 rounded-2xl font-bold bg-gray-500/10 hover:bg-gray-500/20 text-gray-400 hover:text-white transition-all border border-transparent hover:border-gray-500/30"
            >
                Non, Annuler l'envoi
            </button>
            <button
                onClick={() => onConfirm(campaign.id)}
                disabled={isSending}
                className="flex-1 py-4 px-6 rounded-2xl font-syne font-black italic bg-emerald-500 text-white hover:bg-emerald-400 transition-all hover:-translate-y-1 active:translate-y-0 shadow-lg flex items-center justify-center gap-2 group disabled:opacity-50 disabled:grayscale disabled:scale-100 disabled:pointer-events-none border border-emerald-400/50"
            >
                <span>🚀 Confirmer & Envoyer</span>
                <Send className="w-5 h-5 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
            </button>
        </div>
      </div>
    </div>,
    document.body
  )
}
