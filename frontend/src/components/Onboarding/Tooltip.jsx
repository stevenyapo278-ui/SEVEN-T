import { useState, useEffect, useRef } from 'react'
import { X, ChevronRight, ChevronLeft } from 'lucide-react'

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

  if (!isVisible) {
    return children
  }

  return (
    <div className="relative inline-block">
      {/* Highlight ring around the element */}
      <div className="relative z-50 ring-2 ring-gold-400 ring-offset-2 ring-offset-space-900 rounded-lg animate-pulse">
        {children}
      </div>

      {/* Tooltip */}
      <div 
        ref={tooltipRef}
        className={`absolute z-[60] w-72 ${POSITIONS[position]}`}
      >
        {/* Arrow */}
        <div className={`absolute w-0 h-0 border-8 ${ARROW_POSITIONS[position]}`} />
        
        {/* Content */}
        <div className="bg-space-800 border border-gold-400/50 rounded-xl shadow-xl shadow-gold-400/10 overflow-hidden">
          {/* Header */}
          <div className="px-4 py-3 bg-gradient-to-r from-gold-400/20 to-violet-500/20 border-b border-space-700">
            <div className="flex items-center justify-between">
              <h4 className="font-display font-semibold text-gold-400">{title}</h4>
              <button 
                onClick={onDismiss}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="px-4 py-3">
            <p className="text-sm text-gray-300">{description}</p>
          </div>

          {/* Footer with navigation */}
          <div className="px-4 py-3 bg-space-900/50 border-t border-space-700 flex items-center justify-between">
            <span className="text-xs text-gray-500">
              {step}/{totalSteps}
            </span>
            <div className="flex items-center gap-2">
              {step > 1 && (
                <button
                  onClick={onPrev}
                  className="p-1.5 text-gray-400 hover:text-white hover:bg-space-700 rounded-lg transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
              )}
              {step < totalSteps ? (
                <button
                  onClick={onNext}
                  className="px-3 py-1.5 text-xs font-medium bg-gold-400 text-space-900 rounded-lg hover:bg-gold-300 transition-colors"
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
  if (!isVisible) return null

  return (
    <div 
      className="fixed inset-0 bg-space-950/80 backdrop-blur-sm z-40"
      onClick={onClick}
    />
  )
}

export default Tooltip
