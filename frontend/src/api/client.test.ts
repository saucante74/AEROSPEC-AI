import { afterEach, describe, expect, it, vi } from 'vitest'

import { ApiError, askQuestion, convertUnit, login } from './client'
import type { AskResponse, AuthSession, ConvertResponse } from './client'

describe('login', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('envoie les identifiants uniquement à POST /auth/login', async () => {
    const session: AuthSession = {
      access_token: 'opaque-token',
      token_type: 'bearer',
      expires_in: 14_400,
    }
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(session), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    )
    vi.stubGlobal('fetch', fetchMock)

    await expect(
      login({ username: 'reviewer', password: 'secret' }),
    ).resolves.toEqual(session)
    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:8000/auth/login',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'reviewer', password: 'secret' }),
      },
    )
  })
})

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

    await expect(
      askQuestion('Quelle est la limite ?', 'opaque-token'),
    ).resolves.toEqual(apiResponse)
    expect(fetchMock).toHaveBeenCalledOnce()
    expect(fetchMock).toHaveBeenCalledWith('http://localhost:8000/ask', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer opaque-token',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ question: 'Quelle est la limite ?' }),
    })
  })

  it('rejette la requête lorsque la réponse HTTP est en erreur', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response(null, { status: 503 })),
    )

    await expect(
      askQuestion('Question indisponible', 'opaque-token'),
    ).rejects.toThrow('API request failed with status 503')
  })

  it('expose le code structuré du quota sans perdre le statut HTTP', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            detail: {
              code: 'demo_quota_exhausted',
              message: 'Quota exhausted.',
            },
          }),
          { status: 429, headers: { 'Content-Type': 'application/json' } },
        ),
      ),
    )

    const error = await askQuestion('Question', 'opaque-token').catch(
      (caughtError: unknown) => caughtError,
    )

    expect(error).toBeInstanceOf(ApiError)
    expect(error).toMatchObject({
      status: 429,
      code: 'demo_quota_exhausted',
    })
  })
})

describe('convertUnit', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('envoie le payload exact en JSON à POST /convert et parse la réponse', async () => {
    const apiResponse: ConvertResponse = {
      value: 100,
      from_unit: 'N',
      to_unit: 'lbf',
      converted_value: 22.480894309971,
    }
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(apiResponse), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    )
    vi.stubGlobal('fetch', fetchMock)

    await expect(
      convertUnit({ value: 100, from_unit: 'N', to_unit: 'lbf' }),
    ).resolves.toEqual(apiResponse)
    expect(fetchMock).toHaveBeenCalledOnce()
    expect(fetchMock).toHaveBeenCalledWith('http://localhost:8000/convert', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ value: 100, from_unit: 'N', to_unit: 'lbf' }),
    })
  })

  it('rejette la conversion lorsque la réponse HTTP est en erreur', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response(null, { status: 422 })),
    )

    await expect(
      convertUnit({ value: 1, from_unit: 'mm', to_unit: 'inch' }),
    ).rejects.toThrow('API request failed with status 422')
  })
})
