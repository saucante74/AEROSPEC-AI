import { useState } from 'react'
import type { SubmitEvent } from 'react'

import { askQuestion } from '../api/client'
import type { AskResponse } from '../api/client'
import { useI18n } from '../i18n/useI18n'

export default function AssistantPage() {
  const { t } = useI18n()
  const [question, setQuestion] = useState('')
  const [result, setResult] = useState<AskResponse | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [errorType, setErrorType] = useState<'emptyQuestion' | 'api' | null>(null)

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    const trimmedQuestion = question.trim()

    if (!trimmedQuestion) {
      setErrorType('emptyQuestion')
      return
    }

    setIsLoading(true)
    setErrorType(null)
    setResult(null)

    try {
      setResult(await askQuestion(trimmedQuestion))
    } catch {
      setErrorType('api')
    } finally {
      setIsLoading(false)
    }
  }

  function selectExample(example: string) {
    setQuestion(example)
    setErrorType(null)
  }

  return (
    <main>
      <section className="hero content-width" aria-labelledby="page-title">
        <div className="hero-copy">
          <p className="eyebrow">{t.hero.eyebrow}</p>
          <h1 id="page-title">{t.hero.title}</h1>
          <p className="hero-introduction">{t.hero.description}</p>
        </div>
        <ul className="benefit-list" aria-label={t.hero.capabilitiesLabel}>
          {t.hero.benefits.map((benefit) => (
            <li key={benefit}>{benefit}</li>
          ))}
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
                <p className="section-label">{t.search.eyebrow}</p>
                <h2 id="question-title">{t.search.title}</h2>
              </div>
              <p className="precision-note">{t.search.precision}</p>
            </div>

            <label htmlFor="question">{t.search.label}</label>
            <textarea
              id="question"
              name="question"
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              placeholder={t.search.placeholder}
              rows={5}
              maxLength={1000}
              disabled={isLoading}
              aria-describedby="question-help question-count"
            />
            <div className="form-footer">
              <p id="question-help" className="field-hint">
                {t.search.hint}
              </p>
              <div className="form-actions">
                <span id="question-count" className="character-count">
                  {question.length}/1000
                </span>
                <button type="submit" disabled={isLoading || !question.trim()}>
                  {isLoading ? t.search.searching : t.search.submit}
                </button>
              </div>
            </div>
          </form>

          {(isLoading || errorType) && (
            <div className="status-region" aria-live="polite">
              {isLoading && (
                <p className="loading-message" role="status">
                  {t.search.loading}
                </p>
              )}
              {errorType && (
                <p className="error-message" role="alert">
                  {t.errors[errorType]}
                </p>
              )}
            </div>
          )}
        </section>

        <section className="examples-section" id="examples" aria-labelledby="examples-title">
          <div className="section-heading-row">
            <div>
              <p className="section-label">{t.examples.eyebrow}</p>
              <h2 id="examples-title">{t.examples.title}</h2>
            </div>
            <p>{t.examples.instruction}</p>
          </div>
          <div className="example-grid">
            {t.examples.questions.map((example) => (
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
                  <p className="section-label success-label">{t.results.eyebrow}</p>
                  <h2 id="answer-title">{t.results.title}</h2>
                </div>
                <span className="result-status">{t.results.status}</span>
              </div>
              <div className="answered-question">
                <span>{t.results.questionAsked}</span>
                <p>{result.question}</p>
              </div>
              <p className="answer-text">{result.answer}</p>
            </div>

            <div className="citations-section">
              <div className="citations-heading">
                <div>
                  <p className="section-label">{t.citations.eyebrow}</p>
                  <h3>{t.citations.title} ({result.citations.length})</h3>
                </div>
                <p>{t.citations.description}</p>
              </div>
              {result.citations.length > 0 ? (
                <ul className="citation-list">
                  {result.citations.map((citation) => (
                    <li className="citation-card" key={citation.id}>
                      <span className="citation-id">{citation.id}</span>
                      <div className="citation-content">
                        <strong title={citation.source}>{citation.source}</strong>
                        <div className="citation-location">
                          <span>{t.citations.page} {citation.page_label}</span>
                          <span>{t.citations.pdfIndex} {citation.page}</span>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="empty-citations">
                  {t.citations.empty}
                </p>
              )}
            </div>
          </section>
        )}
      </div>
    </main>
  )
}
