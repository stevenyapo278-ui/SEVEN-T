import React from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { 
  X, 
  MessageSquare,
  ArrowUpRight, 
  Terminal,
  Activity,
  Shield,
  Fingerprint,
  Instagram,
  Facebook
} from "lucide-react";

export const Footer = () => {
  return (
    <footer className="relative z-20 overflow-hidden pt-24 pb-12 px-6 border-t border-white/5 bg-black">
      {/* Top subtle glow line */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-amber-500/20 to-transparent" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/2 h-[100px] bg-amber-500/10 blur-[100px] pointer-events-none" />

      <div className="mx-auto max-w-7xl relative">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-12 sm:gap-8 lg:gap-12">
          
          {/* Brand Info - Spans 4 cols */}
          <div className="lg:col-span-4 flex flex-col justify-between">
            <div>
              <Link to="/" className="items-center gap-3 mb-6 group inline-flex">
                <div className="relative flex items-center justify-center">
                  <img src="/logo.svg" alt="SEVEN T" className="h-8 w-auto object-contain" />
                  <div className="absolute -inset-2 bg-amber-500/20 blur-xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                </div>
                <span className="text-2xl font-bold tracking-tight text-white font-manrope">
                  SEVEN <span className="text-amber-500">T</span>
                </span>
              </Link>
              
              <p className="max-w-sm text-sm text-zinc-400 font-medium leading-relaxed mb-8">
                L'assistant intelligent qui automatise vos ventes sur WhatsApp. 
                Spécialement conçu pour le marché africain.
              </p>
            </div>
            
            <div className="flex gap-4">
              {[
                { icon: <Instagram className="w-4 h-4" />, href: "#" },
                { icon: <Facebook className="w-4 h-4" />, href: "#" },
                { icon: <MessageSquare className="w-4 h-4" />, href: "#" },
              ].map((social, i) => (
                <a 
                  key={i} 
                  href={social.href}
                  className="group relative w-10 h-10 rounded-xl bg-zinc-900/50 border border-white/5 flex items-center justify-center text-zinc-400 hover:text-amber-400 hover:border-amber-500/30 transition-all duration-300"
                >
                  <div className="absolute inset-0 bg-amber-500/10 rounded-xl opacity-0 group-hover:opacity-100 blur-md transition-opacity duration-300" />
                  <span className="relative z-10">{social.icon}</span>
                </a>
              ))}
            </div>
          </div>

          {/* Links - Spans 4 cols */}
          <div className="lg:col-span-4 grid grid-cols-2 gap-8">
            <div className="flex flex-col gap-6">
              <h4 className="text-[10px] font-bold text-amber-500 uppercase tracking-[0.2em] flex items-center gap-2">
                <Terminal className="w-3 h-3" />
                Produit
              </h4>
              <ul className="space-y-4">
                {["Modules", "Fonctionnalités", "Tarifs", "Démo", "API"].map((item) => (
                  <li key={item}>
                    <a href={`#${item.toLowerCase()}`} className="text-sm font-medium text-zinc-400 hover:text-white transition-colors flex items-center group w-fit">
                      {item}
                      <ArrowUpRight className="w-3 h-3 ml-1 opacity-0 -translate-x-2 translate-y-2 group-hover:opacity-100 group-hover:translate-x-0 group-hover:translate-y-0 transition-all duration-300 text-amber-400" />
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex flex-col gap-6">
              <h4 className="text-[10px] font-bold text-amber-500 uppercase tracking-[0.2em] flex items-center gap-2">
                <Shield className="w-3 h-3" />
                Légal
              </h4>
              <ul className="space-y-4">
                {["À propos", "Blog", "Conditions", "Confidentialité", "Sécurité"].map((item) => (
                  <li key={item}>
                    <Link to="#" className="text-sm font-medium text-zinc-400 hover:text-white transition-colors flex items-center group w-fit">
                      {item}
                      <ArrowUpRight className="w-3 h-3 ml-1 opacity-0 -translate-x-2 translate-y-2 group-hover:opacity-100 group-hover:translate-x-0 group-hover:translate-y-0 transition-all duration-300 text-amber-400" />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Contact / Action - Spans 4 cols */}
          <div className="lg:col-span-4 flex flex-col justify-between sm:col-span-2 lg:col-span-4">
            <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-zinc-900/80 to-black border border-white/5 shadow-2xl relative overflow-hidden group">
              {/* Subtle background grid */}
              <div className="absolute inset-0 z-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[length:16px_16px]" />
              
              <div className="relative z-10">
                <h4 className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em] mb-4">Besoin d'aide ?</h4>
                <p className="text-lg font-bold text-zinc-200 leading-tight mb-8">
                  Une question sur nos solutions pour votre entreprise ?
                </p>
                
                <a 
                  href="https://wa.me/yournumber" 
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group/btn relative inline-flex items-center justify-center overflow-hidden rounded-full p-px transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_0_25px_rgba(245,158,11,0.2)] w-full"
                >
                  <span className="absolute -inset-full animate-[spin_3s_linear_infinite] bg-[conic-gradient(from_0deg,transparent_0_300deg,rgba(245,158,11,0.8)_360deg)] opacity-0 transition-opacity duration-300 group-hover/btn:opacity-100" />
                  <span className="absolute inset-0 rounded-full bg-zinc-800 transition-opacity duration-300 group-hover/btn:opacity-0" />
                  <span className="relative flex h-full w-full items-center justify-center gap-2 rounded-full bg-gradient-to-b from-zinc-800 to-zinc-950 px-6 py-3 text-[10px] font-bold tracking-[0.2em] text-zinc-300 uppercase transition-colors duration-300 group-hover/btn:text-amber-400 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]">
                    <Fingerprint className="relative z-10 w-4 h-4 transition-transform duration-300" />
                    <span className="relative z-10">Contacter le Support</span>
                  </span>
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-20 pt-8 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
            <span>© {new Date().getFullYear()} SEVEN T.</span>
            <span className="w-1 h-1 rounded-full bg-zinc-700" />
            <span>Tous droits réservés.</span>
          </div>
          
          <div className="flex items-center gap-3 px-4 py-2 rounded-full bg-amber-500/5 border border-amber-500/10 backdrop-blur-md">
            <div className="relative flex items-center justify-center">
              <div className="absolute w-2.5 h-2.5 rounded-full bg-amber-500/40 animate-ping" />
              <div className="w-1.5 h-1.5 rounded-full bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.8)]" />
            </div>
            <span className="text-[10px] font-bold text-amber-400 uppercase tracking-widest flex items-center gap-1.5">
              <Activity className="w-3 h-3" />
              Systèmes Opérationnels
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
};
