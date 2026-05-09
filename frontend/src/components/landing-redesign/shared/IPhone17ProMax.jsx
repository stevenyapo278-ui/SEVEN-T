import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "../../../utils/cn";

const STATUSES = [
  { label: "Syncing", color: "bg-amber-500", shadow: "shadow-[0_0_12px_rgba(245,158,11,0.8)]" },
  { label: "Deploy", color: "bg-blue-400", shadow: "shadow-[0_0_12px_rgba(96,165,250,0.8)]" },
  { label: "AI-Live", color: "bg-green-500", shadow: "shadow-[0_0_12px_rgba(34,197,94,0.8)]" },
  { label: "Indexing", color: "bg-purple-400", shadow: "shadow-[0_0_12px_rgba(192,132,252,0.8)]" }
];

const DynamicIsland = () => {
  const [statusIndex, setStatusIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setStatusIndex((prev) => (prev + 1) % STATUSES.length);
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  const currentStatus = STATUSES[statusIndex];

  return (
    <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[100] flex justify-center pointer-events-none">
       <motion.div 
          layout
          initial={{ width: 110, height: 32 }}
          whileHover={{ 
            width: 180, 
            height: 48,
            borderRadius: "24px",
            transition: { type: "spring", stiffness: 400, damping: 25 }
          }}
          className="bg-black rounded-full flex items-center justify-between px-3 border border-white/10 shadow-[0_10px_30px_rgba(0,0,0,1)] pointer-events-auto cursor-pointer group/island overflow-hidden min-w-[120px] gap-4"
       >
          <AnimatePresence mode="wait">
            <motion.div 
              key={currentStatus.label}
              initial={{ opacity: 0, y: 4, filter: "blur(4px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              exit={{ opacity: 0, y: -4, filter: "blur(4px)" }}
              transition={{ duration: 0.2 }}
              className="flex items-center gap-2 pl-1 shrink-0"
            >
               <div className={cn("w-1.5 h-1.5 rounded-full animate-pulse", currentStatus.color, currentStatus.shadow)} />
               <span className="text-[10px] font-bold text-zinc-300 group-hover/island:text-white tracking-widest uppercase font-mono transition-colors whitespace-nowrap">
                 {currentStatus.label}
               </span>
            </motion.div>
          </AnimatePresence>

          <div className="flex gap-1.5 pr-1 shrink-0">
             <div className={cn("w-1.5 h-1.5 rounded-full transition-colors opacity-50 group-hover/island:opacity-100", currentStatus.color)} />
             <div className="w-1.5 h-1.5 rounded-full bg-zinc-800 group-hover/island:bg-zinc-600 transition-colors" />
          </div>
       </motion.div>
    </div>
  );
};

export const IPhone17ProMax = ({ children }) => {
  return (
    <div className="relative group perspective-[2500px]">
      {/* Intense Background Glow */}
      <div className="absolute -inset-32 bg-amber-500/10 blur-[120px] rounded-full pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />
      
      {/* Side Buttons - Left (Action + Volume) */}
      <div className="absolute -left-[2.5px] top-[130px] w-[3px] h-[35px] rounded-l-md bg-gradient-to-b from-zinc-500 via-zinc-800 to-zinc-600 z-0 shadow-[-2px_0_4px_rgba(0,0,0,0.5)]" />
      <div className="absolute -left-[2.5px] top-[190px] w-[3px] h-[65px] rounded-l-md bg-gradient-to-b from-zinc-500 via-zinc-800 to-zinc-600 z-0 shadow-[-2px_0_4px_rgba(0,0,0,0.5)]" />
      <div className="absolute -left-[2.5px] top-[270px] w-[3px] h-[65px] rounded-l-md bg-gradient-to-b from-zinc-500 via-zinc-800 to-zinc-600 z-0 shadow-[-2px_0_4px_rgba(0,0,0,0.5)]" />

      {/* Side Button - Right (Power) */}
      <div className="absolute -right-[2.5px] top-[200px] w-[3px] h-[100px] rounded-r-md bg-gradient-to-b from-zinc-500 via-zinc-800 to-zinc-600 z-0 shadow-[2px_0_4px_rgba(0,0,0,0.5)]" />

      {/* Titanium Frame Layer */}
      <div className="relative p-[2px] bg-gradient-to-br from-zinc-400 via-zinc-800 to-zinc-500 rounded-[3.5rem] shadow-[0_40px_100px_-20px_rgba(0,0,0,0.8),inset_0_0_0_1px_rgba(255,255,255,0.1)] transition-all duration-700 transform-style-3d">
        {/* Polished Edge Detail */}
        <div className="p-[3px] bg-zinc-950 rounded-[3.4rem] shadow-inner overflow-hidden relative">
          {/* Main Bezel */}
          <div className="p-[8px] bg-black rounded-[3.3rem] relative overflow-hidden">
            
            {/* Screen Content Container */}
            <div className="bg-[#030303] w-[300px] sm:w-[340px] h-[640px] sm:h-[720px] rounded-[2.8rem] relative overflow-hidden ring-1 ring-white/10 shadow-[inset_0_0_60px_rgba(0,0,0,0.8)]">
              
              <DynamicIsland />

              {/* Status Bar */}
              <div className="absolute top-0 left-0 w-full px-8 pt-4 pb-2 flex justify-between items-center z-[90] text-[12px] font-semibold text-white">
                <span className="tracking-tight ml-2">9:41</span>
                <div className="flex items-center gap-2 mr-1">
                   <div className="flex gap-0.5 items-end h-[10px]">
                      <div className="w-[2px] h-[4px] bg-white rounded-full" />
                      <div className="w-[2px] h-[6px] bg-white rounded-full" />
                      <div className="w-[2px] h-[8px] bg-white rounded-full" />
                      <div className="w-[2px] h-[10px] bg-white/40 rounded-full" />
                   </div>
                   <span className="text-[10px] font-bold ml-1">5G</span>
                   <div className="w-6 h-3.5 rounded-[4px] border-[1.5px] border-white/40 p-[1px] relative">
                     <div className="w-[85%] h-full bg-white rounded-[1.5px]" />
                   </div>
                </div>
              </div>

              {/* Interface Content */}
              <div className="h-full w-full overflow-hidden">
                {children}
              </div>

              {/* Home Indicator */}
              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-[120px] h-[5px] bg-white/20 rounded-full z-50 backdrop-blur-xl" />
              
              {/* Realistic Screen Glare */}
              <div className="absolute inset-0 pointer-events-none z-50 mix-blend-overlay">
                 <div className="absolute -top-[100%] -right-[50%] w-[200%] h-[200%] bg-gradient-to-b from-white/[0.08] via-transparent to-transparent -translate-y-1/2 translate-x-1/4 rotate-45" />
                 <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/[0.02] to-white/[0.05] opacity-20" />
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};
