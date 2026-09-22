import { useState } from 'react'
import type { FormEvent } from 'react'
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
            Interrogez la documentation technique disponible et retrouvez les
            références utilisées dans la réponse.
          </p>
          <p className="scope-note">Documentation fournisseur · Réponses traçables</p>
        </header>

        <form
          className="question-form"
          onSubmit={handleSubmit}
          aria-busy={isLoading}
        >
          <div className="form-heading">
            <div>
              <p className="section-label">Recherche documentaire</p>
              <h2>Poser une question</h2>
            </div>
            <span className="step-marker" aria-hidden="true">
              01
            </span>
          </div>

          <label htmlFor="question">Question technique</label>
          <textarea
            id="question"
            name="question"
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            placeholder="Ex. Quelle est la température maximale de fonctionnement du connecteur ?"
            rows={5}
            maxLength={1000}
            disabled={isLoading}
            aria-describedby="question-help question-count"
          />
          <p id="question-help" className="field-hint">
            Entrée ajoute une nouvelle ligne. Utilisez le bouton pour envoyer la
            question.
          </p>
          <div className="form-footer">
            <span id="question-count" className="character-count">
              {question.length}/1000 caractères
            </span>
            <button type="submit" disabled={isLoading || !question.trim()}>
              {isLoading ? 'Recherche en cours…' : 'Poser la question'}
            </button>
          </div>
        </form>

        {(isLoading || errorMessage) && (
          <div className="status-region" aria-live="polite">
            {isLoading && (
              <p className="loading-message" role="status">
                Recherche des passages et préparation de la réponse…
              </p>
            )}
            {errorMessage && (
              <p className="error-message" role="alert">
                {errorMessage}
              </p>
            )}
          </div>
        )}

        {result && (
          <section className="result-panel" aria-labelledby="answer-title">
            <div className="answer-section">
              <div className="result-heading">
                <div>
                  <p className="section-label">Réponse documentaire</p>
                  <h2 id="answer-title">Résultat de la recherche</h2>
                </div>
                <span className="step-marker step-marker-complete" aria-hidden="true">
                  02
                </span>
              </div>
              <div className="answered-question">
                <span>Question analysée</span>
                <p>{result.question}</p>
              </div>
              <p className="answer-text">{result.answer}</p>
            </div>

            <div className="citations-section">
              <h3>Citations validées</h3>
              <p className="citations-introduction">
                Références explicitement citées et résolues par l'API.
              </p>
              {result.citations.length > 0 ? (
                <ul className="citation-list">
                  {result.citations.map((citation) => (
                    <li className="citation-card" key={citation.id}>
                      <div className="citation-heading">
                        <span className="citation-id">{citation.id}</span>
                        <span className="citation-status">Citation résolue</span>
                      </div>
                      <dl className="citation-details">
                        <div className="citation-document">
                          <dt>Document</dt>
                          <dd title={citation.source}>{citation.source}</dd>
                        </div>
                        <div>
                          <dt>Page</dt>
                          <dd>{citation.page_label}</dd>
                        </div>
                        <div className="citation-secondary">
                          <dt>Index PDF</dt>
                          <dd>{citation.page}</dd>
                        </div>
                      </dl>
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
