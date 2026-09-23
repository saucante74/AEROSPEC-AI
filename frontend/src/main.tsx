import { createRoot } from 'react-dom/client'

import App from './App'
import { I18nProvider } from './i18n/I18nContext'
import './styles.css'

const rootElement = document.getElementById('root')

if (!rootElement) {
  throw new Error('Root element not found')
}

createRoot(rootElement).render(
  <I18nProvider>
    <App />
  </I18nProvider>,
)
