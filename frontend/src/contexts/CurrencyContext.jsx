import { createContext, useContext, useState, useEffect } from 'react'
import api from '../services/api'

// Devises supportées
export const CURRENCIES = {
  XOF: { code: 'XOF', symbol: 'FCFA', name: 'Franc CFA (BCEAO)', locale: 'fr-FR', position: 'after' },
  XAF: { code: 'XAF', symbol: 'FCFA', name: 'Franc CFA (BEAC)', locale: 'fr-FR', position: 'after' },
  EUR: { code: 'EUR', symbol: '€', name: 'Euro', locale: 'fr-FR', position: 'after' },
  USD: { code: 'USD', symbol: '$', name: 'Dollar US', locale: 'en-US', position: 'before' },
  GBP: { code: 'GBP', symbol: '£', name: 'Livre Sterling', locale: 'en-GB', position: 'before' },
  MAD: { code: 'MAD', symbol: 'DH', name: 'Dirham Marocain', locale: 'fr-MA', position: 'after' },
  TND: { code: 'TND', symbol: 'DT', name: 'Dinar Tunisien', locale: 'fr-TN', position: 'after' },
  GNF: { code: 'GNF', symbol: 'GNF', name: 'Franc Guinéen', locale: 'fr-GN', position: 'after' },
  NGN: { code: 'NGN', symbol: '₦', name: 'Naira Nigérian', locale: 'en-NG', position: 'before' },
}

// Devise par défaut: CFA (BCEAO)
const DEFAULT_CURRENCY = 'XOF'

const CurrencyContext = createContext()

export function CurrencyProvider({ children }) {
  const [currency, setCurrencyState] = useState(() => {
    // Charger depuis localStorage au démarrage
    const saved = localStorage.getItem('currency')
    return saved && CURRENCIES[saved] ? saved : DEFAULT_CURRENCY
  })

  const [loading, setLoading] = useState(true)

  // Charger la préférence depuis le serveur au démarrage
  useEffect(() => {
    const loadCurrency = async () => {
      try {
        const response = await api.get('/users/me')
        if (response.data?.user?.currency && CURRENCIES[response.data.user.currency]) {
          setCurrencyState(response.data.user.currency)
          localStorage.setItem('currency', response.data.user.currency)
        }
      } catch (error) {
        // Utiliser la valeur locale si pas connecté
        console.log('Using local currency preference')
      } finally {
        setLoading(false)
      }
    }
    loadCurrency()
  }, [])

  // Mettre à jour la devise (locale + serveur)
  const setCurrency = async (newCurrency) => {
    if (!CURRENCIES[newCurrency]) return

    setCurrencyState(newCurrency)
    localStorage.setItem('currency', newCurrency)

    // Sauvegarder sur le serveur
    try {
      await api.put('/users/me', { currency: newCurrency })
    } catch (error) {
      console.error('Error saving currency preference:', error)
    }
  }

  // Formater un prix selon la devise
  const formatPrice = (amount, options = {}) => {
    const curr = CURRENCIES[currency]
    if (!curr) return `${amount}`

    const formattedNumber = Number(amount).toLocaleString(curr.locale, {
      minimumFractionDigits: currency === 'XOF' || currency === 'XAF' || currency === 'GNF' ? 0 : 2,
      maximumFractionDigits: currency === 'XOF' || currency === 'XAF' || currency === 'GNF' ? 0 : 2,
    })

    if (curr.position === 'before') {
      return `${curr.symbol}${formattedNumber}`
    } else {
      return `${formattedNumber} ${curr.symbol}`
    }
  }

  // Obtenir le symbole seul
  const getSymbol = () => CURRENCIES[currency]?.symbol || 'FCFA'

  // Obtenir l'info complète de la devise
  const getCurrencyInfo = () => CURRENCIES[currency] || CURRENCIES[DEFAULT_CURRENCY]

  const value = {
    currency,
    setCurrency,
    formatPrice,
    getSymbol,
    getCurrencyInfo,
    currencies: CURRENCIES,
    loading
  }

  return (
    <CurrencyContext.Provider value={value}>
      {children}
    </CurrencyContext.Provider>
  )
}

export function useCurrency() {
  const context = useContext(CurrencyContext)
  if (!context) {
    throw new Error('useCurrency must be used within a CurrencyProvider')
  }
  return context
}

export default CurrencyContext
