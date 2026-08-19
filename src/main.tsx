import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import App from './App'
import { AppProvider } from './contexts/app_context'
import './styles/tokens.css'
import './styles/app.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppProvider>
      <App />
    </AppProvider>
  </StrictMode>
)
