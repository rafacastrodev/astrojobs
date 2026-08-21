import { AxiosError } from 'axios'
import type { FieldValues, Path, UseFormSetError } from 'react-hook-form'

export function getApiErrorMessage(
  error: unknown,
  fallback = 'Something went wrong, try again',
) {
  if (error instanceof AxiosError) {
    if (!error.response) return fallback
    const detail = error.response.data?.detail
    if (typeof detail === 'string') return detail
  }
  return fallback
}

export function hasApiFieldErrors(error: unknown) {
  return error instanceof AxiosError && Array.isArray(error.response?.data?.detail)
}

export function applyApiFieldErrors<TFieldValues extends FieldValues>(
  error: unknown,
  setError: UseFormSetError<TFieldValues>,
) {
  if (!hasApiFieldErrors(error) || !(error instanceof AxiosError)) return false
  const detail = error.response?.data?.detail
  if (!Array.isArray(detail)) return false

  let applied = false
  for (const issue of detail) {
    if (issue && typeof issue === 'object' && 'loc' in issue && 'msg' in issue) {
      const field = Array.isArray(issue.loc) ? issue.loc.at(-1) : null
      if (typeof field === 'string' && field !== 'body' && field !== 'query') {
        setError(field as Path<TFieldValues>, { message: String(issue.msg) })
        applied = true
      }
    }
  }
  return applied
}
