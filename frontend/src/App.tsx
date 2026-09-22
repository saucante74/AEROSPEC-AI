import { useState } from 'react'
import type { SubmitEvent } from 'react'

import { askQuestion } from './api'
import type { AskResponse } from './api'

const questionExamples = [
  'What helium leak rate is specified for the hermetic MIL-DTL-38999 connectors?',
  'What sealing material is specified for the Douglas hermetic MIL-DTL-38999 connectors?',
  'What is the maximum operating temperature of the Molex .093 Series 03-09 nylon connectors?',
]

export default function App() {
  const [question, setQuestion] = useState('')
  const [result, setResult] = useState<AskResponse | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    const trimmedQuestion = question.trim()

    if (!trimmedQuestion) {
      setErrorMessage('Enter a question before searching the documentation.')
      return
    }

    setIsLoading(true)
    setErrorMessage(null)
    setResult(null)

    try {
      setResult(await askQuestion(trimmedQuestion))
    } catch {
      setErrorMessage(
        'The answer could not be retrieved. Check that the API is available and try again.',
      )
    } finally {
      setIsLoading(false)
    }
  }

  function selectExample(example: string) {
    setQuestion(example)
    setErrorMessage(null)
  }

  return (
    <div className="app-shell" id="top">
      <header className="site-header">
        <nav className="navigation content-width" aria-label="Primary navigation">
          <a className="brand" href="#top" aria-label="AeroSpec AI home">
            <span className="brand-mark" aria-hidden="true" />
            <span className="brand-copy">
              <strong>AeroSpec AI</strong>
              <span>Technical Documentation Assistant</span>
            </span>
          </a>
          <div className="navigation-links">
            <a href="#assistant">Assistant</a>
            <a href="#examples">Examples</a>
            <a href="#about">About</a>
          </div>
        </nav>
      </header>

      <main>
        <section className="hero content-width" aria-labelledby="page-title">
          <div className="hero-copy">
            <p className="eyebrow">Technical document intelligence</p>
            <h1 id="page-title">Ask. Find. Engineer with confidence.</h1>
            <p className="hero-introduction">
              Search technical documentation and receive focused answers backed
              by citations validated against the source material.
            </p>
          </div>
          <ul className="benefit-list" aria-label="Assistant capabilities">
            <li>Semantic document search</li>
            <li>Validated citations</li>
            <li>Grounded answers</li>
            <li>Engineering-focused</li>
          </ul>
        </section>

        <div className="product-workspace content-width">
          <section
            className="question-section"
            id="assistant"
            aria-labelledby="question-title"
          >
            <form
              className="question-form"
              onSubmit={handleSubmit}
              aria-busy={isLoading}
            >
              <div className="form-heading">
                <div>
                  <p className="section-label">Document query</p>
                  <h2 id="question-title">Ask a technical question</h2>
                </div>
                <p className="precision-note">Use precise engineering terminology</p>
              </div>

              <label htmlFor="question">Technical question</label>
              <textarea
                id="question"
                name="question"
                value={question}
                onChange={(event) => setQuestion(event.target.value)}
                placeholder="e.g. What helium leak rate is specified for the MIL-DTL-38999 connector?"
                rows={5}
                maxLength={1000}
                disabled={isLoading}
                aria-describedby="question-help question-count"
              />
              <div className="form-footer">
                <p id="question-help" className="field-hint">
                  Enter adds a new line. Use the Ask button to submit.
                </p>
                <div className="form-actions">
                  <span id="question-count" className="character-count">
                    {question.length}/1000
                  </span>
                  <button type="submit" disabled={isLoading || !question.trim()}>
                    {isLoading ? 'Searching…' : 'Ask'}
                  </button>
                </div>
              </div>
            </form>

            {(isLoading || errorMessage) && (
              <div className="status-region" aria-live="polite">
                {isLoading && (
                  <p className="loading-message" role="status">
                    Searching documents and preparing an answer…
                  </p>
                )}
                {errorMessage && (
                  <p className="error-message" role="alert">
                    {errorMessage}
                  </p>
                )}
              </div>
            )}
          </section>

          <section className="examples-section" id="examples" aria-labelledby="examples-title">
            <div className="section-heading-row">
              <div>
                <p className="section-label">Explore the corpus</p>
                <h2 id="examples-title">Example questions</h2>
              </div>
              <p>Select an example to edit it before asking.</p>
            </div>
            <div className="example-grid">
              {questionExamples.map((example) => (
                <button
                  className="example-card"
                  type="button"
                  key={example}
                  onClick={() => selectExample(example)}
                  disabled={isLoading}
                >
                  <span className="example-symbol" aria-hidden="true">
                    ?
                  </span>
                  <span>{example}</span>
                  <span className="example-arrow" aria-hidden="true">
                    →
                  </span>
                </button>
              ))}
            </div>
          </section>

          {result && (
            <section className="result-panel" aria-labelledby="answer-title">
              <div className="answer-section">
                <div className="result-heading">
                  <div>
                    <p className="section-label success-label">Document answer</p>
                    <h2 id="answer-title">Result</h2>
                  </div>
                  <span className="result-status">Sources checked</span>
                </div>
                <div className="answered-question">
                  <span>Question asked</span>
                  <p>{result.question}</p>
                </div>
                <p className="answer-text">{result.answer}</p>
              </div>

              <div className="citations-section">
                <div className="citations-heading">
                  <div>
                    <p className="section-label">Traceability</p>
                    <h3>Validated citations ({result.citations.length})</h3>
                  </div>
                  <p>References resolved by the API against source documents.</p>
                </div>
                {result.citations.length > 0 ? (
                  <ul className="citation-list">
                    {result.citations.map((citation) => (
                      <li className="citation-card" key={citation.id}>
                        <span className="citation-id">{citation.id}</span>
                        <div className="citation-content">
                          <strong title={citation.source}>{citation.source}</strong>
                          <div className="citation-location">
                            <span>Page {citation.page_label}</span>
                            <span>PDF index {citation.page}</span>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="empty-citations">
                    No validated citations were returned for this answer.
                  </p>
                )}
              </div>
            </section>
          )}
        </div>
      </main>

      <footer className="site-footer" id="about">
        <div className="footer-content content-width">
          <div>
            <strong>AeroSpec AI</strong>
            <p>Technical documentation assistant</p>
          </div>
          <p className="footer-capabilities">
            Grounded answers <span aria-hidden="true">·</span> Validated citations{' '}
            <span aria-hidden="true">·</span> Deterministic tools
          </p>
        </div>
      </footer>
    </div>
  )
}
