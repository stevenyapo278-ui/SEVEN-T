import { createContext, useContext, useState, useEffect } from 'react'

const STORAGE_KEY = 'seven-t-font'

export const FONT_PRESETS = {
  jakarta: {
    label: 'Premium (Jakarta)',
    description: 'Élégant et professionnel',
    fontUi: "'Plus Jakarta Sans', sans-serif",
    fontBody: "'Plus Jakarta Sans', sans-serif",
    fontBrand: "'Audiowide', monospace",
    fontCode: "'JetBrains Mono', monospace",
  },
  outfit: {
    label: 'Moderne (Outfit)',
    description: 'Propre et géométrique',
    fontUi: "'Outfit', sans-serif",
    fontBody: "'Outfit', sans-serif",
    fontBrand: "'Audiowide', monospace",
    fontCode: "'JetBrains Mono', monospace",
  },
  grotesk: {
    label: 'Futuriste (Grotesk)',
    description: 'Style tech et innovant',
    fontUi: "'Space Grotesk', sans-serif",
    fontBody: "'Space Grotesk', sans-serif",
    fontBrand: "'Audiowide', monospace",
    fontCode: "'JetBrains Mono', monospace",
  },
  sora: {
    label: 'Signature (Sora)',
    description: 'Design unique et soigné',
    fontUi: "'Sora', sans-serif",
    fontBody: "'Sora', sans-serif",
    fontBrand: "'Audiowide', monospace",
    fontCode: "'JetBrains Mono', monospace",
  },
  syne: {
    label: 'Syne',
    description: 'Moderne et audacieux',
    fontUi: "'Syne', sans-serif",
    fontBody: "'Syne', sans-serif",
    fontBrand: "'Audiowide', monospace",
    fontCode: "'JetBrains Mono', monospace",
  },
  inter: {
    label: 'Inter',
    description: 'Classique et lisible',
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
    if (typeof window === 'undefined') return 'jakarta'
    const saved = localStorage.getItem(STORAGE_KEY)
    return saved && FONT_PRESETS[saved] ? saved : 'jakarta'
  })

  const [titleFontPreset, setTitleFontPresetState] = useState(() => {
    if (typeof window === 'undefined') return 'syne'
    const saved = localStorage.getItem(STORAGE_KEY + '-title')
    return saved && FONT_PRESETS[saved] ? saved : 'syne'
  })

  useEffect(() => {
    const root = document.documentElement
    const bodyPreset = FONT_PRESETS[fontPreset] || FONT_PRESETS.jakarta
    const titlePreset = FONT_PRESETS[titleFontPreset] || FONT_PRESETS.syne

    root.style.setProperty('--font-ui', bodyPreset.fontUi)
    root.style.setProperty('--font-body', bodyPreset.fontBody)
    root.style.setProperty('--font-brand', bodyPreset.fontBrand)
    root.style.setProperty('--font-code', bodyPreset.fontCode)
    
    // Specifically for large titles
    root.style.setProperty('--font-display', titlePreset.fontUi)

    localStorage.setItem(STORAGE_KEY, fontPreset)
    localStorage.setItem(STORAGE_KEY + '-title', titleFontPreset)
  }, [fontPreset, titleFontPreset])

  const setFontPreset = (value) => {
    if (FONT_PRESETS[value]) setFontPresetState(value)
  }

  const setTitleFontPreset = (value) => {
    if (FONT_PRESETS[value]) setTitleFontPresetState(value)
  }

  const value = {
    fontPreset,
    setFontPreset,
    titleFontPreset,
    setTitleFontPreset,
    presets: FONT_PRESETS,
  }

  return (
    <FontContext.Provider value={value}>
      {children}
    </FontContext.Provider>
  )
}
