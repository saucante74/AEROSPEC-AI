import { afterEach, describe, expect, it, vi } from 'vitest'

import { askQuestion } from './client'
import type { AskResponse } from './client'

describe('askQuestion', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('envoie la question en JSON à POST /ask et parse la réponse', async () => {
    const apiResponse: AskResponse = {
      question: 'Quelle est la limite ?',
      answer: 'La limite est 120 °C.',
      sources: [{ source: 'manuel.pdf', page: 7, page_label: '8' }],
      citations: [
        {
          id: '[S1]',
          source: 'manuel.pdf',
          page: 7,
          page_label: '8',
        },
      ],
    }
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(apiResponse), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    )
    vi.stubGlobal('fetch', fetchMock)

    await expect(askQuestion('Quelle est la limite ?')).resolves.toEqual(
      apiResponse,
    )
    expect(fetchMock).toHaveBeenCalledOnce()
    expect(fetchMock).toHaveBeenCalledWith('http://localhost:8000/ask', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question: 'Quelle est la limite ?' }),
    })
  })

  it('rejette la requête lorsque la réponse HTTP est en erreur', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response(null, { status: 503 })),
    )

    await expect(askQuestion('Question indisponible')).rejects.toThrow(
      'API request failed with status 503',
    )
  })
})
