import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Menu, X, LayoutDashboard } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "../../../contexts/AuthContext";

export const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { user } = useAuth();

  const navLinks = [
    { name: "Produit", href: "#ecosystem" },
    { name: "Fonctions", href: "#features" },
    { name: "Demo", href: "#demo" },
    { name: "Tarifs", href: "#pricing" },
    { name: "Avis", href: "#testimonials" },
  ];

  return (
    <div className="fixed left-0 top-0 z-50 flex w-full justify-center px-4 pt-6">
      <nav
        className="relative flex w-full max-w-5xl items-center justify-between gap-x-4 rounded-full bg-black/40 py-2 pl-6 pr-2 shadow-2xl backdrop-blur-2xl md:gap-x-8 md:w-auto overflow-hidden border border-white/5"
        style={{
          boxShadow: "0 0 0 1px rgba(255, 255, 255, 0.05), 0 20px 40px -10px rgba(0, 0, 0, 0.5)",
        }}
      >
        {/* Content Container */}
        <div className="relative z-10 flex w-full items-center justify-between gap-x-4 md:gap-x-12">
          {/* Logo */}
          <Link to="/" className="flex shrink-0 items-center gap-2 cursor-pointer group/logo">
            <div className="relative flex items-center justify-center">
               <img src="/logo.svg" alt="SEVEN T" className="h-6 w-auto object-contain" />
              <div className="absolute -inset-1 bg-amber-500/10 blur-md rounded-full opacity-0 group-hover/logo:opacity-100 transition-opacity duration-500" />
            </div>
            <span className="text-sm font-bold tracking-tight text-white font-manrope uppercase">
              SEVEN <span className="text-amber-500">T</span>
            </span>
          </Link>
  
          {/* Desktop Nav Links */}
          <div className="hidden items-center gap-8 md:flex">
            {navLinks.map((item) => (
              <a
                key={item.name}
                href={item.href}
                className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 transition-all hover:text-white"
              >
                {item.name}
              </a>
            ))}
          </div>
  
          {/* Actions */}
          <div className="flex items-center gap-4 md:gap-6 shrink-0">
            {!user ? (
              <>
                <Link
                  to="/login"
                  className="hidden text-[11px] font-semibold uppercase tracking-wider text-gray-400 transition-colors hover:text-white md:block"
                >
                  Connexion
                </Link>
                
                <Link
                  to="/register"
                  className="group relative hidden md:inline-flex items-center justify-center overflow-hidden rounded-full p-[1px] transition-all duration-300 hover:shadow-[0_0_20px_rgba(245,158,11,0.1)]"
                >
                  <span className="relative flex h-full w-full items-center justify-center gap-2 rounded-full bg-white/[0.03] border border-white/10 px-6 py-2.5 text-[11px] font-bold tracking-widest text-white uppercase transition-all duration-300 group-hover:bg-white/[0.08] group-hover:border-white/20">
                    <span className="relative z-10">Démarrer</span>
                    <ArrowRight className="relative z-10 h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-1" />
                  </span>
                </Link>
              </>
            ) : (
              <Link
                to="/dashboard"
                className="group relative inline-flex items-center justify-center overflow-hidden rounded-full p-[1px] transition-all duration-300 hover:shadow-[0_0_25px_rgba(245,158,11,0.2)]"
              >
                <span className="relative flex h-full w-full items-center justify-center gap-2 rounded-full bg-white/[0.03] border border-white/10 px-6 py-2.5 text-[11px] font-bold tracking-widest text-white uppercase transition-all duration-300 group-hover:bg-white/[0.08] group-hover:border-white/20">
                  <LayoutDashboard className="relative z-10 h-3.5 w-3.5" />
                  <span className="relative z-10">Mon Espace</span>
                </span>
              </Link>
            )}
  
            {/* Mobile Menu Toggle */}
            <button 
              onClick={() => setIsOpen(!isOpen)}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-white/5 text-white md:hidden"
            >
              {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu Overlay */}
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -20 }}
              className="absolute left-0 right-0 top-full mt-4 flex flex-col gap-2 rounded-3xl border border-white/10 bg-black/80 p-4 backdrop-blur-2xl md:hidden"
            >
              {navLinks.map((item) => (
                <a
                  key={item.name}
                  href={item.href}
                  onClick={() => setIsOpen(false)}
                  className="flex w-full items-center justify-between rounded-xl px-4 py-3 text-sm font-medium text-gray-300 transition-colors hover:bg-white/5 hover:text-white"
                >
                  {item.name}
                  <ArrowRight className="h-4 w-4 opacity-30" />
                </a>
              ))}
              <div className="my-2 h-px bg-white/5" />
              {!user ? (
                <>
                  <Link
                    to="/login"
                    onClick={() => setIsOpen(false)}
                    className="flex w-full items-center justify-between rounded-xl px-4 py-3 text-sm font-medium text-gray-300 transition-colors hover:bg-white/5 hover:text-white"
                  >
                    Connexion
                    <ArrowRight className="h-4 w-4 opacity-30" />
                  </Link>
                  <Link
                    to="/register"
                    onClick={() => setIsOpen(false)}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-amber-500 py-3 text-sm font-bold text-black"
                  >
                    S'inscrire
                  </Link>
                </>
              ) : (
                <Link
                  to="/dashboard"
                  onClick={() => setIsOpen(false)}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-amber-500 py-3 text-sm font-bold text-black"
                >
                  <LayoutDashboard className="h-4 w-4" />
                  Mon Espace
                </Link>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </nav>
    </div>
  );
};
