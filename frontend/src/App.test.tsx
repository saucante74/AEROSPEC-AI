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
  fireEvent.change(screen.getByRole('textbox', { name: 'Question technique' }), {
    target: { value: question },
  })
  fireEvent.click(screen.getByRole('button', { name: 'Poser la question' }))
}

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('App', () => {
  it("affiche l'état initial", () => {
    render(<App />)

    expect(screen.getByRole('heading', { name: 'AeroSpec AI' })).toBeVisible()
    expect(
      screen.getByRole('textbox', { name: 'Question technique' }),
    ).toHaveValue('')
    expect(
      screen.getByRole('button', { name: 'Poser la question' }),
    ).toBeDisabled()
    expect(screen.queryByText('Résultat de la recherche')).not.toBeInTheDocument()
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
      'Recherche des passages et préparation de la réponse…',
    )
    expect(
      screen.getByRole('textbox', { name: 'Question technique' }),
    ).toBeDisabled()

    await act(async () => resolveRequest(response))

    expect(await screen.findByText(response.answer)).toBeVisible()
    expect(
      within(
        screen.getByRole('region', { name: 'Résultat de la recherche' }),
      ).getByText(response.question),
    ).toBeVisible()
    expect(
      screen.getByRole('textbox', { name: 'Question technique' }),
    ).toHaveValue(`  ${question}  `)
    expect(screen.getByText('[S1]')).toBeVisible()
    expect(screen.getByText('connecteur.pdf')).toBeVisible()
    expect(screen.getByText('12')).toBeVisible()
    expect(screen.getByText('Citation résolue')).toBeVisible()
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
        "Aucune citation validée n'a été retournée pour cette réponse.",
      ),
    ).toBeVisible()
  })

  it("affiche une erreur lorsque l'API échoue", async () => {
    mockedAskQuestion.mockRejectedValue(new Error('API unavailable'))
    render(<App />)

    submitQuestion('Pourquoi la requête échoue-t-elle ?')

    expect(await screen.findByRole('alert')).toHaveTextContent(
      "La réponse n'a pas pu être obtenue. Vérifiez que l'API est disponible, puis réessayez.",
    )
  })
})
