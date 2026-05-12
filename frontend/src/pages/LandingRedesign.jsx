import React, { useEffect } from "react";
import { m } from "framer-motion";
import { Navbar } from "../components/landing-redesign/layout/Navbar";
import { Hero } from "../components/landing-redesign/sections/Hero";
import { Features } from "../components/landing-redesign/sections/Features";
import { GridCards } from "../components/landing-redesign/sections/GridCards";
import { Testimonials } from "../components/landing-redesign/sections/Testimonials";
import { Pricing } from "../components/landing-redesign/sections/Pricing";
import { Footer } from "../components/landing-redesign/layout/Footer";
import LightRays from "../components/landing-redesign/shared/LightRays";
import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";

const LandingRedesign = () => {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="relative min-h-screen bg-black text-white selection:bg-amber-500/30 selection:text-amber-200">
      <Helmet>
        <title>SEVEN-T | Automatisation WhatsApp Intelligente</title>
        <meta name="description" content="Vendez plus sur WhatsApp même quand vous dormez. L'IA SEVEN-T gère vos messages, vos stocks et vos statuts automatiquement." />
      </Helmet>

      {/* Premium Background Elements */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden bg-black">
        {/* Luxe Mesh & Glow Background */}
        <div 
           className="absolute inset-0 opacity-40 mix-blend-screen" 
           style={{ 
             backgroundImage: `
               radial-gradient(circle at 20% 20%, rgba(245, 158, 11, 0.1) 0%, transparent 40%),
               radial-gradient(circle at 80% 80%, rgba(245, 158, 11, 0.1) 0%, transparent 40%),
               linear-gradient(to right, rgba(255, 255, 255, 0.03) 1px, transparent 1px),
               linear-gradient(to bottom, rgba(255, 255, 255, 0.03) 1px, transparent 1px)
             `,
             backgroundSize: "100% 100%, 100% 100%, 80px 80px, 80px 80px"
           }} 
        />

        {/* WebGL Light Rays - Premium Version */}
        <div className="absolute inset-0 opacity-60">
          <LightRays 
            raysOrigin="top-center"
            raysColor="#f59e0b"
            raysSpeed={0.5}
            lightSpread={1.2}
            rayLength={1.8}
            pulsating={true}
            followMouse={true}
            mouseInfluence={0.05}
            noiseAmount={0.05}
          />
        </div>
        
        {/* Grainy Texture */}
        <div className="absolute inset-0 opacity-[0.03] mix-blend-overlay pointer-events-none bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />
      </div>

      {/* Content */}
      <div className="relative z-10 flex flex-col">
        <Navbar />
        
        <main>
          <Hero />
          
          <div className="relative">
             {/* Subtle gradient divider */}
             <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/2 h-px bg-gradient-to-r from-transparent via-amber-500/10 to-transparent" />
             <Features />
          </div>

          <GridCards />
          
          <div className="relative bg-zinc-950/20 py-20">
             <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/5 to-transparent" />
             <Testimonials />
             <div className="absolute bottom-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/5 to-transparent" />
          </div>

          <Pricing />
          
          {/* Final CTA */}
          <section className="py-32 px-6 text-center relative overflow-hidden">
             <m.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="max-w-3xl mx-auto space-y-8"
             >
                <h2 className="text-4xl md:text-6xl font-medium tracking-tight">Prêt à transformer votre <span className="text-amber-500">WhatsApp</span> ?</h2>
                <p className="text-xl text-zinc-400 font-manrope font-medium">Rejoignez les entreprises qui automatisent déjà leur succès avec SEVEN-T.</p>
                <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-6">
                   <Link to="/register" className="w-full sm:w-auto">
                     <button className="w-full sm:w-auto bg-amber-500 text-black px-12 py-5 rounded-full font-bold text-sm uppercase tracking-widest hover:bg-amber-400 transition-all hover:scale-105 active:scale-95 shadow-[0_20px_40px_-10px_rgba(245,158,11,0.3)]">
                        Commencer l'essai gratuit
                     </button>
                   </Link>
                   <button className="text-zinc-400 hover:text-white transition-colors text-sm font-bold uppercase tracking-widest">
                      Contacter un expert
                   </button>
                </div>
             </m.div>
          </section>
        </main>

        <Footer />
      </div>

      <style>{`
        html {
          scroll-behavior: smooth;
          -webkit-tap-highlight-color: transparent;
        }
        body {
          background-color: #000000;
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
        }
        .font-manrope {
          font-family: 'Manrope', sans-serif;
        }
      `}</style>
    </div>
  );
};

export default LandingRedesign;
