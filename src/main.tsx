import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import App from './App'
import ErrorBoundary from './components/ErrorBoundary'
import { AppProvider } from './contexts/app_context'
import './styles/tokens.css'
import './styles/app.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <AppProvider>
        <App />
      </AppProvider>
    </ErrorBoundary>
  </StrictMode>
)
