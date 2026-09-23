import { useEffect, useRef, useState } from 'react'
import type { SubmitEvent } from 'react'

import { askQuestion, convertUnit, supportedUnits } from '../api/client'
import type { AskResponse, ConvertResponse, Unit } from '../api/client'
import { content } from '../content'

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

export default function AssistantPage() {
  const t = content
  const [question, setQuestion] = useState('')
  const [result, setResult] = useState<AskResponse | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const requestPending = useRef(false)
  const requestStartedAt = useRef(0)
  const [errorType, setErrorType] = useState<'emptyQuestion' | 'api' | null>(null)
  const [conversionValue, setConversionValue] = useState('')
  const [fromUnit, setFromUnit] = useState<Unit>('mm')
  const [toUnit, setToUnit] = useState<Unit>('inch')
  const [conversionResult, setConversionResult] =
    useState<ConvertResponse | null>(null)
  const [isConverting, setIsConverting] = useState(false)
  const [conversionError, setConversionError] = useState<
    'emptyValue' | 'invalidValue' | 'apiError' | null
  >(null)

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

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()

    if (requestPending.current) {
      return
    }

    const trimmedQuestion = question.trim()

    if (!trimmedQuestion) {
      setErrorType('emptyQuestion')
      return
    }

    requestPending.current = true
    requestStartedAt.current = Date.now()
    setIsLoading(true)
    setElapsedSeconds(0)
    setErrorType(null)
    setResult(null)

    try {
      setResult(await askQuestion(trimmedQuestion))
    } catch {
      setErrorType('api')
    } finally {
      requestPending.current = false
      setIsLoading(false)
      setElapsedSeconds(0)
    }
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
                  <span>
                    {t.search.loading} {elapsedSeconds} {t.search.seconds}
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
