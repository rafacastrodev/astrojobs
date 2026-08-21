import { parseEnv } from './parseEnv'

const COGNITO = {
  VITE_COGNITO_AUTHORITY:
    'https://cognito-idp.us-east-2.amazonaws.com/us-east-2_abc123',
  VITE_COGNITO_CLIENT_ID: 'client-id',
}

describe('parseEnv', () => {
  it('maps VITE_API_URL to the frontend configuration', () => {
    expect(parseEnv({ VITE_API_URL: 'https://api.astrojobs.test' })).toEqual({
      apiUrl: 'https://api.astrojobs.test',
      cognito: null,
    })
  })

  it.each([undefined, ''])('accepts an empty VITE_API_URL: %s', (apiUrl) => {
    expect(parseEnv({ VITE_API_URL: apiUrl })).toEqual({
      apiUrl: '',
      cognito: null,
    })
  })

  it('rejects a non-empty invalid VITE_API_URL', () => {
    expect(() => parseEnv({ VITE_API_URL: 'not-a-url' })).toThrow(
      'VITE_API_URL must be a valid URL',
    )
  })

  describe('cognito', () => {
    it('is null when no VITE_COGNITO_* value is set', () => {
      expect(parseEnv({}).cognito).toBeNull()
    })

    it('reads the pool configuration with redirect defaults', () => {
      expect(parseEnv(COGNITO).cognito).toEqual({
        authority: COGNITO.VITE_COGNITO_AUTHORITY,
        clientId: 'client-id',
        domain: '',
        scope: 'openid email',
        redirectPath: '/callback',
        logoutPath: '/login',
        providers: [],
      })
    })

    it('keeps the requested scope, hosted UI domain and paths', () => {
      const env = parseEnv({
        ...COGNITO,
        VITE_COGNITO_SCOPE: 'phone openid email',
        VITE_COGNITO_DOMAIN:
          'https://astrojobs.auth.us-east-2.amazoncognito.com',
        VITE_COGNITO_REDIRECT_PATH: '/oauth/done',
        VITE_COGNITO_LOGOUT_PATH: '/bye',
      })

      expect(env.cognito).toMatchObject({
        scope: 'phone openid email',
        domain: 'https://astrojobs.auth.us-east-2.amazoncognito.com',
        redirectPath: '/oauth/done',
        logoutPath: '/bye',
      })
    })

    it.each(['VITE_COGNITO_AUTHORITY', 'VITE_COGNITO_CLIENT_ID'])(
      'rejects a partial configuration missing %s',
      (missing) => {
        expect(() => parseEnv({ ...COGNITO, [missing]: '' })).toThrow(
          'Cognito is partially configured',
        )
      },
    )

    it('parses the configured provider list', () => {
      expect(
        parseEnv({ ...COGNITO, VITE_COGNITO_PROVIDERS: 'Google, Apple' })
          .cognito?.providers,
      ).toEqual(['Google', 'Apple'])
    })

    it.each([undefined, '', '  ,  '])(
      'has no providers when the list is empty: %s',
      (providers) => {
        expect(
          parseEnv({ ...COGNITO, VITE_COGNITO_PROVIDERS: providers }).cognito
            ?.providers,
        ).toEqual([])
      },
    )

    it('rejects an invalid authority URL', () => {
      expect(() =>
        parseEnv({ ...COGNITO, VITE_COGNITO_AUTHORITY: 'not-a-url' }),
      ).toThrow('VITE_COGNITO_AUTHORITY must be a valid URL')
    })

    // Absolute URLs here would defeat the runtime-origin design and silently
    // pin the bundle to one environment.
    it('rejects a redirect path that is not a path', () => {
      expect(() =>
        parseEnv({
          ...COGNITO,
          VITE_COGNITO_REDIRECT_PATH: 'https://app.test/callback',
        }),
      ).toThrow('VITE_COGNITO_REDIRECT_PATH must start with')
    })
  })
})
