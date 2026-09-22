import { useState } from 'react'

import Footer from './components/Footer'
import Header from './components/Header'
import AssistantPage from './pages/AssistantPage'
import HelpPage from './pages/HelpPage'

type Page = 'assistant' | 'help'

export default function App() {
  const [activePage, setActivePage] = useState<Page>('assistant')

  return (
    <div className="app-shell" id="top">
      <Header
        activePage={activePage}
        onAssistantSelect={() => setActivePage('assistant')}
        onHelpSelect={() => setActivePage('help')}
      />
      {activePage === 'assistant' ? <AssistantPage /> : <HelpPage />}
      <Footer />
    </div>
  )
}
