import { FormEvent, useState } from 'react'
import { createRoot } from 'react-dom/client'

import { AskResponse, askQuestion } from './api'
import './styles.css'

function App() {
  const [question, setQuestion] = useState('')
  const [result, setResult] = useState<AskResponse | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const trimmedQuestion = question.trim()

    if (!trimmedQuestion) {
      setErrorMessage('Saisissez une question avant de lancer la recherche.')
      return
    }

    setIsLoading(true)
    setErrorMessage(null)
    setResult(null)

    try {
      setResult(await askQuestion(trimmedQuestion))
    } catch {
      setErrorMessage(
        "La réponse n'a pas pu être obtenue. Vérifiez que l'API est disponible, puis réessayez.",
      )
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <main className="app-shell">
      <section className="workspace" aria-labelledby="page-title">
        <header className="product-header">
          <p className="eyebrow">Assistant documentaire industriel</p>
          <h1 id="page-title">AeroSpec AI</h1>
          <p className="introduction">
            Interrogez la documentation technique disponible et vérifiez les
            passages cités dans la réponse.
          </p>
        </header>

        <form className="question-form" onSubmit={handleSubmit}>
          <label htmlFor="question">Votre question technique</label>
          <textarea
            id="question"
            name="question"
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            placeholder="Ex. Quelle est la température maximale de fonctionnement du connecteur ?"
            rows={5}
            maxLength={1000}
            disabled={isLoading}
          />
          <div className="form-footer">
            <span>{question.length}/1000</span>
            <button type="submit" disabled={isLoading || !question.trim()}>
              {isLoading ? 'Recherche en cours…' : 'Poser la question'}
            </button>
          </div>
        </form>

        <div className="status-region" aria-live="polite">
          {isLoading && <p className="loading-message">Analyse des documents…</p>}
          {errorMessage && <p className="error-message">{errorMessage}</p>}
        </div>

        {result && (
          <section className="result-panel" aria-labelledby="answer-title">
            <div className="answer-section">
              <p className="section-label">Réponse</p>
              <h2 id="answer-title">Résultat de la recherche</h2>
              <p className="answer-text">{result.answer}</p>
            </div>

            <div className="citations-section">
              <h3>Citations validées</h3>
              {result.citations.length > 0 ? (
                <ul className="citation-list">
                  {result.citations.map((citation) => (
                    <li key={citation.id}>
                      <span className="citation-id">{citation.id}</span>
                      <span className="citation-source">{citation.source}</span>
                      <span className="citation-page">
                        Page {citation.page_label} · index PDF {citation.page}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="empty-citations">
                  Aucune citation validée n'a été retournée pour cette réponse.
                </p>
              )}
            </div>
          </section>
        )}
      </section>
    </main>
  )
}

const rootElement = document.getElementById('root')

if (!rootElement) {
  throw new Error('Root element not found')
}

createRoot(rootElement).render(<App />)
