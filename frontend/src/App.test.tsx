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
import { askQuestion } from './api'
import type { AskResponse } from './api'

vi.mock('./api', () => ({
  askQuestion: vi.fn(),
}))

const mockedAskQuestion = vi.mocked(askQuestion)

function submitQuestion(question: string) {
  fireEvent.change(screen.getByRole('textbox', { name: 'Technical question' }), {
    target: { value: question },
  })
  fireEvent.click(screen.getByRole('button', { name: 'Ask' }))
}

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('App', () => {
  it("affiche l'état initial", () => {
    render(<App />)

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
  })

  it("préremplit la question depuis un exemple sans l'envoyer", () => {
    const example =
      'What helium leak rate is specified for the hermetic MIL-DTL-38999 connectors?'
    render(<App />)

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
    render(<App />)

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
    render(<App />)

    submitQuestion('Question sans source')

    expect(
      await screen.findByText(
        'No validated citations were returned for this answer.',
      ),
    ).toBeVisible()
  })

  it("affiche une erreur lorsque l'API échoue", async () => {
    mockedAskQuestion.mockRejectedValue(new Error('API unavailable'))
    render(<App />)

    submitQuestion('Pourquoi la requête échoue-t-elle ?')

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'The answer could not be retrieved. Check that the API is available and try again.',
    )
  })
})
