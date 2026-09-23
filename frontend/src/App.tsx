import { useState } from 'react'

import Footer from './components/Footer'
import Header from './components/Header'
import AssistantPage from './pages/AssistantPage'
import EvaluationPage from './pages/EvaluationPage'
import HelpPage from './pages/HelpPage'

type Page = 'assistant' | 'evaluation' | 'help'

export default function App() {
  const [activePage, setActivePage] = useState<Page>('assistant')

  return (
    <div className="app-shell" id="top">
      <Header
        activePage={activePage}
        onAssistantSelect={() => setActivePage('assistant')}
        onEvaluationSelect={() => setActivePage('evaluation')}
        onHelpSelect={() => setActivePage('help')}
      />
      {activePage === 'assistant' && <AssistantPage />}
      {activePage === 'evaluation' && <EvaluationPage />}
      {activePage === 'help' && <HelpPage />}
      <Footer />
    </div>
  )
}
