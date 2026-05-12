import React from "react";
import { motion } from "framer-motion";
import { ShinyButton } from "../shared/ShinyButton";
import { ArrowRight } from "lucide-react";
import { cn } from "../../../utils/cn";
import { Link } from "react-router-dom";

const InteractiveWord = ({ word }) => {
  return (
    <motion.span
      initial="initial"
      whileHover="hover"
      className="group flex flex-wrap justify-center gap-x-[0.05em] cursor-pointer select-none"
    >
      {word.split("").map((char, i) => (
        <span
          key={i}
          className="relative inline-block h-[1.1em] overflow-hidden"
        >
          <motion.span
            variants={{
              initial: { y: 0 },
              hover: { y: "-100%" },
            }}
            transition={{
              duration: 0.5,
              ease: [0.16, 1, 0.3, 1],
              delay: i * 0.025,
            }}
            className="block bg-gradient-to-b from-white via-white to-white/50 bg-clip-text text-transparent"
          >
            {char}
          </motion.span>
          <motion.span
            variants={{
              initial: { y: "100%" },
              hover: { y: 0 },
            }}
            transition={{
              duration: 0.5,
              ease: [0.16, 1, 0.3, 1],
              delay: i * 0.025,
            }}
            className="absolute left-0 top-0 block text-amber-400"
          >
            {char}
          </motion.span>
        </span>
      ))}
    </motion.span>
  );
};

export const Hero = () => {
  return (
    <section className="relative flex min-h-[90vh] w-full flex-col items-center justify-center overflow-hidden pt-32 md:min-h-screen md:pt-20">
      {/* Background Effects */}
      <div className="absolute inset-0 -z-20 overflow-hidden pointer-events-none">
        <div className="absolute left-1/2 top-[-10%] h-[80%] w-[120%] -translate-x-1/2 bg-[radial-gradient(ellipse_at_top,rgba(245,158,11,0.15)_0%,transparent_70%)]" />
      </div>

      {/* Grid Curtain Structure - Simplified for mobile */}
      <div className="absolute inset-0 -z-10 grid h-full w-full grid-cols-3 pointer-events-none md:grid-cols-7">
        {[...Array(7)].map((_, i) => (
          <motion.div
            key={i}
            initial={{ clipPath: "inset(0 0 100% 0)", opacity: 0 }}
            animate={{ clipPath: "inset(0 0 0% 0)", opacity: 1 }}
            transition={{
              duration: 1.4,
              ease: [0.16, 1, 0.3, 1],
              delay: i * 0.1,
            }}
            className={cn(
              "relative h-full border-white/5",
              i < 2 || i > 4
                ? "hidden border-r md:block"
                : i === 3
                  ? "border-none"
                  : "border-r",
            )}
          >
            <div
              className="absolute bottom-0 left-0 right-0 border-t border-white/10 bg-black shadow-[0_-20px_60px_-10px_rgba(0,0,0,0.8)]"
              style={{ height: `${75 - Math.abs(3 - i) * 10}%` }}
            />
            {i === 3 && (
              <div className="absolute left-0 right-0 top-[20%] h-[30%] bg-gradient-to-b from-white/5 to-transparent" />
            )}
          </motion.div>
        ))}
      </div>

      {/* Content */}
      <div className="relative z-10 mx-auto max-w-5xl px-4 text-center mt-12 mb-12 md:px-6 md:mt-24 md:mb-24">
        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, y: 20, filter: "blur(8px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          transition={{ duration: 0.8, delay: 0.8 }}
          className="relative mb-8 inline-flex cursor-pointer items-center gap-x-2 rounded-full bg-gradient-to-br from-white/10 to-transparent px-3 py-1.5 backdrop-blur-sm transition-transform hover:scale-105 group"
          style={{ boxShadow: "0 0 0 1px rgba(255, 255, 255, 0.1)" }}
        >
          <span className="h-1.5 w-1.5 rounded-full bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.5)] group-hover:animate-pulse" />
          <span className="font-sans text-[10px] md:text-xs font-medium tracking-wide text-amber-100/80 transition-colors group-hover:text-white uppercase tracking-widest">
            Intelligence Artificielle de confiance
          </span>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 20, filter: "blur(8px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          transition={{ duration: 0.8, delay: 1 }}
          className="mb-6 flex flex-wrap justify-center gap-x-[0.25em] gap-y-1 font-manrope text-4xl font-medium tracking-tighter leading-[1.1] sm:text-6xl md:text-7xl lg:text-8xl md:mb-8 md:gap-x-[0.3em] md:gap-y-2"
        >
          <span className="bg-gradient-to-b from-white via-white to-white/50 bg-clip-text text-transparent opacity-50">
            Vendez
          </span>
          <InteractiveWord word="Plus" />
          <br className="hidden md:block w-full" />
          <span className="bg-gradient-to-b from-white via-white to-white/50 bg-clip-text text-transparent opacity-50">
            sur
          </span>
          <InteractiveWord word="WhatsApp" />
          <span className="bg-gradient-to-b from-white via-white to-white/50 bg-clip-text text-transparent opacity-50 self-center mx-1 md:mx-2">
            même
          </span>
          <span className="bg-gradient-to-b from-white via-white to-white/50 bg-clip-text text-transparent opacity-50">
            en
          </span>
          <br className="hidden md:block w-full" />
          <InteractiveWord word="Dormant" />
        </motion.h1>

        {/* Subtext */}
        <motion.p
          initial={{ opacity: 0, y: 20, filter: "blur(8px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          transition={{ duration: 0.8, delay: 1.2 }}
          className="mx-auto mb-10 max-w-2xl font-manrope text-lg font-medium leading-relaxed tracking-normal text-gray-300 md:text-2xl md:mb-12 md:max-w-3xl"
        >
          Ne soyez plus seul pour gérer vos messages. SEVEN T est l'assistant intelligent 
          qui qualifie vos leads, gère vos stocks et publie vos statuts automatiquement.
        </motion.p>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20, filter: "blur(8px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          transition={{ duration: 0.8, delay: 1.4 }}
          className="flex flex-col items-center justify-center gap-4 sm:flex-row md:gap-6 md:mb-12"
        >
          <Link to="/register">
            <ShinyButton>Essayer gratuitement</ShinyButton>
          </Link>
          <button className="text-gray-300 hover:text-white transition-colors text-sm font-bold tracking-widest uppercase flex items-center gap-2">
            Voir la démo <PlayIcon />
          </button>
        </motion.div>

        {/* Logos Subtext */}
        <motion.div
          initial={{ opacity: 0, y: 20, filter: "blur(8px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          transition={{ duration: 0.8, delay: 1.6 }}
          className="mt-20 flex flex-col items-center gap-y-4 mb-10 md:mt-32 md:mb-20"
        >
          <p className="font-sans text-[10px] md:text-xs font-medium tracking-widest text-gray-400 uppercase px-4 text-center">
            Optimisé pour le marché africain
          </p>
          <div className="flex items-center gap-6 opacity-40 grayscale brightness-200">
             {/* Add some dummy logos or just text */}
             <span className="text-sm font-bold tracking-tighter">SENEGAL</span>
             <span className="text-sm font-bold tracking-tighter">COTE D'IVOIRE</span>
             <span className="text-sm font-bold tracking-tighter">CAMEROUN</span>
             <span className="text-sm font-bold tracking-tighter">GABON</span>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

const PlayIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 fill-amber-500">
    <path d="M7 6.75C7 5.7835 8.0418 5.17061 8.8875 5.6385L18.1375 10.7585C19.0125 11.2425 19.0125 12.5075 18.1375 12.9915L8.8875 18.1115C8.0418 18.5794 7 17.9665 7 17L7 6.75Z" fill="currentColor" />
  </svg>
);
