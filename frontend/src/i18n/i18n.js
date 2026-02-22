import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import fr from './fr.json'
import en from './en.json'

const resources = { fr: { translation: fr }, en: { translation: en } }

i18n.use(initReactI18next).init({
  resources,
  lng: (typeof localStorage !== 'undefined' && localStorage.getItem('locale')) || 'fr',
  fallbackLng: 'fr',
  supportedLngs: ['fr', 'en'],
  load: 'currentOnly',
  interpolation: { escapeValue: false },
})

export default i18n
