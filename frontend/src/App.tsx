import { useState } from 'react'

import { login } from './api/client'
import Footer from './components/Footer'
import Header from './components/Header'
import AssistantPage from './pages/AssistantPage'
import DocumentsPage from './pages/DocumentsPage'
import EvaluationPage from './pages/EvaluationPage'
import HelpPage from './pages/HelpPage'
import LoginPage from './pages/LoginPage'

type Page = 'assistant' | 'documents' | 'evaluation' | 'help'

export default function App() {
  const [activePage, setActivePage] = useState<Page>('assistant')
  const [accessToken, setAccessToken] = useState<string | null>(() =>
    window.sessionStorage.getItem('aerospec_access_token'),
  )

  async function handleLogin(username: string, password: string) {
    const session = await login({ username, password })
    window.sessionStorage.setItem('aerospec_access_token', session.access_token)
    setAccessToken(session.access_token)
  }

  function handleAuthenticationExpired() {
    window.sessionStorage.removeItem('aerospec_access_token')
    setAccessToken(null)
  }

  if (accessToken === null) {
    return <LoginPage onLogin={handleLogin} />
  }

  return (
    <div className="app-shell" id="top">
      <Header
        activePage={activePage}
        onAssistantSelect={() => setActivePage('assistant')}
        onDocumentsSelect={() => setActivePage('documents')}
        onEvaluationSelect={() => setActivePage('evaluation')}
        onHelpSelect={() => setActivePage('help')}
      />
      {activePage === 'assistant' && (
        <AssistantPage
          accessToken={accessToken}
          onAuthenticationExpired={handleAuthenticationExpired}
        />
      )}
      {activePage === 'documents' && <DocumentsPage />}
      {activePage === 'evaluation' && <EvaluationPage />}
      {activePage === 'help' && <HelpPage />}
      <Footer />
    </div>
  )
}
