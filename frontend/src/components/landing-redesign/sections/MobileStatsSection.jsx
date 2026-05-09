import React from "react";
import { motion } from "framer-motion";
import { 
  BarChart3, 
  Zap, 
  Activity, 
  MessageSquare, 
  Users, 
  ChevronRight, 
  ArrowUpRight,
  Shield,
  Smartphone
} from "lucide-react";
import { cn } from "../../../utils/cn";
import { IPhone17ProMax } from "../shared/IPhone17ProMax";
import SevenTMobileDashboard from "../shared/SevenTMobileDashboard";

export const MobileStatsSection = () => {
  return (
    <section id="mobile-stats" className="relative z-20 py-32 overflow-hidden bg-transparent">
      {/* Background Decor */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[150%] h-[150%] bg-[radial-gradient(circle_at_center,rgba(245,158,11,0.03)_0%,transparent_70%)]" />
      </div>

      <div className="max-w-[1400px] mx-auto px-6 relative z-10">
        <div className="grid lg:grid-cols-12 gap-10 items-center">
          
          {/* Content Column (Left) */}
          <div className="lg:col-span-4 space-y-12 order-2 lg:order-1">
            <div className="space-y-6">
              <motion.div 
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 shadow-inner"
              >
                <Smartphone className="w-3 h-3 text-amber-500" />
                <span className="text-[11px] font-bold text-amber-500 uppercase tracking-widest">Mobile Native</span>
              </motion.div>
              
              <motion.h2 
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                className="text-4xl md:text-6xl font-medium tracking-tight leading-[1.1] text-white"
              >
                Votre Business, <br />
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-amber-500 to-amber-200 italic">Dans Votre Poche.</span>
              </motion.h2>

              <motion.p 
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="text-lg md:text-xl text-zinc-400 max-w-xl leading-relaxed font-manrope font-medium"
              >
                Supervisez vos performances, gérez vos agents IA et suivez vos ventes WhatsApp directement depuis votre téléphone. Sans compromis sur la puissance.
              </motion.p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
               {[
                 { icon: <MessageSquare className="w-5 h-5" />, title: "Console IA", desc: "Réponses et analyses de vos agents en temps réel." },
                 { icon: <Activity className="w-5 h-5" />, title: "Métriques Live", desc: "Suivez vos taux de conversion à chaque instant." },
               ].map((item, i) => (
                 <motion.div 
                   key={i}
                   initial={{ opacity: 0, y: 20 }}
                   whileInView={{ opacity: 1, y: 0 }}
                   transition={{ delay: 0.2 + i * 0.1 }}
                   className="p-6 rounded-[1.5rem] bg-zinc-900/30 border border-white/[0.05] hover:border-amber-500/30 transition-all duration-500 group hover:bg-zinc-900/50"
                 >
                    <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center mb-5 group-hover:bg-amber-500/10 transition-all duration-500">
                      <div className="text-zinc-400 group-hover:text-amber-500 transition-colors">
                        {item.icon}
                      </div>
                    </div>
                    <h4 className="text-lg font-bold mb-2 tracking-tight text-white">{item.title}</h4>
                    <p className="text-sm text-zinc-500 leading-relaxed font-manrope">{item.desc}</p>
                 </motion.div>
               ))}
            </div>
          </div>

          {/* Visual Column (Center Phone) */}
          <div className="lg:col-span-4 flex justify-center order-1 lg:order-2 relative z-20 scale-75 sm:scale-90 md:scale-100 origin-center">
            <IPhone17ProMax>
               <SevenTMobileDashboard />
            </IPhone17ProMax>
          </div>

          {/* Right Column: Descriptions & Stats Cards */}
          <div className="lg:col-span-4 flex flex-col gap-5 justify-center relative z-10 order-3 w-full max-w-sm mx-auto lg:mx-0">
      
            {/* Card 1: Account Stats */}
            <motion.div 
              initial={{ x: 20, opacity: 0 }}
              whileInView={{ x: 0, opacity: 1 }}
              transition={{ duration: 0.6 }}
              className="transition-transform duration-500 hover:scale-[1.01] text-left bg-gradient-to-br from-white/10 to-white/0 w-full rounded-3xl p-5 shadow-2xl backdrop-blur-xl border border-white/10"
            >
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-500 to-amber-700 p-0.5 shadow-lg shadow-amber-500/20">
                  <div className="w-full h-full rounded-full bg-black flex items-center justify-center font-bold text-amber-500">
                    7T
                  </div>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white tracking-tight font-manrope">Compte Pro</h3>
                  <p className="text-xs font-medium text-zinc-400 font-sans">Actif · WhatsApp API</p>
                </div>
                <div className="ml-auto">
                  <div className="w-2 h-2 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.6)] animate-pulse" />
                </div>
              </div>

              <div className="flex justify-between gap-2 mb-5">
                {[
                  { label: "Ventes", val: "1.2M FCFA" },
                  { label: "Leads", val: "450" },
                  { label: "IA-Rate", val: "98%" },
                ].map((stat, i) => (
                  <div key={i} className="flex flex-col flex-1 bg-gradient-to-br from-white/10 to-white/0 rounded-2xl p-3 border border-white/5">
                    <span className="text-[10px] uppercase tracking-wider text-zinc-500 mb-1 font-sans">{stat.label}</span>
                    <span className="text-sm font-semibold text-white">{stat.val}</span>
                  </div>
                ))}
              </div>

              <button className="hover:bg-white/10 transition-colors duration-300 flex items-center justify-center gap-2 text-xs font-medium text-white bg-gradient-to-br from-white/10 to-white/0 w-full rounded-full py-2.5 border border-white/10 group font-manrope">
                Voir les Analyses
                <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
              </button>
            </motion.div>

            {/* Card 2: Features List */}
            <motion.div 
              initial={{ x: 20, opacity: 0 }}
              whileInView={{ x: 0, opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="transition-transform duration-500 hover:scale-[1.01] text-left bg-gradient-to-br from-white/10 to-white/0 w-full rounded-3xl p-5 shadow-xl backdrop-blur-xl border border-white/10"
            >
              <p className="text-sm text-zinc-400 leading-relaxed mb-4 font-manrope">
                Infrastructure de classe mondiale avec mise à l'échelle automatique et sécurité de bout en bout.
              </p>
              <div className="flex flex-wrap gap-2 mb-4">
                {[
                  { icon: <Shield className="w-2.5 h-2.5" />, label: "Sécurisé" },
                  { icon: <Zap className="w-2.5 h-2.5" />, label: "Auto-Scale" },
                  { icon: <MessageSquare className="w-2.5 h-2.5" />, label: "WhatsApp API" },
                ].map((tag, i) => (
                  <span key={i} className="inline-flex items-center gap-1.5 text-[10px] font-medium text-zinc-300 bg-white/5 rounded-full px-2.5 py-1 border border-white/5">
                    {tag.icon}
                    {tag.label}
                  </span>
                ))}
              </div>
              
              <div className="flex gap-2">
                <button className="flex-1 flex items-center justify-between rounded-xl bg-zinc-950/50 border border-white/5 px-3 py-2 hover:border-white/20 transition-colors group">
                  <span className="text-xs text-zinc-300 font-medium font-manrope">Documentation</span>
                  <ArrowUpRight className="w-3 h-3 text-zinc-500 group-hover:text-white transition-colors" />
                </button>
                <button className="flex-1 flex items-center justify-between rounded-xl bg-zinc-950/50 border border-white/5 px-3 py-2 hover:border-white/20 transition-colors group">
                  <span className="text-xs text-zinc-300 font-medium font-manrope">Status Serveur</span>
                  <ArrowUpRight className="w-3 h-3 text-zinc-500 group-hover:text-white transition-colors" />
                </button>
              </div>
            </motion.div>

            {/* Card 3: Live Logs */}
            <motion.div 
              initial={{ x: 20, opacity: 0 }}
              whileInView={{ x: 0, opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="transition-transform duration-500 hover:scale-[1.01] text-left bg-gradient-to-br from-white/10 to-white/0 w-full rounded-3xl p-4 shadow-xl backdrop-blur-xl border border-white/10"
            >
              <div className="flex items-center justify-between mb-3">
                   <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 font-manrope">Logs en Direct</span>
                      <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping" />
                   </div>
                   <button className="text-[10px] font-medium text-zinc-400 hover:text-white transition-colors font-manrope underline decoration-zinc-700 underline-offset-2">Voir tout</button>
              </div>
              <div className="space-y-2">
                {[
                  { icon: <MessageSquare className="w-3.5 h-3.5 text-amber-500" />, title: "Vente Confirmée", meta: "45k FCFA · 2m ago", bg: "bg-amber-500/10", border: "border-amber-500/20" },
                  { icon: <Users className="w-3.5 h-3.5 text-purple-400" />, title: "Nouveau Lead", meta: "Qualité: High · 5m ago", bg: "bg-purple-500/10", border: "border-purple-500/20" },
                ].map((log, i) => (
                  <div key={i} className="group rounded-xl bg-zinc-950/50 border border-white/5 p-2.5 flex items-center gap-3 hover:bg-white/[0.02] hover:border-white/10 transition-colors cursor-default">
                      <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border", log.bg, log.border)}>
                          {log.icon}
                      </div>
                      <div className="flex flex-col min-w-0">
                          <span className="text-xs font-medium text-zinc-200 truncate font-manrope">{log.title}</span>
                          <span className="text-[10px] text-zinc-500 font-sans">{log.meta}</span>
                      </div>
                  </div>
                ))}
              </div>
            </motion.div>

          </div>

        </div>
      </div>
    </section>
  );
};
