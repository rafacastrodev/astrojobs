import { AxiosError } from 'axios'

export function getApiErrorMessage(error: unknown, fallback = 'Something went wrong') {
  if (error instanceof AxiosError) {
    const detail = error.response?.data?.detail
    if (typeof detail === 'string') return detail
    if (error.message) return error.message
  }
  return fallback
}

export function hasApiFieldErrors(error: unknown) {
  return error instanceof AxiosError && Array.isArray(error.response?.data?.detail)
}

export function applyApiFieldErrors<T extends string>(
  error: unknown,
  setError: (field: T, error: { message: string }) => void,
) {
  if (!hasApiFieldErrors(error) || !(error instanceof AxiosError)) return false
  const detail = error.response?.data?.detail
  if (!Array.isArray(detail)) return false

  let applied = false
  for (const issue of detail) {
    if (issue && typeof issue === 'object' && 'loc' in issue && 'msg' in issue) {
      const field = Array.isArray(issue.loc) ? issue.loc.at(-1) : null
      if (typeof field === 'string') {
        setError(field as T, { message: String(issue.msg) })
        applied = true
      }
    }
  }
  return applied
}
