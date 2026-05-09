import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Quote, Star, Globe, MessageSquare, X } from "lucide-react";
import { cn } from "../../../utils/cn";

const testimonials = [
  {
    name: "Amadou K.",
    role: "Entrepreneur, Dakar",
    content: "Depuis qu'on utilise SEVEN T, nos clients reçoivent une réponse en moins de 10 secondes, même à 2h du matin. Notre taux de conversion a augmenté de 40%.",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Amadou",
    source: "Web",
    rating: 5,
  },
  {
    name: "Fatou D.",
    role: "Marketing, Abidjan",
    content: "J'ai configuré mon agent en 20 minutes. Il qualifie mes leads WhatsApp et remplit mon CRM automatiquement. Je ne peux plus m'en passer.",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Fatou",
    source: "Twitter",
    rating: 5,
  },
  {
    name: "Ibrahim S.",
    role: "E-commerce, Lagos",
    content: "L'intégration de la boutique WhatsApp avec le suivi de stock est parfaite. Mes clients commandent directement dans le chat et je reçois les alertes.",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Ibrahim",
    source: "Web",
    rating: 5,
  }
];

export const Testimonials = () => {
  const [cards, setCards] = useState(testimonials);

  const shiftCard = () => {
    setCards((prevCards) => {
      const newCards = [...prevCards];
      const lastCard = newCards.pop();
      if (lastCard) newCards.unshift(lastCard);
      return newCards;
    });
  };

  useEffect(() => {
    const timer = setInterval(shiftCard, 5000);
    return () => clearInterval(timer);
  }, []);

  return (
    <section id="testimonials" className="relative z-20 py-32 overflow-hidden">
      <div className="max-w-7xl mx-auto px-6 relative z-10">
        <div className="flex flex-col lg:flex-row items-center gap-20">
          
          {/* Content Column */}
          <div className="lg:w-1/2 space-y-8 text-center lg:text-left">
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20"
            >
              <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
              <span className="text-[10px] font-bold text-amber-500 uppercase tracking-widest">Avis Clients</span>
            </motion.div>

            <motion.h2 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              className="text-3xl sm:text-4xl md:text-6xl font-medium tracking-tight leading-[1.05]"
            >
              Approuvé par <br />
              <span className="text-zinc-500">des centaines d'</span> <br />
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-amber-400 to-amber-200">entreprises.</span>
            </motion.h2>

            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-xl text-zinc-400 max-w-lg leading-relaxed font-manrope font-medium mx-auto lg:mx-0"
            >
              Ne nous croyez pas sur parole. Rejoignez les leaders du commerce 
              en Afrique qui ont transformé leur service client avec SEVEN T.
            </motion.p>

            <div className="flex items-center justify-center lg:justify-start gap-8 pt-4">
               <div className="text-center">
                 <p className="text-3xl font-semibold text-white tracking-tight">40%+</p>
                 <p className="text-[10px] font-medium text-zinc-500 uppercase tracking-widest mt-1">Conversion</p>
               </div>
               <div className="w-px h-10 bg-white/10" />
               <div className="text-center">
                 <p className="text-3xl font-semibold text-white tracking-tight">99%</p>
                 <p className="text-[10px] font-medium text-zinc-500 uppercase tracking-widest mt-1">Satisfaction</p>
               </div>
            </div>
          </div>

          {/* 3D Stack Column */}
          <div className="lg:w-1/2 relative h-[350px] sm:h-[400px] md:h-[450px] flex items-center justify-center w-full">
            <div className="relative w-full max-w-[420px] h-full flex items-center justify-center">
              <AnimatePresence mode="popLayout">
                {cards.map((testimonial, index) => {
                  const isTop = index === cards.length - 1;
                  const isNext = index === cards.length - 2;
                  
                  // Only render top 3 for performance and clean look
                  if (index < cards.length - 3) return null;

                  return (
                    <motion.div
                      key={testimonial.name}
                      layout
                      initial={{ opacity: 0, scale: 0.8, y: 20 }}
                      animate={{ 
                        opacity: isTop ? 1 : isNext ? 0.9 : 0.7,
                        scale: isTop ? 1 : isNext ? 0.94 : 0.88,
                        y: isTop ? 0 : isNext ? -30 : -60,
                        zIndex: index,
                      }}
                      exit={{ opacity: 0, x: 200, rotate: 20, scale: 0.8 }}
                      transition={{ 
                        type: "spring", 
                        stiffness: 260, 
                        damping: 20 
                      }}
                      className={cn(
                        "absolute w-full p-8 rounded-[2.5rem] border border-white/8 shadow-2xl backdrop-blur-2xl",
                        isTop ? "bg-gradient-to-br from-zinc-900 to-black" : "bg-zinc-900/40"
                      )}
                    >
                      <div className="flex items-center justify-between mb-8">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-white/5 shadow-lg">
                            <img src={testimonial.avatar} alt={testimonial.name} className="w-full h-full object-cover" />
                          </div>
                          <div>
                            <h4 className="text-base font-medium text-zinc-100 tracking-tight">{testimonial.name}</h4>
                            <p className="text-[10px] font-medium text-zinc-500 uppercase tracking-widest">{testimonial.role}</p>
                          </div>
                        </div>
                        <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center">
                          {testimonial.source === "Twitter" ? <X className="w-4 h-4 text-amber-400" /> : <Globe className="w-4 h-4 text-amber-400" />}
                        </div>
                      </div>

                      <div className="relative">
                        <Quote className="absolute -top-4 -left-2 w-8 h-8 text-amber-500/10" />
                        <p className="text-lg md:text-2xl font-medium text-white leading-relaxed tracking-tight relative z-10 font-manrope">
                          {testimonial.content}
                        </p>
                      </div>

                      <div className="mt-8 pt-8 border-t border-white/5 flex items-center justify-between">
                         <div className="flex gap-1">
                           {[...Array(5)].map((_, i) => (
                             <Star key={i} className="w-3 h-3 fill-amber-500 text-amber-500" />
                           ))}
                         </div>
                         <span className="text-[10px] font-medium text-white/80 uppercase tracking-widest">Utilisateur Vérifié</span>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          </div>

        </div>
      </div>

      {/* Decorative Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[600px] bg-amber-500/5 blur-[120px] rounded-full pointer-events-none -z-10" />
    </section>
  );
};
