import React, { useEffect, useState } from "react";
import { Navbar } from "../components/landing-redesign/layout/Navbar";
import { Hero } from "../components/landing-redesign/sections/Hero";
import { Features } from "../components/landing-redesign/sections/Features";
import { GridCards } from "../components/landing-redesign/sections/GridCards";
import { Testimonials } from "../components/landing-redesign/sections/Testimonials";
import { Pricing } from "../components/landing-redesign/sections/Pricing";
import { Footer } from "../components/landing-redesign/layout/Footer";
import PixelBlast from "../components/landing-redesign/shared/PixelBlast";
import LightRays from "../components/landing-redesign/shared/LightRays";
import { Helmet } from "react-helmet-async";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import api from "../services/api";

const Landing = () => {
  const { user } = useAuth();
  const [plans, setPlans] = useState([]);

  useEffect(() => {
    window.scrollTo(0, 0);
    
    // Fetch plans from backend
    const fetchPlans = async () => {
      try {
        const response = await api.get('/plans');
        if (response.data) {
          setPlans(response.data);
        }
      } catch (error) {
        console.error("Erreur lors de la récupération des plans:", error);
      }
    };

    fetchPlans();
  }, []);

  return (
    <div className="relative min-h-screen bg-black text-white selection:bg-amber-500/30 selection:text-amber-200">
      <Helmet>
        <title>SEVEN T | Automatisation WhatsApp Intelligente</title>
        <meta name="description" content="Vendez plus sur WhatsApp même quand vous dormez. L'IA SEVEN T gère vos messages, vos stocks et vos statuts automatiquement." />
      </Helmet>

      {/* Background Elements */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <PixelBlast 
          variant="circle"
          pixelSize={4}
          color="#f59e0b"
          patternDensity={0.8}
          patternScale={1.5}
          speed={0.2}
          transparent={true}
          edgeFade={0.6}
        />
        <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" />
        <LightRays 
          raysOrigin="top-center"
          raysColor="#f59e0b"
          raysSpeed={0.5}
          lightSpread={1.2}
          rayLength={1.5}
        />
      </div>

      {/* Content */}
      <div className="relative z-10 flex flex-col">
        <Navbar />
        
        <main>
          <Hero />
          
          <div className="relative">
             {/* Subtle gradient divider */}
             <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/2 h-px bg-gradient-to-r from-transparent via-amber-500/20 to-transparent" />
             <Features />
          </div>

          <GridCards />
          
          <div className="relative bg-zinc-950/20 py-20">
             <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/5 to-transparent" />
             <Testimonials />
             <div className="absolute bottom-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/5 to-transparent" />
          </div>

          <Pricing plans={plans} />

          
          {/* Final CTA */}
          <section className="py-32 px-6 text-center relative overflow-hidden">
             <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-amber-500/10 blur-[120px] rounded-full pointer-events-none -z-10" />
             <motion.div
               initial={{ opacity: 0, y: 20 }}
               whileInView={{ opacity: 1, y: 0 }}
               viewport={{ once: true }}
               className="max-w-3xl mx-auto space-y-8"
             >
                <h2 className="text-4xl md:text-6xl font-medium tracking-tight">Prêt à transformer votre <span className="text-amber-500">WhatsApp</span> ?</h2>
                <p className="text-xl text-zinc-400 font-manrope font-medium leading-relaxed">
                   Rejoignez les entreprises qui automatisent déjà leur succès avec SEVEN T.
                </p>
                <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-6">
                   <Link to={user ? "/dashboard" : "/register"} className="w-full sm:w-auto">
                     <button className="w-full sm:w-auto bg-amber-500 text-black px-12 py-5 rounded-full font-bold text-sm uppercase tracking-widest hover:bg-amber-400 transition-all hover:scale-105 active:scale-95 shadow-[0_20px_40px_-10px_rgba(245,158,11,0.3)]">
                        {user ? "Accéder au tableau de bord" : "Commencer l'essai gratuit"}
                     </button>
                   </Link>
                   <button className="text-zinc-400 hover:text-white transition-colors text-sm font-bold uppercase tracking-widest">
                      Contacter un expert
                   </button>
                </div>
             </motion.div>
          </section>
        </main>

        <Footer />
      </div>

      {/* Global CSS for font and smooth scroll */}
      <style dangerouslySetInnerHTML={{ __html: `
        html {
          scroll-behavior: smooth;
        }
        body {
          background-color: black;
          overflow-x: hidden;
        }
        .font-manrope {
          font-family: 'Manrope', sans-serif;
        }
      `}} />
    </div>
  );
};

export default Landing;
