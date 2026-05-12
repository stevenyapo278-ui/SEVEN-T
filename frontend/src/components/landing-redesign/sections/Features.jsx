import React from "react";
import { motion } from "framer-motion";
import { Activity, Server, Box, ArrowRight, MessageSquare, Zap, Shield, Sparkles } from "lucide-react";
import { cn } from "../../../utils/cn";

const ChatInterface = () => {
  return (
    <div className="relative h-full overflow-hidden border-l border-white/5 bg-zinc-950/30 font-sans">
      {/* Abstract Chat Interface Background */}
      <div className="pointer-events-none absolute inset-0 select-none p-8 text-xs leading-relaxed text-gray-500 opacity-40 md:text-sm">
        <div className="mb-6 flex gap-1.5 opacity-50">
          <div className="h-3 w-3 rounded-full bg-zinc-700" />
          <div className="h-3 w-3 rounded-full bg-zinc-700" />
          <div className="h-3 w-3 rounded-full bg-zinc-700" />
        </div>
        <div className="space-y-4">
           <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-zinc-800 shrink-0" />
              <div className="space-y-2 flex-1">
                 <div className="h-2 bg-zinc-800 rounded w-3/4" />
                 <div className="h-2 bg-zinc-800 rounded w-1/2" />
              </div>
           </div>
           <div className="flex gap-3 justify-end">
              <div className="space-y-2 flex-1 flex flex-col items-end">
                 <div className="h-2 bg-amber-500/20 rounded w-2/3" />
                 <div className="h-2 bg-amber-500/20 rounded w-1/3" />
              </div>
              <div className="w-8 h-8 rounded-full bg-amber-500/20 shrink-0" />
           </div>
           <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-zinc-800 shrink-0" />
              <div className="space-y-2 flex-1">
                 <div className="h-2 bg-zinc-800 rounded w-4/5" />
                 <div className="h-2 bg-zinc-800 rounded w-2/3" />
              </div>
           </div>
        </div>
      </div>

      {/* Floating Agent Card */}
      <div className="absolute left-1/2 top-1/2 z-10 w-[90%] max-w-md -translate-x-1/2 -translate-y-1/2 p-6">
        <motion.div 
          whileHover={{ scale: 1.02 }}
          className="overflow-hidden rounded-2xl border border-white/10 bg-zinc-900/90 backdrop-blur-xl shadow-[0_20px_50px_-12px_rgba(0,0,0,0.8)] transition-all duration-700 ease-out"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-white/5 bg-white/[0.02] p-5">
            <div>
              <h4 className="font-sans text-sm font-normal tracking-wide text-white">Assistant IA Actif</h4>
              <div className="mt-1 flex items-center gap-2">
                <span className="relative flex h-2 w-2 shrink-0">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-500" />
                </span>
                <p className="overflow-hidden whitespace-nowrap font-sans text-[10px] font-normal tracking-wide text-amber-500 uppercase tracking-widest">
                  Réponse instantanée
                </p>
              </div>
            </div>
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/5 text-amber-500/50">
              <Sparkles className="h-4 w-4" />
            </div>
          </div>

          {/* Content Rows */}
          <div className="divide-y divide-white/5 font-sans text-sm">
            {[
              { icon: <MessageSquare className="h-3.5 w-3.5" />, name: "Lead Qualifié", loc: "WhatsApp", lat: "Instant", delay: 0.2 },
              { icon: <Zap className="h-3.5 w-3.5" />, name: "Vente Directe", loc: "Catalogue", lat: "Auto", delay: 0.4 },
            ].map((row, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: row.delay }}
                className="flex cursor-default items-center justify-between p-3.5 transition-colors hover:bg-white/5"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 text-amber-400">
                    {row.icon}
                  </div>
                  <div className="flex flex-col">
                    <span className="font-normal text-gray-200">{row.name}</span>
                    <span className="mt-0.5 text-xs font-normal text-gray-500">{row.loc}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs text-gray-400">{row.lat}</span>
                  <div className="flex gap-0.5">
                    <div className="h-3 w-1 rounded-full bg-amber-500" />
                    <div className="h-3 w-1 rounded-full bg-amber-500/50" />
                    <div className="h-3 w-1 rounded-full bg-amber-500/20" />
                  </div>
                </div>
              </motion.div>
            ))}

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.6 }}
              className="flex cursor-default items-center justify-between bg-white/[0.02] p-3.5 transition-colors hover:bg-white/5"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 text-amber-400">
                  <Activity className="h-3.5 w-3.5 animate-pulse" />
                </div>
                <div className="flex flex-col">
                  <span className="font-normal text-gray-200">Relance Automatique</span>
                  <span className="mt-0.5 flex items-center gap-1 text-xs font-normal text-gray-500">
                    IA en cours d'analyse
                    <span className="ml-1 flex gap-0.5">
                      <span className="h-0.5 w-0.5 animate-bounce rounded-full bg-amber-400" />
                      <span className="h-0.5 w-0.5 animate-bounce rounded-full bg-amber-400 [animation-delay:0.1s]" />
                      <span className="h-0.5 w-0.5 animate-bounce rounded-full bg-amber-400 [animation-delay:0.2s]" />
                    </span>
                  </span>
                </div>
              </div>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export const Features = () => {
  return (
    <section className="relative z-20 mx-auto mt-12 mb-12 w-full max-w-7xl px-4 pt-10 pb-20 md:mt-24 md:mb-24 md:px-2 md:pb-32">
      <div
        className="group relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-white/10 to-white/0 backdrop-blur-lg md:rounded-[2.5rem]"
        style={{ border: "1px solid rgba(255, 255, 255, 0.1)" }}
      >
        {/* Background Glow Effect */}
        <div className="pointer-events-none absolute bottom-0 left-0 h-1/2 w-full bg-gradient-to-tr from-amber-500/10 via-transparent to-transparent opacity-40" />

        <div className="grid grid-cols-1 lg:grid-cols-2">
          {/* Text Content */}
          <div className="relative z-10 flex flex-col justify-center p-6 md:p-16 lg:p-20">
            <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-gradient-to-br from-white/10 to-white/5 md:h-12 md:w-12 md:rounded-2xl">
              <BotIcon className="h-5 w-5 text-amber-500 md:h-6 md:w-6" />
            </div>

            <h2 className="mt-4 mb-4 font-manrope text-2xl font-semibold tracking-tight text-white leading-[1.2] sm:text-3xl md:mt-6 md:mb-6 md:text-4xl">
              Intelligence Conversationnelle Augmentée
            </h2>

            <div className="space-y-4 font-sans text-base leading-relaxed text-gray-400 md:space-y-6 md:text-lg">
              <p>
                Transformez votre numéro WhatsApp en une machine de vente autonome. Nos agents IA qualifient vos prospects, répondent aux questions complexes et concluent des ventes sans aucune intervention humaine.
              </p>
              <p>
                Connectez vos catalogues produits et laissez l'IA gérer les stocks, les commandes et les paiements directement dans le chat. Une expérience fluide qui multiplie vos taux de conversion.
              </p>
              <p className="hidden sm:block">
                Relances intelligentes et personnalisées — ne perdez plus jamais un client grâce à des suivis basés sur le comportement d'achat réel.
              </p>
            </div>
          </div>

          {/* Visual Content */}
          <div className="h-[450px] md:h-[500px] lg:h-auto overflow-hidden">
            <div className="relative h-full scale-90 sm:scale-100 origin-center transition-transform duration-500">
              <ChatInterface />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

const BotIcon = ({ className }) => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <path d="M12 15V17M12 7V9M12 11V13M5 11V13M19 11V13M12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12C21 16.9706 16.9706 21 12 21Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);
