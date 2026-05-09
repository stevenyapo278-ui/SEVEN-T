import React, { useState } from "react";
import { motion } from "framer-motion";
import { Check, ArrowRight, Zap, Shield, Bot, TrendingUp, MessageSquare } from "lucide-react";
import { cn } from "../../../utils/cn";
import { Link } from "react-router-dom";

const defaultPlans = [
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


export const Pricing = ({ plans: externalPlans }) => {

  const [billing, setBilling] = useState("monthly");

  const parseJson = (val) => {
    if (!val) return {};
    if (typeof val === 'object') return val;
    try {
      return JSON.parse(val);
    } catch (e) {
      return {};
    }
  };

  return (
    <section id="pricing" className="py-32 px-6 relative overflow-hidden bg-black">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-24 space-y-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-500 text-[10px] font-bold uppercase tracking-[0.2em] mb-4"
          >
            <TrendingUp className="w-3 h-3" /> Tarification
          </motion.div>
          <h2 className="text-5xl md:text-7xl font-medium tracking-tighter text-white">
            Investissez dans votre <span className="text-amber-500 italic">croissance</span>.
          </h2>
          <p className="text-zinc-400 max-w-2xl mx-auto font-manrope font-medium text-lg leading-relaxed">
            Des plans flexibles conçus pour s'adapter à votre volume et booster votre ROI sur WhatsApp.
          </p>

          <div className="flex items-center justify-center gap-4 mt-12">
            <span className={cn("text-xs font-bold tracking-widest uppercase transition-colors", billing === "monthly" ? "text-white" : "text-zinc-500")}>Mensuel</span>
            <button
              onClick={() => setBilling(billing === "monthly" ? "yearly" : "monthly")}
              className="w-14 h-7 rounded-full bg-zinc-900 border border-white/10 p-1 relative transition-all"
            >
              <motion.div
                animate={{ x: billing === "monthly" ? 0 : 28 }}
                className="w-5 h-5 rounded-full bg-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.5)]"
              />
            </button>
            <span className={cn("text-xs font-bold tracking-widest uppercase transition-colors", billing === "yearly" ? "text-white" : "text-zinc-500")}>Annuel <span className="text-amber-500 text-[10px] lowercase ml-1">(-20%)</span></span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {(externalPlans?.length > 0 ? externalPlans : defaultPlans).map((plan, i) => {
            const isPopular = plan.popular || plan.is_popular || plan.id === 'pro' || plan.name?.toLowerCase().includes('pro');
            
            // Handle different price formats from backend vs frontend
            const rawPrice = plan.price;
            const numericPrice = (typeof rawPrice === 'number') ? rawPrice : (typeof rawPrice === 'string' ? parseFloat(rawPrice.replace(/\s/g, '')) : 0);
            const rawPriceYearly = plan.priceYearly || plan.price_yearly;
            const numericPriceYearly = (typeof rawPriceYearly === 'number') ? rawPriceYearly : (typeof rawPriceYearly === 'string' ? parseFloat(rawPriceYearly.replace(/\s/g, '')) : 0);

            const finalPrice = billing === "monthly" 
              ? numericPrice 
              : (numericPriceYearly > 0 ? numericPriceYearly / 12 : numericPrice * 0.8);

            const limits = parseJson(plan.limits);
            const features = parseJson(plan.features);

            // Map backend features/limits to display list with fallback to standard keys
            const displayFeatures = plan.features_list || (Array.isArray(plan.features) ? plan.features : [
              limits?.agents ? (limits.agents === -1 ? 'Agents illimités' : `${limits.agents} Agent${limits.agents > 1 ? 's' : ''} IA`) : null,
              (limits?.whatsapp_accounts || limits?.whatsappAccounts) ? ((limits.whatsapp_accounts === -1 || limits.whatsappAccounts === -1) ? 'WhatsApp illimité' : `${limits.whatsapp_accounts || limits.whatsappAccounts} Numéro${(limits.whatsapp_accounts || limits.whatsappAccounts) > 1 ? 's' : ''} WhatsApp`) : null,
              (limits?.messages_per_month || limits?.messagesPerMonth) ? ((limits.messages_per_month === -1 || limits.messagesPerMonth === -1) ? 'Messages illimités' : `${(limits.messages_per_month || limits.messagesPerMonth).toLocaleString('fr-FR')} Messages / mois`) : null,
              (limits?.credits_per_month || limits?.monthlyCredits) ? `${(limits.credits_per_month || limits.monthlyCredits).toLocaleString('fr-FR')} Crédits mensuels` : null,
              ...(features ? [
                features.models?.length ? `${features.models.length} modèle(s) IA` : null,
                features.availability_hours ? 'Heures de disponibilité' : null,
                features.leads_management ? 'Gestion des Leads' : null,
                features.voice_responses ? 'Réponses vocales (TTS)' : null,
                features.analytics ? 'Statistiques avancées' : null,
                features.next_best_action ? 'Assistant Proactif' : null,
                features.whatsapp_status ? 'Statut WhatsApp' : null,
              ].filter(Boolean) : [])
            ].filter(Boolean));

            return (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className={cn(
                  "group relative flex flex-col p-8 rounded-[2.5rem] border transition-all duration-500",
                  isPopular 
                    ? "bg-gradient-to-b from-amber-500/10 to-black border-amber-500/30 shadow-[0_30px_60px_-15px_rgba(245,158,11,0.15)] scale-[1.02] z-10" 
                    : "bg-zinc-950/40 border-white/[0.05] hover:border-white/10"
                )}
              >
                {isPopular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1.5 bg-amber-500 rounded-full shadow-lg shadow-amber-500/20">
                     <span className="text-[10px] font-bold text-black uppercase tracking-widest">Le Plus Populaire</span>
                  </div>
                )}

                <div className="mb-8">
                  <div className={cn(
                    "w-12 h-12 rounded-2xl flex items-center justify-center mb-6 border transition-colors",
                    isPopular ? "bg-amber-500/10 border-amber-500/20 text-amber-500" : "bg-white/5 border-white/10 text-zinc-500"
                  )}>
                    {plan.id === 'free' ? <Bot className="w-5 h-5" /> : plan.id === 'enterprise' ? <Shield className="w-5 h-5" /> : <Zap className="w-5 h-5" />}
                  </div>
                  <h3 className="text-2xl font-bold text-white tracking-tight">{plan.display_name || plan.name}</h3>
                  <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mt-1">{plan.tagline || plan.description?.split('.')[0] + '.'}</p>
                </div>

                <div className="mb-10 flex items-baseline gap-1.5">
                  <span className="text-5xl font-medium tracking-tighter text-white font-manrope">
                    {typeof plan.price === "number" || !isNaN(parseInt(plan.price))
                      ? `${finalPrice.toLocaleString()}`
                      : plan.price}
                  </span>
                  {(typeof plan.price === "number" || !isNaN(parseInt(plan.price))) && parseInt(plan.price) > 0 && (
                    <span className="text-white/80 font-bold text-sm">{plan.priceCurrency || plan.price_currency || 'FCFA'} / mois</span>
                  )}
                </div>

                <p className="text-sm text-zinc-400 font-medium leading-relaxed mb-10 h-12 overflow-hidden">
                  {plan.description}
                </p>

                <div className="flex-1 space-y-4 mb-12">
                  {displayFeatures.slice(0, 6).map((feature, idx) => (
                    <div key={idx} className="flex items-center gap-3">
                      <div className="w-5 h-5 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0">
                        <Check className="w-3 h-3 text-amber-500" strokeWidth={3} />
                      </div>
                      <span className="text-xs font-bold text-zinc-300 tracking-tight">{feature}</span>
                    </div>
                  ))}
                </div>

                <Link to={`/register?plan=${plan.id}`} className="w-full mt-auto">
                  <button className={cn(
                    "group relative w-full overflow-hidden rounded-2xl py-5 text-[10px] font-bold tracking-[0.2em] uppercase transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]",
                    isPopular 
                      ? "bg-amber-500 text-black shadow-[0_20px_40px_-10px_rgba(245,158,11,0.3)] hover:bg-amber-400" 
                      : "bg-zinc-900 text-zinc-100 border border-white/5 hover:bg-zinc-800"
                  )}>
                    <span className="relative z-10 flex items-center justify-center gap-2">
                      Choisir {plan.display_name || plan.name} <ArrowRight className="w-4 h-4" />
                    </span>
                  </button>
                </Link>
              </motion.div>
            );
          })}

        </div>
      </div>

      {/* Decorative Glows */}
      <div className="absolute top-1/2 left-0 -translate-y-1/2 w-96 h-96 bg-amber-500/5 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-amber-500/5 blur-[120px] rounded-full pointer-events-none" />
    </section>
  );
};
