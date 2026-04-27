import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import axios from 'axios'
import './index.css'
import App from './App.jsx'

// Si la app se sirve desde un host distinto a localhost (p. ej. un túnel
// público con Basic Auth), reescribimos las llamadas absolutas a
//  para que sean relativas (las enruta el proxy de Vite),
// y movemos el JWT del header Authorization a X-Authorization para no chocar
// con el Basic Auth del proxy (el backend tiene un middleware que lo recoge).
if (typeof window !== 'undefined' && !/^(localhost|127\.0\.0\.1)(:|$)/.test(window.location.host)) {
  axios.interceptors.request.use((config) => {
    if (config.url) {
      config.url = config.url.replace(/^https?:\/\/(?:localhost|127\.0\.0\.1):8000/, '')
    }
    if (config.baseURL) {
      config.baseURL = config.baseURL.replace(/^https?:\/\/(?:localhost|127\.0\.0\.1):8000/, '')
    }
    const headers = config.headers || {}
    const auth = headers.Authorization || headers.authorization
    if (auth && /^Bearer\s+/i.test(auth)) {
      headers['X-Authorization'] = auth
      delete headers.Authorization
      delete headers.authorization
      config.headers = headers
    }
    return config
  })
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
