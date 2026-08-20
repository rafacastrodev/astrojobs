export class ApiError extends Error {
  status: number
  fieldErrors?: Record<string, string>

  constructor(status: number, message: string, fieldErrors?: Record<string, string>) {
    super(message)
    this.status = status
    this.fieldErrors = fieldErrors
  }
}

const API_URL = import.meta.env.VITE_API_URL as string

type JsonBody = Record<string, unknown>

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })

  if (!response.ok) {
    const body = await response.json().catch(() => null)
    throw new ApiError(response.status, extractMessage(body), extractFieldErrors(body))
  }

  if (response.status === 204) {
    return undefined as T
  }

  return (await response.json()) as T
}

function extractMessage(body: unknown): string {
  if (body && typeof body === 'object' && 'detail' in body && typeof body.detail === 'string') {
    return body.detail
  }
  return 'Something went wrong'
}

function extractFieldErrors(body: unknown): Record<string, string> | undefined {
  if (!body || typeof body !== 'object' || !('detail' in body)) return undefined
  const detail = body.detail
  if (!Array.isArray(detail)) return undefined

  const fieldErrors: Record<string, string> = {}
  for (const issue of detail) {
    if (issue && typeof issue === 'object' && 'loc' in issue && 'msg' in issue && Array.isArray(issue.loc)) {
      const field = issue.loc.at(-1)
      if (typeof field === 'string') {
        fieldErrors[field] = issue.msg
      }
    }
  }
  return Object.keys(fieldErrors).length > 0 ? fieldErrors : undefined
}

export const apiClient = {
  get: <T>(path: string) => request<T>(path, { method: 'GET' }),
  post: <T>(path: string, body?: JsonBody) =>
    request<T>(path, { method: 'POST', body: body ? JSON.stringify(body) : undefined }),
}
