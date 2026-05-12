import React from "react";
import { motion } from "framer-motion";

export const InteractiveWord = ({ word }) => {
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
            className="absolute left-0 top-0 block text-amber-500"
          >
            {char}
          </motion.span>
        </span>
      ))}
    </motion.span>
  );
};
