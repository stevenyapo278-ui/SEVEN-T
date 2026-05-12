import React from "react";
import { motion } from "framer-motion";
import { Activity, MessageSquare, ShoppingCart, ArrowRight, Zap, Bot } from "lucide-react";
import { cn } from "../../../utils/cn";

const WhatsAppPreview = () => {
  return (
    <div className="relative h-full overflow-hidden border-l border-white/5 bg-black font-sans">
      {/* WhatsApp UI Mockup */}
      <div className="pointer-events-none absolute inset-0 select-none p-4 opacity-40">
         <div className="flex flex-col gap-3">
            {[1, 2, 3, 4, 5].map(i => (
               <div key={i} className="flex gap-3 items-center">
                  <div className="w-10 h-10 rounded-full bg-zinc-800" />
                  <div className="flex-1 space-y-2">
                     <div className="h-2 w-24 bg-zinc-800 rounded" />
                     <div className="h-2 w-full bg-zinc-900 rounded" />
                  </div>
               </div>
            ))}
         </div>
      </div>

      {/* Floating Chat Card */}
      <div className="absolute left-1/2 top-1/2 z-10 w-[90%] max-w-sm -translate-x-1/2 -translate-y-1/2">
        <motion.div 
          whileHover={{ scale: 1.02 }}
          className="overflow-hidden rounded-3xl border border-white/10 bg-zinc-950 shadow-[0_30px_60px_-12px_rgba(0,0,0,1)] transition-all duration-700 ease-out"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-white/5 bg-white/[0.02] p-4">
            <div className="flex items-center gap-3">
               <div className="w-10 h-10 rounded-full bg-amber-500/20 border border-amber-500/30 flex items-center justify-center">
                  <Bot className="w-5 h-5 text-amber-500" />
               </div>
               <div>
                 <h4 className="font-semibold text-sm text-white">Agent SEVEN T</h4>
                 <div className="mt-0.5 flex items-center gap-1.5">
                   <span className="relative flex h-1.5 w-1.5">
                     <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                     <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
                   </span>
                   <p className="text-[10px] font-medium text-emerald-500 uppercase tracking-widest">
                     Actif 24h/24
                   </p>
                 </div>
               </div>
            </div>
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/5 text-white/40">
              <Zap className="h-4 w-4" />
            </div>
          </div>

          {/* Chat Bubble */}
          <div className="p-4 space-y-4">
             <motion.div 
               initial={{ opacity: 0, x: -20 }}
               whileInView={{ opacity: 1, x: 0 }}
               className="bg-zinc-800/50 p-3 rounded-2xl rounded-tl-none max-w-[85%]"
             >
                <p className="text-xs text-gray-300">Bonjour ! Je suis intéressé par la montre de luxe que vous avez postée en statut.</p>
             </motion.div>

             <motion.div 
               initial={{ opacity: 0, x: 20 }}
               whileInView={{ opacity: 1, x: 0 }}
               transition={{ delay: 0.5 }}
               className="bg-amber-500/10 border border-amber-500/20 p-3 rounded-2xl rounded-tr-none max-w-[85%] ml-auto"
             >
                <p className="text-xs text-amber-200">Excellent choix ! Elle est disponible en stock. Souhaitez-vous voir le catalogue ou commander directement ?</p>
                <div className="mt-2 flex gap-2">
                   <span className="text-[10px] bg-amber-500/20 text-amber-400 px-2 py-1 rounded-full border border-amber-500/20">Voir Catalogue</span>
                   <span className="text-[10px] bg-amber-500 text-black px-2 py-1 rounded-full font-bold">Commander</span>
                </div>
             </motion.div>

             <motion.div 
               initial={{ opacity: 0, y: 10 }}
               whileInView={{ opacity: 1, y: 0 }}
               transition={{ delay: 1 }}
               className="flex items-center gap-2 pt-2 border-t border-white/5"
             >
                <ShoppingCart className="w-3.5 h-3.5 text-gray-500" />
                <span className="text-[10px] text-gray-500 uppercase tracking-widest">Stock mis à jour automatiquement</span>
             </motion.div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export const Features = () => {
  return (
    <section id="features" className="relative z-20 mx-auto w-full max-w-7xl px-6 py-20 md:px-2 md:py-32">
      {/* Mobile Layout: Simple, Clean, No Card */}
      <div className="lg:hidden space-y-12">
        <div className="flex flex-col items-center text-center space-y-6">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-amber-500/20 bg-zinc-900">
            <MessageSquare className="h-6 w-6 text-amber-500" />
          </div>
          <h2 className="font-manrope text-3xl font-bold tracking-tight text-white leading-tight">
            Automatisation WhatsApp <span className="text-amber-500">Intelligente</span>
          </h2>
          <div className="space-y-4 font-sans text-lg text-gray-400">
            <p>
              Ne laissez plus un client attendre. Nos agents IA qualifient vos prospects, 
              répondent à leurs questions et concluent des ventes 24h/24.
            </p>
            <p>
              Grâce à une intégration profonde avec vos stocks et vos catalogues, 
              SEVEN T transforme votre WhatsApp en une véritable machine de vente autonome.
            </p>
          </div>
          <button className="flex items-center gap-2 text-sm font-bold text-amber-500 uppercase tracking-widest pt-4">
            Découvrir les modules <ArrowRight className="w-4 h-4" />
          </button>
        </div>
        
        {/* Simplified preview for mobile */}
        <div className="rounded-[2rem] border border-white/10 bg-black overflow-hidden h-[400px]">
           <WhatsAppPreview />
        </div>
      </div>

      {/* Desktop Layout: The Original Premium Card */}
      <div
        className="hidden lg:grid grid-cols-2 group relative overflow-hidden rounded-[2.5rem] bg-black border border-white/10"
        style={{ backgroundColor: '#000000' }}
      >
        {/* Text Content */}
        <div className="relative z-10 flex flex-col justify-center p-20 bg-black">
          <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-zinc-900">
            <MessageSquare className="h-6 w-6 text-amber-500" />
          </div>

          <h2 className="mt-6 mb-6 font-manrope text-4xl font-semibold tracking-tight text-white leading-[1.2]">
            Automatisation WhatsApp <span className="text-amber-500">Intelligente</span>
          </h2>

          <div className="space-y-6 font-sans text-lg leading-relaxed text-gray-400">
            <p>
              Ne laissez plus un client attendre. Nos agents IA qualifient vos prospects, 
              répondent à leurs questions et concluent des ventes 24h/24.
            </p>
            <p>
              Grâce à une intégration profonde avec vos stocks et vos catalogues, 
              SEVEN T transforme votre WhatsApp en une véritable machine de vente autonome 
              optimisée pour le marché africain.
            </p>
          </div>
          
          <div className="mt-8 flex items-center gap-4">
             <button className="flex items-center gap-2 text-sm font-bold text-amber-500 uppercase tracking-widest hover:gap-3 transition-all">
                Découvrir les modules <ArrowRight className="w-4 h-4" />
             </button>
          </div>
        </div>

        {/* Visual Content */}
        <div className="h-auto overflow-hidden bg-black">
          <div className="relative h-full transition-transform duration-500">
            <WhatsAppPreview />
          </div>
        </div>
      </div>
    </section>
  );
};
