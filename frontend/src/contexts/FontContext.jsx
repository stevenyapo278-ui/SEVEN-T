import { createContext, useContext, useState, useEffect } from 'react'

const STORAGE_KEY = 'seven-t-font'

export const FONT_PRESETS = {
  syne: {
    label: 'Syne',
    description: 'Par défaut (moderne)',
    fontUi: "'Syne', sans-serif",
    fontBody: "'Syne', sans-serif",
    fontBrand: "'Audiowide', monospace",
    fontCode: "'JetBrains Mono', monospace",
  },
  inter: {
    label: 'Inter',
    description: 'Classique, très lisible',
    fontUi: "'Inter', sans-serif",
    fontBody: "'Inter', sans-serif",
    fontBrand: "'Audiowide', monospace",
    fontCode: "'JetBrains Mono', monospace",
  },
  audiowide: {
    label: 'Audiowide',
    description: 'Style terminal / tech',
    fontUi: "'Audiowide', monospace",
    fontBody: "'Audiowide', monospace",
    fontBrand: "'Audiowide', monospace",
    fontCode: "'JetBrains Mono', monospace",
  },
}

const FontContext = createContext(null)

export function useFont() {
  const context = useContext(FontContext)
  if (!context) {
    throw new Error('useFont must be used within a FontProvider')
  }
  return context
}

export function FontProvider({ children }) {
  const [fontPreset, setFontPresetState] = useState(() => {
    if (typeof window === 'undefined') return 'syne'
    const saved = localStorage.getItem(STORAGE_KEY)
    return saved && FONT_PRESETS[saved] ? saved : 'syne'
  })

  useEffect(() => {
    const root = document.documentElement
    const preset = FONT_PRESETS[fontPreset] || FONT_PRESETS.syne
    root.style.setProperty('--font-ui', preset.fontUi)
    root.style.setProperty('--font-body', preset.fontBody)
    root.style.setProperty('--font-brand', preset.fontBrand)
    root.style.setProperty('--font-code', preset.fontCode)
    localStorage.setItem(STORAGE_KEY, fontPreset)
  }, [fontPreset])

  const setFontPreset = (value) => {
    if (FONT_PRESETS[value]) setFontPresetState(value)
  }

  const value = {
    fontPreset,
    setFontPreset,
    presets: FONT_PRESETS,
  }

  return (
    <FontContext.Provider value={value}>
      {children}
    </FontContext.Provider>
  )
}
