export interface SourceReference {
  source: string
  page: number
  page_label: string
}

export interface Citation extends SourceReference {
  id: string
}

export interface AskResponse {
  question: string
  answer: string
  sources: SourceReference[]
  citations: Citation[]
}

export interface LoginRequest {
  username: string
  password: string
}

export interface AuthSession {
  access_token: string
  token_type: 'bearer'
  expires_in: number
}

interface ErrorDetail {
  code?: string
  message?: string
}

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code?: string,
    message = `API request failed with status ${status}`,
  ) {
    super(message)
  }
}

interface AskRequest {
  question: string
}

export const supportedUnits = ['mm', 'inch', 'N', 'lbf', '°C', '°F'] as const

export type Unit = (typeof supportedUnits)[number]

export interface ConvertRequest {
  value: number
  from_unit: Unit
  to_unit: Unit
}

export interface ConvertResponse extends ConvertRequest {
  converted_value: number
}

const configuredBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim()
const apiBaseUrl = (configuredBaseUrl || 'http://localhost:8000').replace(
  /\/$/,
  '',
)

async function apiError(response: Response): Promise<ApiError> {
  let code: string | undefined
  let message = `API request failed with status ${response.status}`

  try {
    const body = (await response.json()) as {
      detail?: string | ErrorDetail
    }
    if (typeof body.detail === 'string') {
      message = body.detail
    } else if (body.detail) {
      code = body.detail.code
      message = body.detail.message ?? message
    }
  } catch {
    return new ApiError(response.status, code, message)
  }

  return new ApiError(response.status, code, message)
}

export async function login(request: LoginRequest): Promise<AuthSession> {
  const response = await fetch(`${apiBaseUrl}/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  })

  if (!response.ok) {
    throw await apiError(response)
  }

  return (await response.json()) as AuthSession
}

export async function askQuestion(
  question: string,
  accessToken: string,
): Promise<AskResponse> {
  const request: AskRequest = { question }
  const response = await fetch(`${apiBaseUrl}/ask`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  })

  if (!response.ok) {
    throw await apiError(response)
  }

  return (await response.json()) as AskResponse
}

export async function convertUnit(
  request: ConvertRequest,
): Promise<ConvertResponse> {
  const response = await fetch(`${apiBaseUrl}/convert`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  })

  if (!response.ok) {
    throw await apiError(response)
  }

  return (await response.json()) as ConvertResponse
}
