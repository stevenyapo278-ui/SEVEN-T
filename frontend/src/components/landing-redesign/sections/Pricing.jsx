import React, { useState } from "react";
import { motion } from "framer-motion";
import { Check, ArrowRight, Zap, Shield, Bot, TrendingUp, MessageSquare } from "lucide-react";
import { cn } from "../../../utils/cn";
import { Link } from "react-router-dom";

const plans = [
  {
    id: "free",
    name: "Gratuit",
    price: 0,
    tagline: "Pour découvrir.",
    description: "Parfait pour tester la puissance de l'IA sur votre WhatsApp.",
    icon: <Bot className="w-5 h-5" />,
    features: [
      "1 Agent IA Intelligent",
      "1 Numéro WhatsApp",
      "100 Crédits mensuels",
      "Base de connaissances",
      "Support communautaire"
    ]
  },
  {
    id: "pro",
    name: "Pro",
    price: 29000,
    tagline: "Boostez vos ventes.",
    description: "L'infrastructure complète pour scaler votre business sur WhatsApp.",
    icon: <Zap className="w-5 h-5" />,
    popular: true,
    features: [
      "5 Agents IA Autonomes",
      "3 Numéros WhatsApp",
      "5000 Crédits mensuels",
      "Statistiques avancées",
      "Relance IA Proactive",
      "Support Prioritaire"
    ]
  },
  {
    id: "enterprise",
    name: "Enterprise",
    price: "Sur devis",
    tagline: "Mission critique.",
    description: "Solution sur mesure pour les grandes entreprises et réseaux.",
    icon: <Shield className="w-5 h-5" />,
    features: [
      "Agents illimités",
      "Numéros illimités",
      "Crédits personnalisés",
      "Intégration CRM / ERP",
      "SLA 99.9%",
      "Manager dédié"
    ]
  }
];

export const Pricing = () => {
  const [billingCycle, setBillingCycle] = useState("monthly");

  return (
    <section id="pricing" className="relative z-20 py-32 overflow-hidden">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-20 space-y-4">
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20"
          >
            <Zap className="w-3 h-3 text-amber-500 fill-amber-500" />
            <span className="text-[10px] font-bold text-amber-500 uppercase tracking-widest">Tarifs Transparents</span>
          </motion.div>
          
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            className="text-4xl sm:text-5xl md:text-7xl font-medium tracking-tight leading-[0.95]"
          >
            UN PRIX QUI <br />
            <span className="text-white/80">S'ADAPTE À</span> <br />
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-amber-400 to-amber-200">VOTRE AMBITION.</span>
          </motion.h2>

          {/* Toggle */}
          <div className="pt-8 flex justify-center">
            <div className="inline-flex rounded-full border border-white/10 bg-black/40 p-1 backdrop-blur-md">
              {["MENSUEL", "ANNUEL"].map((cycle) => (
                <button
                  key={cycle}
                  onClick={() => setBillingCycle(cycle.toLowerCase() === "mensuel" ? "monthly" : "annually")}
                  className={cn(
                    "rounded-full px-8 py-2.5 text-[10px] font-bold tracking-widest transition-all duration-300",
                    (billingCycle === "monthly" && cycle === "MENSUEL") || (billingCycle === "annually" && cycle === "ANNUEL")
                      ? "bg-zinc-800 text-white shadow-lg"
                      : "text-gray-500 hover:text-gray-300"
                  )}
                >
                  {cycle}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map((plan, i) => (
            <motion.div
              key={plan.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className={cn(
                "group relative flex flex-col p-8 rounded-[2.5rem] border transition-all duration-500",
                plan.popular 
                  ? "bg-gradient-to-b from-amber-500/10 to-black border-amber-500/30 shadow-[0_30px_60px_-15px_rgba(245,158,11,0.15)] scale-[1.02] z-10" 
                  : "bg-zinc-950/40 border-white/[0.05] hover:border-white/10"
              )}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1.5 bg-amber-500 rounded-full shadow-lg shadow-amber-500/20">
                   <span className="text-[10px] font-bold text-black uppercase tracking-widest">Le Plus Populaire</span>
                </div>
              )}

              <div className="mb-8">
                <div className={cn(
                  "w-12 h-12 rounded-2xl flex items-center justify-center mb-6 border transition-colors",
                  plan.popular ? "bg-amber-500/10 border-amber-500/20 text-amber-500" : "bg-white/5 border-white/10 text-zinc-500"
                )}>
                  {plan.icon}
                </div>
                <h3 className="text-2xl font-bold text-white tracking-tight">{plan.name}</h3>
                <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mt-1">{plan.tagline}</p>
              </div>

              <div className="mb-10 flex items-baseline gap-1.5">
                <span className="text-5xl font-medium tracking-tighter text-white font-manrope">
                  {typeof plan.price === "number" 
                    ? `${billingCycle === "annually" ? Math.floor(plan.price * 0.8) : plan.price}`
                    : plan.price}
                </span>
                {typeof plan.price === "number" && (
                  <span className="text-white/80 font-bold text-sm">FCFA / mois</span>
                )}
              </div>

              <p className="text-sm text-zinc-400 font-medium leading-relaxed mb-10">
                {plan.description}
              </p>

              <div className="flex-1 space-y-4 mb-12">
                {plan.features.map((feature) => (
                  <div key={feature} className="flex items-center gap-3">
                    <div className="w-5 h-5 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0">
                      <Check className="w-3 h-3 text-amber-500" strokeWidth={3} />
                    </div>
                    <span className="text-xs font-bold text-zinc-300 tracking-tight">{feature}</span>
                  </div>
                ))}
              </div>

              <Link to={`/register?plan=${plan.id}`} className="w-full">
                <button className={cn(
                  "group relative w-full overflow-hidden rounded-2xl py-5 text-[10px] font-bold tracking-[0.2em] uppercase transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]",
                  plan.popular 
                    ? "bg-amber-500 text-black shadow-[0_20px_40px_-10px_rgba(245,158,11,0.3)] hover:bg-amber-400" 
                    : "bg-zinc-900 text-zinc-100 border border-white/5 hover:bg-zinc-800"
                )}>
                  <span className="relative z-10 flex items-center justify-center gap-2">
                    Choisir {plan.name} <ArrowRight className="w-4 h-4" />
                  </span>
                </button>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Decorative Glows */}
      <div className="absolute top-1/2 left-0 -translate-y-1/2 w-96 h-96 bg-amber-500/5 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-amber-500/5 blur-[120px] rounded-full pointer-events-none" />
    </section>
  );
};
