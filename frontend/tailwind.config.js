/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Agent-bootstrap dark palette (Tailwind classes use these; .light overrides in CSS)
        space: {
          600: '#444d56',
          700: '#30363d',
          800: '#1c2128',
          900: '#161b22',
          950: '#0d1117',
        },
        // Primary accent - Agent-bootstrap (orange/gold)
        gold: {
          300: '#e3b341',
          400: '#d29922',
          500: '#d29922',
          600: '#9a6700',
        },
        // Secondary accent - Violet (kept for compatibility)
        violet: {
          400: '#a78bfa',
          500: '#8b5cf6',
          600: '#7c3aed',
        },
        // Agent-bootstrap accents for utility classes
        accent: {
          blue: '#58a6ff',
          green: '#3fb950',
          orange: '#d29922',
          yellow: '#e3b341',
        },
        // Semantic colors
        success: '#10b981',
        error: '#ef4444',
        warning: '#f59e0b',
        info: '#3b82f6',
        // WhatsApp colors (kept for chat bubbles)
        whatsapp: {
          light: '#25D366',
          dark: '#128C7E',
          teal: '#075E54',
        }
      },
      fontFamily: {
        brand: ['Audiowide', 'monospace'],
        ui: ['Syne', 'sans-serif'],
        body: ['Syne', 'sans-serif'],
        code: ['JetBrains Mono', 'monospace'],
        display: ['Syne', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      boxShadow: {
        'glow-gold': '0 0 60px rgba(251, 191, 36, 0.3)',
        'glow-violet': '0 0 60px rgba(139, 92, 246, 0.3)',
        'card': '0 4px 24px rgba(0, 0, 0, 0.4)',
      },
      backgroundImage: {
        'gradient-primary': 'linear-gradient(135deg, #8b5cf6 0%, #fbbf24 100%)',
        'gradient-gold': 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)',
        'gradient-text': 'linear-gradient(90deg, #fbbf24 0%, #a78bfa 100%)',
      },
      keyframes: {
        'fade-in-up': {
          '0%': { opacity: '0', transform: 'translateY(24px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-up': {
          '0%': { transform: 'translateY(16px)' },
          '100%': { transform: 'translateY(0)' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'float': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-8px)' },
        },
        'glow-pulse': {
          '0%, 100%': { opacity: '0.4' },
          '50%': { opacity: '0.8' },
        },
        'bounce-subtle': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-4px)' },
        },
        'zoom-in': {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        }
      },
      animation: {
        'fade-in-up': 'fade-in-up 0.6s ease-out forwards',
        'slide-up': 'slide-up 0.5s ease-out forwards',
        'fade-in': 'fade-in 0.5s ease-out forwards',
        'float': 'float 4s ease-in-out infinite',
        'glow-pulse': 'glow-pulse 3s ease-in-out infinite',
        'bounce-subtle': 'bounce-subtle 3s ease-in-out infinite',
        'zoom-in': 'zoom-in 0.3s ease-out forwards',
      },
    },
  },
  plugins: [],
}
