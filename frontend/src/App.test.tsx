import '@testing-library/jest-dom/vitest'

import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import App from './App'
import { askQuestion } from './api'
import type { AskResponse } from './api'
import { I18nProvider } from './i18n/I18nContext'
import { languageStorageKey } from './i18n/translations'

vi.mock('./api', () => ({
  askQuestion: vi.fn(),
}))

const mockedAskQuestion = vi.mocked(askQuestion)

function renderApp() {
  return render(
    <I18nProvider>
      <App />
    </I18nProvider>,
  )
}

function submitQuestion(question: string) {
  fireEvent.change(screen.getByRole('textbox', { name: 'Technical question' }), {
    target: { value: question },
  })
  fireEvent.click(screen.getByRole('button', { name: 'Ask' }))
}

beforeEach(() => {
  localStorage.clear()
})

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('App', () => {
  it("affiche l'état initial", () => {
    renderApp()

    expect(
      screen.getByRole('heading', {
        name: 'Ask. Find. Engineer with confidence.',
      }),
    ).toBeVisible()
    expect(
      screen.getByRole('textbox', { name: 'Technical question' }),
    ).toHaveValue('')
    expect(screen.getByRole('button', { name: 'Ask' })).toBeDisabled()
    expect(screen.queryByRole('region', { name: 'Result' })).not.toBeInTheDocument()
    expect(document.documentElement).toHaveAttribute('lang', 'en')
    expect(
      screen.getByRole('button', { name: 'Switch to English' }),
    ).toHaveAttribute('aria-pressed', 'true')
  })

  it('passe en français et restaure la langue persistée', () => {
    renderApp()

    fireEvent.click(screen.getByRole('button', { name: 'Passer au français' }))

    expect(
      screen.getByRole('heading', {
        name: 'Demandez. Trouvez. Concevez en toute confiance.',
      }),
    ).toBeVisible()
    expect(
      screen.getByRole('heading', { name: 'Posez une question technique' }),
    ).toBeVisible()
    expect(document.documentElement).toHaveAttribute('lang', 'fr')
    expect(localStorage.getItem(languageStorageKey)).toBe('fr')

    cleanup()
    renderApp()

    expect(
      screen.getByRole('heading', {
        name: 'Demandez. Trouvez. Concevez en toute confiance.',
      }),
    ).toBeVisible()
  })

  it('passe en italien sans recharger la page', () => {
    renderApp()

    fireEvent.click(screen.getByRole('button', { name: 'Passa all’italiano' }))

    expect(
      screen.getByRole('heading', {
        name: 'Chiedi. Trova. Progetta con fiducia.',
      }),
    ).toBeVisible()
    expect(
      screen.getByRole('heading', { name: 'Fai una domanda tecnica' }),
    ).toBeVisible()
    expect(document.documentElement).toHaveAttribute('lang', 'it')
  })

  it('retombe sur English si la langue persistée est invalide', () => {
    localStorage.setItem(languageStorageKey, 'unknown')

    renderApp()

    expect(
      screen.getByRole('heading', {
        name: 'Ask. Find. Engineer with confidence.',
      }),
    ).toBeVisible()
    expect(document.documentElement).toHaveAttribute('lang', 'en')
    expect(localStorage.getItem(languageStorageKey)).toBe('en')
  })

  it("préremplit un exemple traduit sans l'envoyer", () => {
    const example =
      'Quel taux de fuite à l’hélium est spécifié pour les connecteurs hermétiques MIL-DTL-38999 ?'
    renderApp()

    fireEvent.click(screen.getByRole('button', { name: 'Passer au français' }))

    fireEvent.click(screen.getByRole('button', { name: example }))

    expect(
      screen.getByRole('textbox', { name: 'Question technique' }),
    ).toHaveValue(example)
    expect(mockedAskQuestion).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: 'Demander' })).toBeEnabled()
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
      'Searching documents and preparing an answer…',
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
})
