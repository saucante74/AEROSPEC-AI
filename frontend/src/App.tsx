import Footer from './components/Footer'
import Header from './components/Header'
import AssistantPage from './pages/AssistantPage'

export default function App() {
  return (
    <div className="app-shell" id="top">
      <Header />
      <AssistantPage />
      <Footer />
    </div>
  )
}
