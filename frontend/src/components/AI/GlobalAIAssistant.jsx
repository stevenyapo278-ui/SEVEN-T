import { useTheme } from '../../contexts/ThemeContext'
import { Search } from 'lucide-react'

export default function GlobalAIAssistant() {
  const { isDark } = useTheme()

  const handleOpen = () => {
    window.dispatchEvent(new CustomEvent('seven-t:open-global-ai'))
  }

  return (
    <>
      {/* Desktop Search Bar Trigger */}
      <button
        onClick={handleOpen}
        className={`hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all ${
          isDark 
            ? 'bg-space-800 border-space-700 text-gray-400 hover:text-gray-200 hover:bg-space-700' 
            : 'bg-white border-gray-200 text-gray-500 hover:text-gray-800 hover:bg-gray-50'
        }`}
      >
        <Search className="w-4 h-4" />
        <span className="text-xs font-medium mr-4">Demander à l'IA...</span>
        <div className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-mono ${isDark ? 'bg-space-900 border-space-700' : 'bg-gray-100 border-gray-200'} border`}>
          <span>⌘</span><span>K</span>
        </div>
      </button>

      {/* Mobile Icon Button Trigger */}
      <button
        onClick={handleOpen}
        className={`md:hidden flex items-center justify-center w-8 h-8 rounded-lg transition-all ${
          isDark ? 'hover:bg-space-800 text-gray-400' : 'hover:bg-gray-100 text-gray-500'
        }`}
      >
        <Search className="w-5 h-5" />
      </button>
    </>
  )
}
