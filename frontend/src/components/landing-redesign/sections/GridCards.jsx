import React from "react";
import { motion } from "framer-motion";
import { Bot, TrendingUp, ShoppingCart, ArrowRight, Shield, Zap, MessageSquare, Globe, LayoutGrid } from "lucide-react";
import { cn } from "../../../utils/cn";

const AgentCard = () => {
  return (
    <div 
      className="group overflow-hidden flex flex-col hover:border-white/20 transition-colors duration-500 bg-black rounded-[2rem] border border-white/10"
    >
      {/* Visual Header */}
      <div 
        className="flex overflow-hidden bg-gradient-to-b from-white/[0.03] to-black/0 h-64 relative items-center justify-center"
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(245,158,11,0.05)_0%,transparent_70%)]" />
        
        {/* Floating Widgets */}
        <motion.div 
          initial={{ y: 20, rotate: -6, opacity: 0 }}
          whileInView={{ y: 0, rotate: -6, opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="absolute top-10 left-10 w-32 bg-zinc-900/60 border border-white/10 rounded-xl p-3 backdrop-blur-sm shadow-xl"
        >
          <div className="flex items-center gap-2 mb-3">
            <MessageSquare className="w-3 h-3 text-amber-500/70" />
            <div className="h-1 w-12 bg-white/20 rounded-full" />
          </div>
          <div className="space-y-2">
            {[1, 2, 3].map((_, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-amber-500/40" />
                <div className="h-1 bg-white/10 rounded-full" style={{ width: `${(i+1)*15}px` }} />
              </div>
            ))}
          </div>
        </motion.div>

        <motion.div 
          initial={{ y: -20, rotate: 12, opacity: 0 }}
          whileInView={{ y: 0, rotate: 12, opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="absolute top-8 right-12 w-24 h-10 bg-amber-500/10 border border-amber-500/20 rounded-lg backdrop-blur-sm flex items-center justify-center gap-2"
        >
          <Zap className="w-3 h-3 text-amber-400" />
          <span className="font-mono text-[10px] text-amber-200/70 font-medium tracking-wider">Actif</span>
        </motion.div>

        {/* Central Visual */}
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }}
          whileInView={{ scale: 1, opacity: 1 }}
          className="relative z-10 w-24 h-24 bg-gradient-to-br from-amber-500/20 to-amber-500/5 rounded-3xl border border-amber-500/30 flex items-center justify-center shadow-2xl shadow-amber-500/10"
        >
           <Bot className="w-12 h-12 text-amber-500" />
        </motion.div>
      </div>
      
      {/* Card Content */}
      <div className="mt-auto pt-8 pr-10 pb-10 pl-10">
        <div className="flex items-center gap-3 mb-5">
          <div className="p-2 rounded-lg bg-amber-500/10 text-amber-500 border border-amber-500/20">
            <Bot className="w-5 h-5" />
          </div>
          <h3 className="text-xl font-bold text-white tracking-tight font-manrope">Agents IA Autonomes</h3>
        </div>
        <p className="text-gray-400 text-sm leading-relaxed mb-8 font-sans">
          Vos assistantes IA ne se contentent pas de répondre, elles agissent : 
          qualification de leads, prise de rendez-vous et vente directe 24h/24.
        </p>
        <div className="flex items-center gap-4">
          <button className="inline-flex items-center gap-2 text-amber-400 hover:text-white transition-colors text-sm font-medium pb-1 border-b border-transparent hover:border-amber-400/50 group/link">
            En savoir plus
            <ArrowRight className="w-3 h-3 transition-transform group-hover/link:translate-x-0.5" />
          </button>
        </div>
      </div>
    </div>
  );
};

const SalesCard = () => {
  return (
    <div 
      className="group overflow-hidden flex flex-col hover:border-white/20 transition-colors duration-500 bg-black rounded-[2rem] border border-white/10"
    >
      {/* Visual Header */}
      <div 
        className="flex overflow-hidden bg-gradient-to-b from-white/[0.03] to-black/0 h-64 relative items-center justify-center"
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(161,161,170,0.05)_0%,transparent_70%)]" />
        
        {/* Orbital Visualization */}
        <div className="flex w-full h-full relative items-center justify-center">
          <div className="absolute w-40 h-40 border border-dashed border-white/5 rounded-full flex items-center justify-center" />
          <motion.div 
            whileHover={{ scale: 1.05 }}
            className="relative z-20 w-16 h-16 bg-gradient-to-br from-white/10 to-transparent rounded-2xl border border-white/10 flex items-center justify-center shadow-2xl"
          >
            <TrendingUp className="w-8 h-8 text-amber-500/80" />
          </motion.div>
        </div>
      </div>
      
      {/* Card Content */}
      <div className="mt-auto pt-8 pr-10 pb-10 pl-10">
        <div className="flex items-center gap-3 mb-5">
          <div className="p-2 rounded-lg bg-zinc-500/10 text-zinc-400 border border-zinc-500/20">
            <TrendingUp className="w-5 h-5" />
          </div>
          <h3 className="text-xl font-bold text-white tracking-tight font-manrope">Intelligence Commerciale</h3>
        </div>
        <p className="text-gray-400 text-sm leading-relaxed mb-8 font-sans">
          Détection automatique des intentions d'achat et segmentation intelligente 
          de vos prospects WhatsApp pour un ROI maximal.
        </p>
        <div className="flex flex-wrap gap-2">
          {["ROI", "Segments", "Leads", "Ventes"].map(tag => (
            <span key={tag} className="px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-[10px] font-mono text-zinc-500">{tag}</span>
          ))}
        </div>
      </div>
    </div>
  );
};

const AutomationCard = () => {
  return (
    <div 
      className="group overflow-hidden flex flex-col hover:border-white/20 transition-colors duration-500 bg-black rounded-[2rem] border border-white/10"
    >
      <div className="grid grid-cols-1 lg:grid-cols-2">
         {/* Visual Section */}
         <div className="h-64 lg:h-auto relative overflow-hidden bg-white/[0.02] flex items-center justify-center border-b lg:border-b-0 lg:border-r border-white/5">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(245,158,11,0.08),transparent_70%)]" />
            <div className="relative z-10 flex gap-8 items-center">
               <div className="w-14 h-14 rounded-2xl bg-zinc-900 border border-white/10 flex items-center justify-center opacity-40">
                  <ShoppingCart className="w-6 h-6 text-zinc-500" />
               </div>
               <div className="w-20 h-20 rounded-[1.5rem] bg-gradient-to-br from-amber-500/20 to-black border border-amber-500/40 flex items-center justify-center shadow-2xl shadow-amber-500/20">
                  <Zap className="w-8 h-8 text-amber-500" />
               </div>
               <div className="w-14 h-14 rounded-2xl bg-zinc-900 border border-white/10 flex items-center justify-center opacity-40">
                  <Globe className="w-6 h-6 text-zinc-500" />
               </div>
            </div>
         </div>

         {/* Content Section */}
         <div className="p-8 md:p-12 flex flex-col justify-center">
            <div className="flex items-center gap-3 mb-5">
              <div className="p-2 rounded-lg bg-amber-500/10 text-amber-500 border border-amber-500/20">
                <LayoutGrid className="w-5 h-5" />
              </div>
              <h3 className="text-xl font-bold text-white tracking-tight font-manrope">Écosystème Modulaire 360°</h3>
            </div>
            <p className="text-gray-400 text-sm leading-relaxed mb-8 font-sans max-w-md">
              Activez les modules dont vous avez besoin : gestion des stocks, 
              publication automatique de statuts, relance IA proactive, et plus encore.
            </p>
            <div className="flex items-center justify-between border-t border-white/10 pt-6">
               <div className="flex gap-6">
                 <div className="flex flex-col gap-1">
                   <span className="text-[9px] font-medium text-white/80 uppercase tracking-widest">Temps de réponse</span>
                   <div className="flex items-center gap-1.5">
                     <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                     <span className="text-sm font-bold text-emerald-500">&lt; 10s</span>
                   </div>
                 </div>
                 <div className="flex flex-col gap-1">
                   <span className="text-[9px] font-medium text-white/80 uppercase tracking-widest">Disponibilité</span>
                   <div className="flex items-center gap-1.5">
                     <span className="text-sm font-bold text-white">24/7</span>
                   </div>
                 </div>
               </div>
               <button className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-amber-500 hover:border-amber-500 transition-all duration-300 group-hover:scale-110">
                 <ArrowRight className="w-5 h-5 text-zinc-400 hover:text-black transition-colors" />
               </button>
            </div>
         </div>
      </div>
    </div>
  );
};

export const GridCards = () => {
  return (
    <section className="relative z-20 mx-auto mb-32 w-full max-w-7xl px-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-6">
        <div className="lg:col-span-4 h-full">
          <AgentCard />
        </div>
        <div className="lg:col-span-2 h-full">
          <SalesCard />
        </div>
        <div className="lg:col-span-6 h-full">
          <AutomationCard />
        </div>
      </div>
    </section>
  );
};
