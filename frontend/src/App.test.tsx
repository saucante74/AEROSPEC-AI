import '@testing-library/jest-dom/vitest'

import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import App from './App'
import { askQuestion, convertUnit } from './api/client'
import type { AskResponse, ConvertResponse } from './api/client'
import evaluationSummary from './data/evaluation-summary.json'

vi.mock('./api/client', () => ({
  askQuestion: vi.fn(),
  convertUnit: vi.fn(),
  supportedUnits: ['mm', 'inch', 'N', 'lbf', '°C', '°F'],
}))

const mockedAskQuestion = vi.mocked(askQuestion)
const mockedConvertUnit = vi.mocked(convertUnit)

function renderApp() {
  return render(<App />)
}

function submitQuestion(question: string) {
  fireEvent.change(screen.getByRole('textbox', { name: 'Technical question' }), {
    target: { value: question },
  })
  fireEvent.click(screen.getByRole('button', { name: 'Ask' }))
}

function formatEnglishPercentage(rate: number | null) {
  if (rate === null) {
    return 'Not applicable'
  }

  return new Intl.NumberFormat('en-US', {
    style: 'percent',
    maximumFractionDigits: 1,
  }).format(rate)
}

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
  vi.useRealTimers()
})

describe('App', () => {
  it("affiche l'état initial", () => {
    renderApp()

    const navigation = screen.getByRole('navigation', {
      name: 'Primary navigation',
    })

    expect(
      screen.getByRole('heading', {
        name: 'Ask. Find. Engineer with confidence.',
      }),
    ).toBeVisible()
    expect(
      screen.getByRole('textbox', { name: 'Technical question' }),
    ).toHaveValue('')
    expect(screen.getByRole('button', { name: 'Ask' })).toBeDisabled()
    expect(
      screen.getByRole('heading', { name: 'Unit conversion' }),
    ).toBeVisible()
    expect(screen.queryByRole('region', { name: 'Result' })).not.toBeInTheDocument()
    expect(screen.queryByRole('group', { name: /language/i })).not.toBeInTheDocument()
    expect(
      within(navigation).getByRole('button', { name: 'Assistant' }),
    ).toHaveAttribute('aria-pressed', 'true')
    expect(
      within(navigation).getByRole('button', { name: 'Evaluation' }),
    ).toHaveAttribute('aria-pressed', 'false')
    expect(
      within(navigation).getByRole('button', { name: 'Documents' }),
    ).toHaveAttribute('aria-pressed', 'false')
    expect(within(navigation).getByRole('button', { name: 'Help' })).toHaveAttribute(
      'aria-pressed',
      'false',
    )
    expect(within(navigation).queryByText('Examples')).not.toBeInTheDocument()
    expect(within(navigation).queryByText('About')).not.toBeInTheDocument()
  })

  it('affiche la vue Evaluation et les métriques de l’artefact réel', () => {
    renderApp()

    fireEvent.click(screen.getByRole('button', { name: 'Evaluation' }))

    expect(
      screen.getByRole('heading', { name: 'RAG Evaluation' }),
    ).toBeVisible()
    expect(
      screen.queryByRole('heading', {
        name: 'Ask. Find. Engineer with confidence.',
      }),
    ).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Evaluation' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )

    const sourceHitAtOne = evaluationSummary.metrics.retrieval.source_hit_at_1
    const evidenceHitAtThree =
      evaluationSummary.metrics.retrieval.evidence_hit_at_3
    const sourceCard = screen.getByRole('article', { name: 'Source Hit@1' })
    const evidenceCards = screen.getAllByRole('article', {
      name: 'Evidence Hit@3',
    })

    expect(sourceCard).toHaveTextContent(
      `${sourceHitAtOne.numerator} / ${sourceHitAtOne.denominator}`,
    )
    expect(sourceCard).toHaveTextContent(
      formatEnglishPercentage(sourceHitAtOne.rate),
    )
    expect(evidenceCards[0]).toHaveTextContent(
      `${evidenceHitAtThree.numerator} / ${evidenceHitAtThree.denominator}`,
    )
    expect(evidenceCards[0]).toHaveTextContent(
      formatEnglishPercentage(evidenceHitAtThree.rate),
    )
    expect(
      screen.getByText(
        /Results measured on a small manually curated benchmark\./,
      ),
    ).toBeVisible()
  })

  it('navigue vers Help puis revient sur Assistant', () => {
    renderApp()

    fireEvent.click(screen.getByRole('button', { name: 'Help' }))

    expect(
      screen.getByRole('heading', { name: 'How AeroSpec AI works' }),
    ).toBeVisible()
    expect(
      screen.queryByRole('heading', {
        name: 'Ask. Find. Engineer with confidence.',
      }),
    ).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Help' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )

    fireEvent.click(screen.getByRole('button', { name: 'Assistant' }))

    expect(
      screen.getByRole('heading', {
        name: 'Ask. Find. Engineer with confidence.',
      }),
    ).toBeVisible()
    expect(
      screen.queryByRole('heading', { name: 'How AeroSpec AI works' }),
    ).not.toBeInTheDocument()
  })

  it('affiche les cinq documents du corpus avec des liens vers les PDF', () => {
    renderApp()

    fireEvent.click(screen.getByRole('button', { name: 'Documents' }))

    expect(
      screen.getByRole('heading', { name: 'Technical documents' }),
    ).toBeVisible()
    const documentLinks = screen.getAllByRole('link', {
      name: /Open PDF document:/,
    })
    expect(documentLinks).toHaveLength(5)
    expect(documentLinks[0]).toHaveAttribute(
      'href',
      '/AMPHENOL_connector_datasheet.pdf',
    )
    expect(documentLinks[0]).toHaveAttribute('target', '_blank')
    expect(documentLinks[0]).toHaveAttribute('rel', 'noopener noreferrer')
  })

  it("préremplit un exemple sans l'envoyer", () => {
    const example =
      'What helium leak rate is specified for the hermetic MIL-DTL-38999 connectors?'
    renderApp()

    fireEvent.click(screen.getByRole('button', { name: example }))

    expect(
      screen.getByRole('textbox', { name: 'Technical question' }),
    ).toHaveValue(example)
    expect(mockedAskQuestion).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: 'Ask' })).toBeEnabled()
  })

  it('soumet une question, affiche le chargement, la réponse et ses citations', async () => {
    const question = 'Quelle est la température maximale ?'
    const response: AskResponse = {
      question,
      answer: 'La température maximale est 120 °C.',
      sources: [{ source: 'connecteur.pdf', page: 11, page_label: '12' }],
      citations: [
        {
          id: '[S1]',
          source: 'connecteur.pdf',
          page: 11,
          page_label: '12',
        },
      ],
    }
    let resolveRequest: (value: AskResponse) => void = () => undefined
    mockedAskQuestion.mockReturnValue(
      new Promise((resolve) => {
        resolveRequest = resolve
      }),
    )
    renderApp()

    submitQuestion(`  ${question}  `)

    expect(mockedAskQuestion).toHaveBeenCalledWith(question)
    expect(screen.getByRole('status')).toHaveTextContent(
      'Searching technical documentation… 0 s elapsed',
    )
    expect(
      screen.getByRole('textbox', { name: 'Technical question' }),
    ).toBeDisabled()

    await act(async () => resolveRequest(response))

    expect(await screen.findByText(response.answer)).toBeVisible()
    expect(
      within(
        screen.getByRole('region', { name: 'Result' }),
      ).getByText(response.question),
    ).toBeVisible()
    expect(
      screen.getByRole('textbox', { name: 'Technical question' }),
    ).toHaveValue(`  ${question}  `)
    expect(screen.getByText('[S1]')).toBeVisible()
    expect(screen.getByText('connecteur.pdf')).toBeVisible()
    expect(screen.getByText('Page 12')).toBeVisible()
    expect(screen.getByText('PDF index 11')).toBeVisible()
    expect(screen.getByText('Validated citations (1)')).toBeVisible()

    const resultRegion = screen.getByRole('region', { name: 'Result' })
    const examplesHeading = screen.getByRole('heading', {
      name: 'Example questions',
    })
    expect(
      resultRegion.compareDocumentPosition(examplesHeading) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy()
  })

  it('affiche le temps écoulé et ignore les soumissions pendant la requête', async () => {
    vi.useFakeTimers()
    mockedAskQuestion.mockReturnValue(new Promise(() => undefined))
    renderApp()

    submitQuestion('Combien de temps faut-il chercher ?')
    const questionForm = screen
      .getByRole('textbox', { name: 'Technical question' })
      .closest('form')

    expect(questionForm).not.toBeNull()
    fireEvent.submit(questionForm!)
    expect(mockedAskQuestion).toHaveBeenCalledOnce()

    act(() => vi.advanceTimersByTime(3100))

    expect(screen.getByRole('status')).toHaveTextContent(
      'Searching technical documentation… 3 s elapsed',
    )
  })

  it('affiche explicitement une réponse sans citation', async () => {
    mockedAskQuestion.mockResolvedValue({
      question: 'Question sans source',
      answer: 'Réponse disponible sans citation validée.',
      sources: [],
      citations: [],
    })
    renderApp()

    submitQuestion('Question sans source')

    expect(
      await screen.findByText(
        'No validated citations were returned for this answer.',
      ),
    ).toBeVisible()
  })

  it("affiche une erreur lorsque l'API échoue", async () => {
    mockedAskQuestion.mockRejectedValue(new Error('API unavailable'))
    renderApp()

    submitQuestion('Pourquoi la requête échoue-t-elle ?')

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'The answer could not be retrieved. Check that the API is available and try again.',
    )
  })

  it('convertit une valeur avec les unités sélectionnées et affiche le résultat API', async () => {
    const response: ConvertResponse = {
      value: 100,
      from_unit: 'N',
      to_unit: 'lbf',
      converted_value: 22.480894309971,
    }
    mockedConvertUnit.mockResolvedValue(response)
    renderApp()

    fireEvent.change(screen.getByRole('spinbutton', { name: 'Value' }), {
      target: { value: '100' },
    })
    fireEvent.change(screen.getByRole('combobox', { name: 'From' }), {
      target: { value: 'N' },
    })
    fireEvent.change(screen.getByRole('combobox', { name: 'To' }), {
      target: { value: 'lbf' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Convert' }))

    expect(mockedConvertUnit).toHaveBeenCalledWith({
      value: 100,
      from_unit: 'N',
      to_unit: 'lbf',
    })
    expect(
      await screen.findByRole('status', { name: 'Conversion result' }),
    ).toHaveTextContent('100N→22.480894309971lbf')
  })

  it('affiche une erreur de conversion sans appel réseau réel', async () => {
    mockedConvertUnit.mockRejectedValue(new Error('API unavailable'))
    renderApp()

    fireEvent.change(screen.getByRole('spinbutton', { name: 'Value' }), {
      target: { value: '25' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Convert' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'The conversion could not be completed. Try again.',
    )
  })

  it('adapte la destination lorsque la famille de l’unité source change', () => {
    renderApp()

    fireEvent.change(screen.getByRole('combobox', { name: 'From' }), {
      target: { value: '°C' },
    })

    const targetUnit = screen.getByRole('combobox', { name: 'To' })
    expect(targetUnit).toHaveValue('°F')
    expect(
      within(targetUnit).getByRole('option', { name: '°F' }),
    ).toBeVisible()
    expect(
      within(targetUnit).queryByRole('option', { name: 'inch' }),
    ).not.toBeInTheDocument()
  })
})
