import { useTheme } from '../../contexts/ThemeContext'
import { Bot, Sparkles } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useState } from 'react'

export default function GlobalAIAssistant() {
  const { isDark } = useTheme()
  const [isHovered, setIsHovered] = useState(false)

  const handleOpen = () => {
    window.dispatchEvent(new CustomEvent('seven-t:open-chatbot'))
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-2">
      <AnimatePresence>
        {isHovered && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.9 }}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium shadow-lg backdrop-blur-md mb-1 flex items-center gap-1.5 ${
              isDark 
                ? 'bg-space-800/90 text-gray-200 border border-gold-400/20' 
                : 'bg-white/90 text-gray-800 border border-gold-500/20'
            }`}
          >
            <span>Assistant IA</span>
            <div className={`flex items-center gap-0.5 px-1 rounded text-[9px] font-mono border ${
              isDark ? 'bg-space-900 border-space-700' : 'bg-gray-100 border-gray-200'
            }`}>
              <span>⌘</span><span>K</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <button
        onClick={handleOpen}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={`group relative flex items-center justify-center w-14 h-14 rounded-full shadow-2xl transition-all duration-300 hover:scale-110 active:scale-95 ${
          isDark 
            ? 'bg-gradient-to-tr from-space-800 to-space-700 border border-gold-400/30 text-gold-400 hover:shadow-gold-500/20' 
            : 'bg-gradient-to-tr from-white to-gray-50 border border-gold-500/30 text-gold-500 hover:shadow-gold-500/30'
        }`}
      >
        <div className="absolute inset-0 rounded-full bg-gold-400/10 blur-md group-hover:bg-gold-400/20 transition-all"></div>
        <Bot className="w-6 h-6 relative z-10" />
        <Sparkles className="w-3 h-3 absolute top-3 right-3 text-gold-300 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      </button>
    </div>
  )
}
