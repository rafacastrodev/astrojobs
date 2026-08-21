import { z } from 'zod'

const optionalUrl = (name: string) =>
  z
    .string()
    .trim()
    .refine(
      (value) => value === '' || z.url().safeParse(value).success,
      `${name} must be a valid URL`,
    )

const path = (name: string) =>
  z
    .string()
    .trim()
    .refine((value) => value.startsWith('/'), `${name} must start with "/"`)

const envSchema = z.object({
  apiUrl: optionalUrl('VITE_API_URL'),
  cognito: z
    .object({
      authority: optionalUrl('VITE_COGNITO_AUTHORITY'),
      clientId: z.string().trim().min(1),
      domain: optionalUrl('VITE_COGNITO_DOMAIN'),
      scope: z.string().trim(),
      // Paths, not absolute URLs: the origin is read at runtime so one build
      // works on localhost and in production alike.
      redirectPath: path('VITE_COGNITO_REDIRECT_PATH'),
      logoutPath: path('VITE_COGNITO_LOGOUT_PATH'),
      // Only providers actually attached to the pool's app client. A button
      // for a provider Cognito does not know always errors, so it stays off.
      providers: z.array(z.string()),
    })
    .nullable(),
})

export type FrontendEnv = {
  VITE_API_URL?: string
  VITE_COGNITO_AUTHORITY?: string
  VITE_COGNITO_CLIENT_ID?: string
  VITE_COGNITO_DOMAIN?: string
  VITE_COGNITO_SCOPE?: string
  VITE_COGNITO_REDIRECT_PATH?: string
  VITE_COGNITO_LOGOUT_PATH?: string
  VITE_COGNITO_PROVIDERS?: string
}

/**
 * Cognito stays optional: with no VITE_COGNITO_* values the app builds and
 * runs on email/password alone, so a missing pool never breaks the build.
 */
function readCognito(source: FrontendEnv) {
  const authority = source.VITE_COGNITO_AUTHORITY?.trim() ?? ''
  const clientId = source.VITE_COGNITO_CLIENT_ID?.trim() ?? ''

  if (!authority && !clientId) return null

  if (!authority || !clientId) {
    throw new Error(
      'Cognito is partially configured: VITE_COGNITO_AUTHORITY and ' +
        'VITE_COGNITO_CLIENT_ID are both required.',
    )
  }

  return {
    authority,
    clientId,
    domain: source.VITE_COGNITO_DOMAIN ?? '',
    scope: source.VITE_COGNITO_SCOPE?.trim() || 'openid email',
    redirectPath: source.VITE_COGNITO_REDIRECT_PATH?.trim() || '/callback',
    logoutPath: source.VITE_COGNITO_LOGOUT_PATH?.trim() || '/login',
    providers: (source.VITE_COGNITO_PROVIDERS ?? '')
      .split(',')
      .map((name) => name.trim())
      .filter(Boolean),
  }
}

export function parseEnv(source: FrontendEnv) {
  return envSchema.parse({
    apiUrl: source.VITE_API_URL ?? '',
    cognito: readCognito(source),
  })
}
