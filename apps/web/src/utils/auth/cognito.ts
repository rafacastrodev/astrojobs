import { WebStorageStateStore } from 'oidc-client-ts'
import type { AuthProviderProps } from 'react-oidc-context'

import { env } from '@/utils/env/config'

/** Cognito's name for a social provider, passed through to the Hosted UI.
 *
 * Only providers Cognito supports natively belong here. GitHub is not one of
 * them: it has no OIDC discovery document, so it cannot be added as a generic
 * OIDC provider without a proxy in front. */
export type SocialProvider = 'Google'

/**
 * Redirect targets are built from the current origin at runtime rather than
 * baked in at build time, so the same bundle works on localhost and on the
 * production domain. Both resulting URLs must be allow-listed on the Cognito
 * app client.
 */
const absoluteUrl = (path: string) =>
  typeof window === 'undefined' ? path : new URL(path, window.location.origin).toString()

export const isCognitoEnabled = env.cognito !== null

/** Providers attached to the app client in Cognito, per configuration. */
export const isProviderAvailable = (provider: SocialProvider) =>
  env.cognito?.providers.includes(provider) ?? false

export const cognitoAuthConfig: AuthProviderProps | null = env.cognito && {
  authority: env.cognito.authority,
  client_id: env.cognito.clientId,
  redirect_uri: absoluteUrl(env.cognito.redirectPath),
  response_type: 'code',
  scope: env.cognito.scope,
  // Tokens only need to survive the redirect round-trip; the app session is a
  // backend cookie, so nothing is kept in long-lived storage.
  userStore: new WebStorageStateStore({ store: window.sessionStorage }),
  stateStore: new WebStorageStateStore({ store: window.sessionStorage }),
  // Keeps ?code=&state= out of the address bar after the redirect lands.
  onSigninCallback: () => {
    window.history.replaceState({}, document.title, window.location.pathname)
  },
}

/**
 * Sends the user straight to one social provider instead of Cognito's
 * provider picker.
 */
export const identityProviderParams = (provider: SocialProvider) => ({
  extraQueryParams: { identity_provider: provider },
})

/**
 * Cognito's Hosted UI logout URL, which clears the session Cognito keeps on
 * its own domain. Without it the next sign-in silently reuses that session.
 */
export const buildLogoutUrl = () => {
  if (!env.cognito?.domain) return null
  const { domain, clientId, logoutPath } = env.cognito
  const params = new URLSearchParams({
    client_id: clientId,
    logout_uri: absoluteUrl(logoutPath),
  })
  return `${domain.replace(/\/$/, '')}/logout?${params.toString()}`
}
