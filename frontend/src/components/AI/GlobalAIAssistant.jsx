import { useTheme } from '../../contexts/ThemeContext'
import { Bot } from 'lucide-react'

export default function GlobalAIAssistant() {
  const { isDark } = useTheme()

  const handleOpen = () => {
    window.dispatchEvent(new CustomEvent('seven-t:open-chatbot'))
  }

  return (
    <>
      {/* Desktop: Bot pill button */}
      <button
        onClick={handleOpen}
        title="Assistant IA (⌘K)"
        className={`hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all group ${
          isDark
            ? 'bg-space-800 border-space-700 text-gray-400 hover:text-white hover:border-gold-400/40 hover:bg-space-700'
            : 'bg-white border-gray-200 text-gray-500 hover:text-gray-900 hover:border-gold-400/40 hover:bg-gray-50'
        }`}
      >
        <Bot className="w-4 h-4 text-gold-400" />
        <span className="text-xs font-medium">Assistant IA</span>
        <div className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-mono border ${
          isDark ? 'bg-space-900 border-space-700 text-gray-500' : 'bg-gray-100 border-gray-200 text-gray-400'
        }`}>
          <span>⌘</span><span>K</span>
        </div>
      </button>

      {/* Mobile: Icon only */}
      <button
        onClick={handleOpen}
        className={`md:hidden flex items-center justify-center w-8 h-8 rounded-lg transition-all ${
          isDark ? 'hover:bg-space-800 text-gold-400' : 'hover:bg-gray-100 text-gold-500'
        }`}
      >
        <Bot className="w-5 h-5" />
      </button>
    </>
  )
}
