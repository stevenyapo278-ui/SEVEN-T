import { createContext, useContext, useState, useEffect } from 'react'

const STORAGE_KEY = 'seven-t-font'
const STORAGE_SIZE_KEY = 'seven-t-font-size'
const STORAGE_TITLES_SYNC_KEY = 'seven-t-font-titles-sync'

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
    if (typeof window === 'undefined') return 'outfit'
    const saved = localStorage.getItem(STORAGE_KEY)
    
    // Migration: If no font is saved OR if the saved font is 'jakarta' (old default),
    // force it to 'outfit' once to align with the new SaaS branding.
    if (!saved || saved === 'jakarta') {
      localStorage.setItem(STORAGE_KEY, 'outfit')
      return 'outfit'
    }
    
    return saved && FONT_PRESETS[saved] ? saved : 'outfit'
  })

  const [titleFontPreset, setTitleFontPresetState] = useState(() => {
    if (typeof window === 'undefined') return 'outfit'
    const saved = localStorage.getItem(STORAGE_KEY + '-title')
    
    // Migration for titles: align with outfit if was syne or none
    if (!saved || saved === 'syne') {
      localStorage.setItem(STORAGE_KEY + '-title', 'outfit')
      return 'outfit'
    }
    
    return saved && FONT_PRESETS[saved] ? saved : 'outfit'
  })

  const [titlesMatchBody, setTitlesMatchBodyState] = useState(() => {
    if (typeof window === 'undefined') return true
    const saved = localStorage.getItem(STORAGE_TITLES_SYNC_KEY)
    if (saved === null) return true
    return saved === 'true'
  })

  const [fontSize, setFontSizeState] = useState(() => {
    if (typeof window === 'undefined') return 'md'
    const saved = localStorage.getItem(STORAGE_SIZE_KEY)
    return saved && ['sm', 'md', 'lg', 'xl'].includes(saved) ? saved : 'md'
  })

  useEffect(() => {
    const root = document.documentElement
    const bodyPreset = FONT_PRESETS[fontPreset] || FONT_PRESETS.outfit
    const titlePreset = FONT_PRESETS[titleFontPreset] || FONT_PRESETS.outfit

    root.style.setProperty('--font-ui', bodyPreset.fontUi)
    root.style.setProperty('--font-body', bodyPreset.fontBody)
    // Uniform typography across the whole layout
    root.style.setProperty('--font-brand', bodyPreset.fontUi)
    root.style.setProperty('--font-code', bodyPreset.fontCode)
    
    root.style.setProperty('--font-display', titlesMatchBody ? bodyPreset.fontUi : titlePreset.fontUi)

    localStorage.setItem(STORAGE_KEY, fontPreset)
    localStorage.setItem(STORAGE_KEY + '-title', titleFontPreset)
    localStorage.setItem(STORAGE_TITLES_SYNC_KEY, String(titlesMatchBody))

    const sizeMap = { sm: '14px', md: '16px', lg: '18px', xl: '22px' }
    const px = sizeMap[fontSize] || '16px'
    root.style.setProperty('--base-font-size', px)
    root.style.fontSize = px
    localStorage.setItem(STORAGE_SIZE_KEY, fontSize)
  }, [fontPreset, titleFontPreset, titlesMatchBody, fontSize])

  const setFontPreset = (value) => {
    if (FONT_PRESETS[value]) setFontPresetState(value)
  }

  const setTitleFontPreset = (value) => {
    if (FONT_PRESETS[value]) setTitleFontPresetState(value)
  }

  const setTitlesMatchBody = (value) => {
    setTitlesMatchBodyState(Boolean(value))
  }

  const setFontSize = (value) => {
    if (['sm', 'md', 'lg', 'xl'].includes(value)) setFontSizeState(value)
  }

  const value = {
    fontPreset,
    setFontPreset,
    titleFontPreset,
    setTitleFontPreset,
    titlesMatchBody,
    setTitlesMatchBody,
    fontSize,
    setFontSize,
    presets: FONT_PRESETS,
  }

  return (
    <FontContext.Provider value={value}>
      {children}
    </FontContext.Provider>
  )
}
