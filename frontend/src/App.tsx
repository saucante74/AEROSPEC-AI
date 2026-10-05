import { useCallback, useEffect, useState } from 'react'

import { ApiError, getUsageStatus, login } from './api/client'
import type { UsageStatus } from './api/client'
import Footer from './components/Footer'
import Header from './components/Header'
import LogoutDialog from './components/LogoutDialog'
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
  const [isLoginOpen, setIsLoginOpen] = useState(false)
  const [isLogoutOpen, setIsLogoutOpen] = useState(false)
  const [usageStatus, setUsageStatus] = useState<UsageStatus | null>(null)

  const clearAuthentication = useCallback(() => {
    window.sessionStorage.removeItem('aerospec_access_token')
    setAccessToken(null)
    setUsageStatus(null)
  }, [])

  const refreshUsageStatus = useCallback(async (
    token: string,
  ) => {
    try {
      const status = await getUsageStatus(token)
      if (window.sessionStorage.getItem('aerospec_access_token') === token) {
        setUsageStatus(status)
      }
    } catch (error) {
      if (window.sessionStorage.getItem('aerospec_access_token') !== token) {
        return
      }

      if (error instanceof ApiError && error.status === 401) {
        clearAuthentication()
      } else {
        setUsageStatus(null)
      }
    }
  }, [clearAuthentication])

  useEffect(() => {
    if (!accessToken) {
      return
    }

    const initialStatusRequest = window.setTimeout(() => {
      void refreshUsageStatus(accessToken)
    }, 0)
    return () => window.clearTimeout(initialStatusRequest)
  }, [accessToken, refreshUsageStatus])

  async function handleLogin(username: string, password: string) {
    const session = await login({ username, password })
    window.sessionStorage.setItem('aerospec_access_token', session.access_token)
    setAccessToken(session.access_token)
    setIsLoginOpen(false)
  }

  function handleAuthenticationRequired() {
    clearAuthentication()
    setIsLoginOpen(true)
  }

  function handleLogout() {
    clearAuthentication()
    setIsLogoutOpen(false)
  }

  return (
    <div className="app-shell" id="top">
      <Header
        activePage={activePage}
        onAssistantSelect={() => setActivePage('assistant')}
        onDocumentsSelect={() => setActivePage('documents')}
        onEvaluationSelect={() => setActivePage('evaluation')}
        onHelpSelect={() => setActivePage('help')}
        isAuthenticated={accessToken !== null}
        usageStatus={usageStatus}
        onLoginSelect={() => setIsLoginOpen(true)}
        onLogoutSelect={() => setIsLogoutOpen(true)}
      />
      {activePage === 'assistant' && (
        <AssistantPage
          accessToken={accessToken}
          onAuthenticationRequired={handleAuthenticationRequired}
          onQuestionSucceeded={() => {
            if (accessToken) {
              void refreshUsageStatus(accessToken)
            }
          }}
        />
      )}
      {activePage === 'documents' && <DocumentsPage />}
      {activePage === 'evaluation' && <EvaluationPage />}
      {activePage === 'help' && <HelpPage />}
      <Footer />
      {isLoginOpen && (
        <LoginPage
          onCancel={() => setIsLoginOpen(false)}
          onLogin={handleLogin}
        />
      )}
      {isLogoutOpen && (
        <LogoutDialog
          onCancel={() => setIsLogoutOpen(false)}
          onConfirm={handleLogout}
        />
      )}
    </div>
  )
}
