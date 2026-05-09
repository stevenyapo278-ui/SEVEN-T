import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import App from './App.jsx'
import { AuthProvider } from './contexts/AuthContext.jsx'
import { ThemeProvider } from './contexts/ThemeContext.jsx'
import { FontProvider } from './contexts/FontContext.jsx'
import { ConfirmProvider } from './contexts/ConfirmContext.jsx'
import { CurrencyProvider } from './contexts/CurrencyContext.jsx'
import './i18n/i18n.js'
import { HelmetProvider } from 'react-helmet-async'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <HelmetProvider>
      <BrowserRouter>
      <ThemeProvider>
        <FontProvider>
          <AuthProvider>
            <ConfirmProvider>
              <CurrencyProvider>
                <App />
                <div role="region" aria-label="Notifications" aria-live="polite" className="toaster-region">
                  <Toaster
                    position="top-right"
                    toastOptions={{
                      className: '',
                      style: {
                        background: 'var(--bg-secondary)',
                        color: 'var(--text-primary)',
                        border: '1px solid var(--border-color)',
                      },
                    }}
                  />
                </div>
              </CurrencyProvider>
            </ConfirmProvider>
          </AuthProvider>
        </FontProvider>
      </ThemeProvider>
      </BrowserRouter>
    </HelmetProvider>
  </React.StrictMode>,
)
// Register service worker for push notifications
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(reg => console.log('Service Worker registered', reg))
      .catch(err => console.error('Service Worker registration failed', err));
  });
}
