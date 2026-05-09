import React from "react";
import { motion } from "framer-motion";
import WhatsAppSimulator from "../shared/WhatsAppSimulator";
import { MessageSquare, Zap, Shield, Users, ArrowRight } from "lucide-react";

export const ConversationDemo = () => {
  return (
    <section className="relative py-32 overflow-hidden bg-transparent">
      {/* Background Decor */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[150%] h-[150%] bg-[radial-gradient(circle_at_center,rgba(245,158,11,0.03)_0%,transparent_70%)]" />
      </div>

      <div className="max-w-7xl mx-auto px-6 relative z-10">
        <div className="grid lg:grid-cols-12 gap-16 items-center">
          
          {/* Content Column */}
          <div className="lg:col-span-5 space-y-12">
            <div className="space-y-6">
              <motion.div 
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 shadow-inner"
              >
                <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                <span className="text-[11px] font-bold text-amber-500 uppercase tracking-widest text-shadow-glow">Intelligence Native</span>
              </motion.div>
              
              <motion.h2 
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                className="text-4xl md:text-6xl font-medium tracking-tight leading-[1.1] text-white"
              >
                Votre IA vend, <br />
                <span className="text-amber-500 italic">pendant que vous dormez.</span>
              </motion.h2>

              <motion.p 
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="text-lg md:text-xl text-zinc-400 max-w-xl leading-relaxed font-manrope"
              >
                Plus besoin de répondre manuellement aux mêmes questions. SEVEN T qualifie les besoins, vérifie les stocks et valide les commandes 24/7.
              </motion.p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
               {[
                 { icon: <Zap className="w-5 h-5" />, title: "Réponse Instantanée", desc: "Moins de 2 secondes pour répondre à chaque client." },
                 { icon: <Shield className="w-5 h-5" />, title: "Gestion des Stocks", desc: "Vérification automatique avant de valider la vente." },
               ].map((item, i) => (
                 <motion.div 
                   key={i}
                   initial={{ opacity: 0, y: 20 }}
                   whileInView={{ opacity: 1, y: 0 }}
                   transition={{ delay: 0.2 + i * 0.1 }}
                   className="p-6 rounded-3xl bg-zinc-900/30 border border-white/[0.05] hover:border-amber-500/30 transition-all duration-500 group"
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

          {/* Visual Column (The Phone) */}
          <div className="lg:col-span-4 flex justify-center perspective-1000">
            <motion.div
              initial={{ rotateY: 20, rotateX: 5, opacity: 0 }}
              whileInView={{ rotateY: 0, rotateX: 0, opacity: 1 }}
              transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
              className="relative"
            >
              <WhatsAppSimulator />
              {/* Floating Badge 1 */}
              <motion.div 
                animate={{ y: [0, -10, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                className="absolute -right-12 top-20 bg-black/80 backdrop-blur-xl border border-white/10 p-4 rounded-2xl shadow-2xl z-30 hidden md:block"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center">
                    <Zap size={16} className="text-green-500" />
                  </div>
                  <div>
                    <p className="text-[10px] text-zinc-400 uppercase font-bold tracking-widest">Statut</p>
                    <p className="text-xs text-white font-bold">Commande Validée</p>
                  </div>
                </div>
              </motion.div>

              {/* Floating Badge 2 */}
              <motion.div 
                animate={{ y: [0, 10, 0] }}
                transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                className="absolute -left-12 bottom-20 bg-black/80 backdrop-blur-xl border border-white/10 p-4 rounded-2xl shadow-2xl z-30 hidden md:block"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center">
                    <Users size={16} className="text-amber-500" />
                  </div>
                  <div>
                    <p className="text-[10px] text-zinc-400 uppercase font-bold tracking-widest">IA Seven T</p>
                    <p className="text-xs text-white font-bold">1,240 Conversions/mois</p>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          </div>

          {/* Features Column (Right) */}
          <div className="lg:col-span-3 space-y-6">
             {[
               { title: "Validation Automatique", desc: "L'IA génère les liens de paiement et valide les transactions.", icon: <CheckCircle className="w-4 h-4" /> },
               { title: "Qualification de Leads", desc: "Filtrez les curieux pour ne garder que les clients sérieux.", icon: <Filter className="w-4 h-4" /> },
               { title: "Collecte de Données", desc: "Récupérez les noms, adresses et téléphones automatiquement.", icon: <Database className="w-4 h-4" /> },
             ].map((f, i) => (
               <motion.div
                 key={i}
                 initial={{ x: 20, opacity: 0 }}
                 whileInView={{ x: 0, opacity: 1 }}
                 transition={{ delay: i * 0.1 }}
                 className="p-5 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/[0.08] transition-colors cursor-default"
               >
                 <div className="flex items-center gap-3 mb-2">
                    <div className="text-amber-500">{f.icon}</div>
                    <h5 className="text-sm font-bold text-white">{f.title}</h5>
                 </div>
                 <p className="text-xs text-zinc-400 leading-relaxed font-manrope">{f.desc}</p>
               </motion.div>
             ))}

             <button className="w-full mt-4 flex items-center justify-center gap-2 py-4 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 transition-all group">
                <span className="text-xs font-bold uppercase tracking-widest">Voir toutes les fonctions</span>
                <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
             </button>
          </div>
        </div>
      </div>
    </section>
  );
};

const CheckCircle = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const Filter = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
  </svg>
);

const Database = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
  </svg>
);
