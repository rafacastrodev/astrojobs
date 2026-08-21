import { AxiosError } from 'axios'

import {
  applyApiFieldErrors,
  getApiErrorMessage,
  hasApiFieldErrors,
} from './errors'

function axiosError(detail?: unknown) {
  return new AxiosError(
    'Request failed',
    'ERR_BAD_REQUEST',
    undefined,
    undefined,
    {
      config: {} as never,
      data: { detail },
      headers: {},
      status: 400,
      statusText: 'Bad Request',
    },
  )
}

describe('API error utilities', () => {
  it('returns the API detail when it is a string', () => {
    expect(getApiErrorMessage(axiosError('Invalid credentials'))).toBe(
      'Invalid credentials',
    )
  })

  it.each([new Error('failure'), new AxiosError('Network failure')])(
    'returns the fallback for errors without an API message',
    (error) => {
      expect(getApiErrorMessage(error, 'Try again')).toBe('Try again')
    },
  )

  it('detects and applies field errors', () => {
    const error = axiosError([
      { loc: ['body', 'email'], msg: 'Invalid email' },
      { loc: ['body'], msg: 'Ignored' },
    ])
    const setError = jest.fn()

    expect(hasApiFieldErrors(error)).toBe(true)
    expect(applyApiFieldErrors(error, setError)).toBe(true)
    expect(setError).toHaveBeenCalledWith('email', { message: 'Invalid email' })
    expect(setError).toHaveBeenCalledTimes(1)
  })

  it('does not apply malformed field errors', () => {
    const setError = jest.fn()

    expect(applyApiFieldErrors(axiosError('failure'), setError)).toBe(false)
    expect(setError).not.toHaveBeenCalled()
  })
})
