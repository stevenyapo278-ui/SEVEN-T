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
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
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
  </React.StrictMode>,
)
