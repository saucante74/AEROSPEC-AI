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
import {
  ApiError,
  askQuestion,
  convertUnit,
  getUsageStatus,
  login,
} from './api/client'
import type { AskResponse, ConvertResponse, UsageStatus } from './api/client'
import evaluationSummary from './data/evaluation-summary.json'

vi.mock('./api/client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./api/client')>()
  return {
    ...actual,
    askQuestion: vi.fn(),
    convertUnit: vi.fn(),
    getUsageStatus: vi.fn(),
    login: vi.fn(),
  }
})

const mockedAskQuestion = vi.mocked(askQuestion)
const mockedConvertUnit = vi.mocked(convertUnit)
const mockedGetUsageStatus = vi.mocked(getUsageStatus)
const mockedLogin = vi.mocked(login)

const defaultUsageStatus: UsageStatus = {
  quota_limit: 20,
  requests_used: 3,
  requests_remaining: 17,
  reset_at: '2099-01-01T00:00:00Z',
}

mockedGetUsageStatus.mockResolvedValue(defaultUsageStatus)

function renderApp(authenticated = true) {
  if (authenticated) {
    window.sessionStorage.setItem('aerospec_access_token', 'opaque-token')
  }
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
  window.sessionStorage.clear()
})

describe('App', () => {
  it('affiche l’application sans demander une authentification', () => {
    renderApp(false)

    expect(
      screen.getByRole('heading', {
        name: 'Ask. Find. Engineer with confidence.',
      }),
    ).toBeVisible()
    expect(
      screen.getByRole('textbox', { name: 'Technical question' }),
    ).toBeVisible()
    expect(
      screen.queryByRole('dialog', { name: 'Sign in to AeroSpec AI' }),
    ).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Sign in' })).toBeVisible()
    expect(screen.queryByLabelText('Demo usage status')).not.toBeInTheDocument()
    expect(screen.queryByText(/\d+ \/ 20/)).not.toBeInTheDocument()
  })

  it('ouvre la connexion depuis le contrôle de la barre de navigation', () => {
    renderApp(false)

    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }))

    expect(
      screen.getByRole('dialog', { name: 'Sign in to AeroSpec AI' }),
    ).toBeVisible()
  })

  it('ouvre la connexion au clic sur Ask sans envoyer la question', () => {
    const question = 'What is the maximum operating temperature?'
    renderApp(false)

    submitQuestion(question)

    expect(
      screen.getByRole('dialog', { name: 'Sign in to AeroSpec AI' }),
    ).toBeVisible()
    expect(mockedAskQuestion).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(
      screen.queryByRole('dialog', { name: 'Sign in to AeroSpec AI' }),
    ).not.toBeInTheDocument()
    expect(
      screen.getByRole('textbox', { name: 'Technical question' }),
    ).toHaveValue(question)
  })

  it('continue automatiquement la question après une authentification valide', async () => {
    mockedAskQuestion.mockResolvedValue({
      question: 'What is the limit?',
      answer: 'The limit is documented.',
      sources: [],
      citations: [],
    })
    mockedLogin.mockResolvedValue({
      access_token: 'new-token',
      token_type: 'bearer',
      expires_in: 14_400,
    })
    renderApp(false)

    submitQuestion('  What is the limit?  ')
    fireEvent.change(screen.getByLabelText('Username'), {
      target: { value: 'reviewer' },
    })
    fireEvent.change(screen.getByLabelText('Password'), {
      target: { value: 'password' },
    })
    fireEvent.click(
      within(
        screen.getByRole('dialog', { name: 'Sign in to AeroSpec AI' }),
      ).getByRole('button', { name: 'Sign in' }),
    )

    expect(mockedLogin).toHaveBeenCalledWith({
      username: 'reviewer',
      password: 'password',
    })
    expect(await screen.findByText('The limit is documented.')).toBeVisible()
    expect(mockedAskQuestion).toHaveBeenCalledWith(
      'What is the limit?',
      'new-token',
    )
    expect(
      screen.queryByRole('dialog', { name: 'Sign in to AeroSpec AI' }),
    ).not.toBeInTheDocument()
    expect(window.sessionStorage.getItem('aerospec_access_token')).toBe(
      'new-token',
    )
    expect(
      await screen.findByLabelText('17 of 20 requests remaining'),
    ).toBeVisible()
    expect(mockedGetUsageStatus).toHaveBeenCalledWith('new-token')
  })

  it('garde la connexion ouverte et affiche une erreur pour des identifiants invalides', async () => {
    mockedLogin.mockRejectedValue(new ApiError(401))
    renderApp(false)

    submitQuestion('What is the limit?')
    fireEvent.change(screen.getByLabelText('Username'), {
      target: { value: 'reviewer' },
    })
    fireEvent.change(screen.getByLabelText('Password'), {
      target: { value: 'wrong' },
    })
    fireEvent.click(
      within(
        screen.getByRole('dialog', { name: 'Sign in to AeroSpec AI' }),
      ).getByRole('button', { name: 'Sign in' }),
    )

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'The username or password is incorrect.',
    )
    expect(
      screen.getByRole('dialog', { name: 'Sign in to AeroSpec AI' }),
    ).toBeVisible()
    expect(mockedAskQuestion).not.toHaveBeenCalled()
  })

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

  it('actualise le quota affiché après une question réussie', async () => {
    mockedGetUsageStatus
      .mockResolvedValueOnce(defaultUsageStatus)
      .mockResolvedValueOnce({
        ...defaultUsageStatus,
        requests_used: 4,
        requests_remaining: 16,
      })
    mockedAskQuestion.mockResolvedValue({
      question: 'Count this question',
      answer: 'Counted.',
      sources: [],
      citations: [],
    })
    renderApp()

    expect(
      await screen.findByLabelText('17 of 20 requests remaining'),
    ).toBeVisible()
    submitQuestion('Count this question')

    expect(
      await screen.findByLabelText('16 of 20 requests remaining'),
    ).toBeVisible()
    expect(mockedGetUsageStatus).toHaveBeenCalledTimes(2)
  })

  it('calcule le compte à rebours depuis la date de réinitialisation du backend', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-10-05T09:18:42Z'))
    mockedGetUsageStatus.mockResolvedValueOnce({
      ...defaultUsageStatus,
      reset_at: '2026-10-05T12:00:00Z',
    })

    renderApp()
    await act(async () => vi.advanceTimersByTimeAsync(0))
    act(() => vi.advanceTimersByTime(1))

    expect(screen.getByText('Reset 02:41:18')).toBeVisible()

    act(() => vi.advanceTimersByTime(1000))

    expect(screen.getByText('Reset 02:41:17')).toBeVisible()
  })

  it('annule la déconnexion sans modifier la session ni le quota', async () => {
    renderApp()

    expect(
      await screen.findByLabelText('17 of 20 requests remaining'),
    ).toBeVisible()
    fireEvent.click(screen.getByRole('button', { name: 'Log out' }))

    const dialog = screen.getByRole('dialog', { name: 'Log out?' })
    expect(dialog).toBeVisible()
    expect(window.sessionStorage.getItem('aerospec_access_token')).toBe(
      'opaque-token',
    )
    expect(screen.getByLabelText('Demo usage status')).toBeVisible()
    expect(within(dialog).getByRole('button', { name: 'Cancel' })).toHaveFocus()

    fireEvent.keyDown(window, { key: 'Escape' })

    expect(screen.queryByRole('dialog', { name: 'Log out?' })).not.toBeInTheDocument()
    expect(window.sessionStorage.getItem('aerospec_access_token')).toBe(
      'opaque-token',
    )
    expect(screen.getByLabelText('Demo usage status')).toBeVisible()
  })

  it('confirme la déconnexion avant de supprimer la session et le quota', async () => {
    renderApp()

    expect(
      await screen.findByLabelText('17 of 20 requests remaining'),
    ).toBeVisible()
    fireEvent.click(screen.getByRole('button', { name: 'Log out' }))
    const dialog = screen.getByRole('dialog', { name: 'Log out?' })

    expect(window.sessionStorage.getItem('aerospec_access_token')).toBe(
      'opaque-token',
    )
    fireEvent.click(within(dialog).getByRole('button', { name: 'Log out' }))

    expect(window.sessionStorage.getItem('aerospec_access_token')).toBeNull()
    expect(screen.queryByLabelText('Demo usage status')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Sign in' })).toBeVisible()
  })

  it('supprime une session invalide détectée par le statut', async () => {
    mockedGetUsageStatus.mockRejectedValueOnce(new ApiError(401))

    renderApp()

    expect(
      await screen.findByRole('button', { name: 'Sign in' }),
    ).toBeVisible()
    expect(window.sessionStorage.getItem('aerospec_access_token')).toBeNull()
    expect(screen.queryByLabelText('Demo usage status')).not.toBeInTheDocument()
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

  it("identifie le deuxième exemple comme démonstration d'abstention", () => {
    const unsupportedExample =
      'What sealing material is specified for the Douglas hermetic MIL-DTL-38999 connectors?'
    const answerableExample =
      'What maximum current per contact and circuit voltage are specified for Molex Series 06-01 quarter-inch flat-blade connectors?'
    renderApp()

    const badge = screen.getByText('Abstention example')

    expect(badge).toHaveAttribute(
      'title',
      "This example is intentionally unsupported by the indexed documents and demonstrates the assistant's abstention behavior.",
    )
    expect(badge.closest('button')).toHaveTextContent(unsupportedExample)
    expect(
      screen.getByText(answerableExample).closest('button'),
    ).not.toHaveTextContent('Abstention example')
    expect(screen.getAllByText('Abstention example')).toHaveLength(1)
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

    expect(mockedAskQuestion).toHaveBeenCalledWith(question, 'opaque-token')
    expect(screen.getByRole('status')).toHaveTextContent(
      'Searching technical documentation… 0 s elapsed',
    )
    expect(screen.getByRole('status')).toHaveTextContent(
      'First request may take a little longer while the assistant initializes.',
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

  it('affiche un message spécifique lorsque le quota est épuisé', async () => {
    mockedAskQuestion.mockRejectedValue(
      new ApiError(429, 'demo_quota_exhausted'),
    )
    renderApp()

    submitQuestion('Le quota est-il disponible ?')

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'The shared demo quota has been used. Try again after the four-hour window resets.',
    )
  })

  it('rouvre la connexion sans perdre la question lorsque la session a expiré', async () => {
    mockedAskQuestion
      .mockRejectedValueOnce(new ApiError(401))
      .mockResolvedValueOnce({
        question: 'Ma session est-elle valide ?',
        answer: 'La session a été renouvelée.',
        sources: [],
        citations: [],
      })
    mockedLogin.mockResolvedValue({
      access_token: 'renewed-token',
      token_type: 'bearer',
      expires_in: 14_400,
    })
    renderApp()

    submitQuestion('Ma session est-elle valide ?')

    expect(
      await screen.findByRole('dialog', { name: 'Sign in to AeroSpec AI' }),
    ).toBeVisible()
    expect(window.sessionStorage.getItem('aerospec_access_token')).toBeNull()
    expect(
      screen.getByRole('textbox', { name: 'Technical question' }),
    ).toHaveValue('Ma session est-elle valide ?')
    expect(screen.queryByLabelText('Demo usage status')).not.toBeInTheDocument()
    expect(
      within(
        screen.getByRole('navigation', { name: 'Primary navigation' }),
      ).getByRole('button', { name: 'Sign in' }),
    ).toBeVisible()

    const loginDialog = screen.getByRole('dialog', {
      name: 'Sign in to AeroSpec AI',
    })
    fireEvent.change(within(loginDialog).getByLabelText('Username'), {
      target: { value: 'reviewer' },
    })
    fireEvent.change(within(loginDialog).getByLabelText('Password'), {
      target: { value: 'password' },
    })
    fireEvent.click(
      within(loginDialog).getByRole('button', { name: 'Sign in' }),
    )

    expect(await screen.findByText('La session a été renouvelée.')).toBeVisible()
    expect(mockedAskQuestion).toHaveBeenNthCalledWith(
      2,
      'Ma session est-elle valide ?',
      'renewed-token',
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
