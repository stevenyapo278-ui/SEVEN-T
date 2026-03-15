import React from 'react'
import { motion } from 'framer-motion'
import { useTheme } from '../contexts/ThemeContext'

const AnimatedBackground = () => {
  const { theme } = useTheme()
  const isDark = theme === 'dark'

  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10 bg-transparent">
      {/* Blue Orb - Optimized with Radial Gradient */}
      <motion.div 
        animate={{ 
          scale: [1, 1.2, 1],
          x: [0, 50, 0],
          y: [0, 30, 0],
        }}
        transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
        className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full opacity-60"
        style={{
          background: `radial-gradient(circle at center, ${isDark ? 'rgba(37, 99, 235, 0.25)' : 'rgba(96, 165, 250, 0.15)'} 0%, transparent 70%)`,
          willChange: 'transform',
          transform: 'translateZ(0)'
        }}
      />
      
      {/* Gold Orb - Optimized with Radial Gradient */}
      <motion.div 
        animate={{ 
          scale: [1, 1.1, 1],
          x: [0, -30, 0],
          y: [0, 50, 0],
        }}
        transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
        className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] rounded-full opacity-60"
        style={{
          background: `radial-gradient(circle at center, ${isDark ? 'rgba(251, 191, 36, 0.15)' : 'rgba(253, 230, 138, 0.08)'} 0%, transparent 70%)`,
          willChange: 'transform',
          transform: 'translateZ(0)'
        }}
      />
      
      {/* Subtle Dot Grid */}
      <div 
        className={`absolute inset-0 opacity-[0.03] transition-opacity duration-700 ${isDark ? 'invert' : ''}`} 
        style={{ 
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
            willChange: 'opacity'
        }} 
      />
    </div>
  )
}

export default AnimatedBackground
