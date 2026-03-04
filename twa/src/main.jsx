import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// Initialize Telegram Web App
window.Telegram?.WebApp.ready()
window.Telegram?.WebApp.expand()

// Handle viewport changes when keyboard appears/disappears
if (window.Telegram?.WebApp) {
  window.Telegram.WebApp.onEvent('viewportChanged', () => {
    window.Telegram.WebApp.expand()
  })
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
