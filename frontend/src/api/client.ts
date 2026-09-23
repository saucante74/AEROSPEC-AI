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

export async function askQuestion(question: string): Promise<AskResponse> {
  const request: AskRequest = { question }
  const response = await fetch(`${apiBaseUrl}/ask`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  })

  if (!response.ok) {
    throw new Error(`API request failed with status ${response.status}`)
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
    throw new Error(`API request failed with status ${response.status}`)
  }

  return (await response.json()) as ConvertResponse
}
