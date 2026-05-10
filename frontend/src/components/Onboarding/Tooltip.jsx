import { useState, useEffect, useRef } from 'react'
import { X, ChevronRight, ChevronLeft } from 'lucide-react'
import { useTheme } from '../../contexts/ThemeContext'

// Tooltip positions
const POSITIONS = {
  top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
  bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
  left: 'right-full top-1/2 -translate-y-1/2 mr-2',
  right: 'left-full top-1/2 -translate-y-1/2 ml-2',
  'bottom-left': 'top-full left-0 mt-2',
  'bottom-right': 'top-full right-0 mt-2',
  'top-left': 'bottom-full left-0 mb-2',
  'top-right': 'bottom-full right-0 mb-2'
}

const ARROW_POSITIONS = {
  top: 'top-full left-1/2 -translate-x-1/2 border-t-gold-400 border-l-transparent border-r-transparent border-b-transparent',
  bottom: 'bottom-full left-1/2 -translate-x-1/2 border-b-gold-400 border-l-transparent border-r-transparent border-t-transparent',
  left: 'left-full top-1/2 -translate-y-1/2 border-l-gold-400 border-t-transparent border-b-transparent border-r-transparent',
  right: 'right-full top-1/2 -translate-y-1/2 border-r-gold-400 border-t-transparent border-b-transparent border-l-transparent',
  'bottom-left': 'bottom-full left-4 border-b-gold-400 border-l-transparent border-r-transparent border-t-transparent',
  'bottom-right': 'bottom-full right-4 border-b-gold-400 border-l-transparent border-r-transparent border-t-transparent',
  'top-left': 'top-full left-4 border-t-gold-400 border-l-transparent border-r-transparent border-b-transparent',
  'top-right': 'top-full right-4 border-t-gold-400 border-l-transparent border-r-transparent border-b-transparent'
}

export function Tooltip({ 
  id,
  title, 
  description, 
  position = 'bottom',
  isVisible,
  onDismiss,
  step,
  totalSteps,
  onNext,
  onPrev,
  children 
}) {
  const tooltipRef = useRef(null)
  const { isDark } = useTheme()

  if (!isVisible) {
    return children
  }

  return (
    <div className="relative inline-block">
      {/* Highlight ring around the element */}
      <div className={`relative z-50 ring-2 ring-gold-400 ring-offset-2 rounded-lg animate-pulse ${
        isDark ? 'ring-offset-space-900' : 'ring-offset-white'
      }`}>
        {children}
      </div>

      {/* Tooltip */}
      <div 
        ref={tooltipRef}
        className={`absolute z-[60] w-72 ${POSITIONS[position]}`}
      >
        {/* Arrow */}
        <div className={`absolute size-0 border-8 ${ARROW_POSITIONS[position]}`} />
        
        {/* Content */}
        <div className={`border rounded-xl shadow-xl overflow-hidden ${
          isDark 
            ? 'bg-space-800 border-gold-400/50 shadow-gold-400/10' 
            : 'bg-white border-gold-400 shadow-zinc-200'
        }`}>
          {/* Header */}
          <div className={`px-4 py-3 bg-gradient-to-r from-gold-400/20 to-blue-500/20 border-b ${
            isDark ? 'border-space-700' : 'border-zinc-100'
          }`}>
            <div className="flex items-center justify-between">
              <h4 className="font-syne font-semibold text-gold-400">{title}</h4>
              <button 
                onClick={onDismiss}
                className={`transition-colors ${isDark ? 'text-gray-400 hover:text-white' : 'text-zinc-400 hover:text-zinc-900'}`}
              >
                <X className="size-4" />
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="px-4 py-3">
            <p className={`text-sm ${isDark ? 'text-gray-300' : 'text-zinc-600'}`}>{description}</p>
          </div>

          {/* Footer with navigation */}
          <div className={`px-4 py-3 border-t flex items-center justify-between ${
            isDark ? 'bg-space-900/50 border-space-700' : 'bg-zinc-50 border-zinc-100'
          }`}>
            <span className={`text-xs ${isDark ? 'text-gray-500' : 'text-zinc-400'}`}>
              {step}/{totalSteps}
            </span>
            <div className="flex items-center gap-2">
              {step > 1 && (
                <button
                  onClick={onPrev}
                  className={`p-1.5 rounded-lg transition-colors ${
                    isDark ? 'text-gray-400 hover:text-white hover:bg-space-700' : 'text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100'
                  }`}
                >
                  <ChevronLeft className="size-4" />
                </button>
              )}
              {step < totalSteps ? (
                <button
                  onClick={onNext}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                    isDark ? 'bg-gold-400 text-space-900 hover:bg-gold-300' : 'bg-zinc-900 text-white hover:bg-zinc-800'
                  }`}
                >
                  Suivant
                </button>
              ) : (
                <button
                  onClick={onDismiss}
                  className="px-3 py-1.5 text-xs font-medium bg-emerald-500 text-white rounded-lg hover:bg-emerald-400 transition-colors"
                >
                  Terminer
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// Overlay backdrop when tooltips are active
export function TooltipOverlay({ isVisible, onClick }) {
  const { isDark } = useTheme()
  if (!isVisible) return null

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      onClick()
    }
  }

  return (
    <div 
      className={`fixed inset-0 backdrop-blur-sm z-40 ${isDark ? 'bg-space-950/80' : 'bg-zinc-950/40'}`}
      onClick={onClick}
      onKeyDown={handleKeyDown}
      role="button"
      tabIndex={0}
      aria-label="Fermer"
    />
  )
}

export default Tooltip
