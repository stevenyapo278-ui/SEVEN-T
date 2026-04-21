import React from 'react';
import { Shield, Sparkles, Lock, ArrowRight, CheckCircle2 } from 'lucide-react';
import { motion } from 'framer-motion';
import UpgradePrompt from './UpgradePrompt';

export default function LockedModuleView({ moduleName, description, icon: Icon = Shield }) {
  const features = [
    "Précision accrue grâce aux algorithmes Pro",
    "Gain de temps automatisé",
    "Rapports détaillés et exportables",
    "Support prioritaire 24/7"
  ];

  return (
    <div className="min-h-[70vh] flex items-center justify-center p-6">
      <div className="max-w-4xl w-full">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid md:grid-cols-2 gap-8 items-center"
        >
          {/* Visual Side */}
          <div className="order-2 md:order-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gold-400/10 text-gold-400 text-xs font-bold uppercase tracking-wider mb-6">
              <Sparkles className="w-3 h-3" />
              Fonctionnalité Premium
            </div>
            
            <h1 className="text-3xl md:text-4xl font-display font-bold text-gray-100 mb-4">
              Débloquez {moduleName}
            </h1>
            
            <p className="text-gray-400 text-lg mb-8 leading-relaxed">
              {description || "Cette fonctionnalité avancée est réservée aux utilisateurs de nos forfaits supérieurs. Elle vous permet d'automatiser davantage vos processus et d'obtenir des analyses plus poussées."}
            </p>

            <div className="space-y-4 mb-10">
              {features.map((feature, i) => (
                <div key={i} className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-300">{feature}</span>
                </div>
              ))}
            </div>

            <UpgradePrompt 
              title="Prêt à passer au niveau supérieur ?"
              description="Choisissez le plan qui vous convient et débloquez instantanément tous les modules de croissance."
              ctaText="Voir les forfaits"
            />
          </div>

          {/* Icon/Art Side */}
          <div className="order-1 md:order-2 flex justify-center">
            <div className="relative">
              <div className="absolute inset-0 bg-gold-400/20 blur-[100px] rounded-full animate-pulse" />
              <div className="relative w-48 h-48 md:w-64 md:h-64 rounded-3xl bg-gradient-to-br from-space-800 to-space-900 border border-white/5 flex items-center justify-center overflow-hidden shadow-2xl">
                <div className="absolute top-0 right-0 p-4 opacity-10">
                  <Icon className="w-32 h-32" />
                </div>
                <Icon className="w-24 h-24 text-gold-400" />
                <div className="absolute bottom-4 right-4 p-2 rounded-lg bg-gray-950/80 border border-gold-400/30 backdrop-blur-sm">
                  <Lock className="w-6 h-6 text-gold-400" />
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
