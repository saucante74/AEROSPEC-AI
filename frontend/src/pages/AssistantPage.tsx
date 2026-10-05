import { useCallback, useEffect, useRef, useState } from 'react'
import type { SubmitEvent } from 'react'

import {
  ApiError,
  askQuestion,
  convertUnit,
  supportedUnits,
} from '../api/client'
import type { AskResponse, ConvertResponse, Unit } from '../api/client'
import { CANONICAL_ABSTENTION_MESSAGE, content } from '../content'

const compatibleTargets: Record<Unit, readonly Unit[]> = {
  mm: ['inch'],
  inch: ['mm'],
  N: ['lbf'],
  lbf: ['N'],
  '°C': ['°F'],
  '°F': ['°C'],
}

function isUnit(value: string): value is Unit {
  return value in compatibleTargets
}

interface AssistantPageProps {
  accessToken: string | null
  onAuthenticationRequired: () => void
  onQuestionSucceeded: () => void
}

export default function AssistantPage({
  accessToken,
  onAuthenticationRequired,
  onQuestionSucceeded,
}: AssistantPageProps) {
  const t = content
  const [question, setQuestion] = useState('')
  const [result, setResult] = useState<AskResponse | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const requestPending = useRef(false)
  const requestStartedAt = useRef(0)
  const pendingQuestion = useRef<string | null>(null)
  const [errorType, setErrorType] = useState<
    'emptyQuestion' | 'api' | 'quota' | 'rateLimit' | null
  >(null)
  const [conversionValue, setConversionValue] = useState('')
  const [fromUnit, setFromUnit] = useState<Unit>('mm')
  const [toUnit, setToUnit] = useState<Unit>('inch')
  const [conversionResult, setConversionResult] =
    useState<ConvertResponse | null>(null)
  const [isConverting, setIsConverting] = useState(false)
  const [conversionError, setConversionError] = useState<
    'emptyValue' | 'invalidValue' | 'apiError' | null
  >(null)
  const isAbstention = result?.answer === CANONICAL_ABSTENTION_MESSAGE

  useEffect(() => {
    if (!isLoading) {
      return
    }

    const timer = window.setInterval(() => {
      setElapsedSeconds(
        Math.floor((Date.now() - requestStartedAt.current) / 1000),
      )
    }, 1000)

    return () => window.clearInterval(timer)
  }, [isLoading])

  const submitQuestion = useCallback(async (
    submittedQuestion: string,
    token: string,
  ) => {
    if (requestPending.current) {
      return
    }

    requestPending.current = true
    requestStartedAt.current = Date.now()
    setIsLoading(true)
    setElapsedSeconds(0)
    setErrorType(null)
    setResult(null)

    try {
      setResult(await askQuestion(submittedQuestion, token))
      onQuestionSucceeded()
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        pendingQuestion.current = submittedQuestion
        onAuthenticationRequired()
      } else if (
        error instanceof ApiError &&
        error.code === 'demo_quota_exhausted'
      ) {
        setErrorType('quota')
      } else if (error instanceof ApiError && error.status === 429) {
        setErrorType('rateLimit')
      } else {
        setErrorType('api')
      }
    } finally {
      requestPending.current = false
      setIsLoading(false)
      setElapsedSeconds(0)
    }
  }, [onAuthenticationRequired, onQuestionSucceeded])

  useEffect(() => {
    if (!accessToken || pendingQuestion.current === null) {
      return
    }

    const questionToSubmit = pendingQuestion.current
    pendingQuestion.current = null
    void submitQuestion(questionToSubmit, accessToken)
  }, [accessToken, submitQuestion])

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()

    const trimmedQuestion = question.trim()

    if (!trimmedQuestion) {
      setErrorType('emptyQuestion')
      return
    }

    if (!accessToken) {
      pendingQuestion.current = trimmedQuestion
      setErrorType(null)
      onAuthenticationRequired()
      return
    }

    await submitQuestion(trimmedQuestion, accessToken)
  }

  function selectExample(example: string) {
    setQuestion(example)
    setErrorType(null)
  }

  function updateConversionValue(value: string) {
    setConversionValue(value)
    setConversionError(null)
    setConversionResult(null)
  }

  function updateFromUnit(value: string) {
    if (!isUnit(value)) {
      return
    }

    setFromUnit(value)
    setToUnit(compatibleTargets[value][0])
    setConversionError(null)
    setConversionResult(null)
  }

  function updateToUnit(value: string) {
    if (isUnit(value) && compatibleTargets[fromUnit].includes(value)) {
      setToUnit(value)
      setConversionError(null)
      setConversionResult(null)
    }
  }

  async function handleConversion(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    const normalizedValue = conversionValue.trim()

    if (!normalizedValue) {
      setConversionError('emptyValue')
      return
    }

    const numericValue = Number(normalizedValue)
    if (!Number.isFinite(numericValue)) {
      setConversionError('invalidValue')
      return
    }

    setIsConverting(true)
    setConversionError(null)
    setConversionResult(null)

    try {
      setConversionResult(
        await convertUnit({
          value: numericValue,
          from_unit: fromUnit,
          to_unit: toUnit,
        }),
      )
    } catch {
      setConversionError('apiError')
    } finally {
      setIsConverting(false)
    }
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
                  <span className="loading-spinner" aria-hidden="true" />
                  <span className="loading-copy">
                    <span>
                      {t.search.loading} {elapsedSeconds} {t.search.seconds}
                    </span>
                    <span className="loading-helper">
                      {t.search.initializing}
                    </span>
                  </span>
                </p>
              )}
              {errorType && (
                <p className="error-message" role="alert">
                  {t.errors[errorType]}
                </p>
              )}
            </div>
          )}

          {result && (
            <section className="result-panel" aria-labelledby="answer-title">
              <div
                className={`answer-section${isAbstention ? ' answer-section-abstention' : ''}`}
              >
                <div className="result-heading">
                  <div>
                    <p
                      className={`section-label ${isAbstention ? 'warning-label' : 'success-label'}`}
                    >
                      {t.results.eyebrow}
                    </p>
                    <h2 id="answer-title">{t.results.title}</h2>
                  </div>
                  <span
                    className={`result-status${isAbstention ? ' result-status-warning' : ''}`}
                  >
                    <svg
                      className="result-status-icon"
                      viewBox="0 0 20 20"
                      aria-hidden="true"
                    >
                      {isAbstention ? (
                        <>
                          <path d="M10 2.5 18 17H2L10 2.5Z" />
                          <path d="M10 7v4.5M10 14.5v.1" />
                        </>
                      ) : (
                        <>
                          <circle cx="10" cy="10" r="8" />
                          <path d="m6.5 10 2.2 2.2 4.8-4.8" />
                        </>
                      )}
                    </svg>
                    {isAbstention
                      ? t.results.insufficientEvidence
                      : t.results.answerFound}
                  </span>
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
            {t.examples.questions.map((example, index) => (
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
                <span className="example-copy">
                  <span>{example}</span>
                  {index === 1 && (
                    <span
                      className="example-badge"
                      title={t.examples.abstentionDescription}
                    >
                      {t.examples.abstentionLabel}
                    </span>
                  )}
                </span>
                <span className="example-arrow" aria-hidden="true">
                  →
                </span>
              </button>
            ))}
          </div>
        </section>

        <section className="engineering-tools" aria-labelledby="conversion-title">
          <div className="tools-heading">
            <p className="section-label">{t.tools.eyebrow}</p>
            <h2 id="conversion-title">{t.tools.title}</h2>
            <p>{t.tools.description}</p>
          </div>

          <form
            className="converter-form"
            onSubmit={handleConversion}
            aria-busy={isConverting}
          >
            <div className="converter-field converter-value-field">
              <label htmlFor="conversion-value">{t.tools.value}</label>
              <input
                id="conversion-value"
                name="conversion-value"
                type="number"
                step="any"
                inputMode="decimal"
                value={conversionValue}
                onChange={(event) => updateConversionValue(event.target.value)}
                disabled={isConverting}
              />
            </div>

            <div className="converter-field">
              <label htmlFor="conversion-from">{t.tools.from}</label>
              <select
                id="conversion-from"
                name="conversion-from"
                value={fromUnit}
                onChange={(event) => updateFromUnit(event.target.value)}
                disabled={isConverting}
              >
                {supportedUnits.map((unit) => (
                  <option value={unit} key={unit}>
                    {unit}
                  </option>
                ))}
              </select>
            </div>

            <span className="conversion-direction" aria-hidden="true">
              →
            </span>

            <div className="converter-field">
              <label htmlFor="conversion-to">{t.tools.to}</label>
              <select
                id="conversion-to"
                name="conversion-to"
                value={toUnit}
                onChange={(event) => updateToUnit(event.target.value)}
                disabled={isConverting}
              >
                {compatibleTargets[fromUnit].map((unit) => (
                  <option value={unit} key={unit}>
                    {unit}
                  </option>
                ))}
              </select>
            </div>

            <button type="submit" disabled={isConverting}>
              {isConverting ? t.tools.converting : t.tools.convert}
            </button>
          </form>

          {conversionError && (
            <p className="converter-error" role="alert">
              {t.tools[conversionError]}
            </p>
          )}

          {conversionResult && (
            <output
              className="converter-result"
              role="status"
              aria-label={t.tools.result}
            >
              <span>{conversionResult.value}</span>
              <span>{conversionResult.from_unit}</span>
              <span aria-hidden="true">→</span>
              <strong>{conversionResult.converted_value}</strong>
              <span>{conversionResult.to_unit}</span>
            </output>
          )}
        </section>

      </div>
    </main>
  )
}
