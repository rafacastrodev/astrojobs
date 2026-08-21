import { useContext, useState } from 'react'
import { AuthContext } from 'react-oidc-context'

import type { SocialProvider } from '@/utils/auth/cognito'
import { identityProviderParams, isProviderAvailable } from '@/utils/auth/cognito'
import { useCognitoExchange } from '@/utils/auth/useCognitoExchange'

/**
 * Opens the provider's sign-in window and turns the result into an app
 * session.
 *
 * Reads AuthContext directly rather than useAuth(), whose type claims the
 * context is always present while it actually returns undefined with no
 * AuthProvider mounted.
 */
export const useSocialSignin = () => {
  const auth = useContext(AuthContext)
  const { exchange, isExchanging, exchangeError } = useCognitoExchange()
  const [popupError, setPopupError] = useState<string | null>(null)
  const [isOpening, setIsOpening] = useState(false)

  const signinWith = (provider: SocialProvider) => {
    // No AuthProvider, or a provider the pool has no IdP for: leave the button
    // disabled rather than sending the user to a guaranteed Cognito error.
    if (!auth || !isProviderAvailable(provider)) return undefined

    return async () => {
      const params = identityProviderParams(provider)
      setPopupError(null)
      setIsOpening(true)
      try {
        const user = await auth.signinPopup(params)
        if (user.id_token) await exchange(user.id_token)
      } catch (error) {
        // Only a blocked popup justifies taking over the page: closing the
        // popup is the user cancelling, and redirecting them then would be
        // the opposite of what they asked for.
        if (isPopupBlocked(error)) {
          void auth.signinRedirect(params)
          return
        }
        if (!isCancellation(error)) setPopupError(messageFor(error))
      } finally {
        setIsOpening(false)
      }
    }
  }

  return {
    signinWith,
    isEnabled: Boolean(auth),
    isBusy: isOpening || isExchanging,
    error: popupError ?? exchangeError,
  }
}

function messageFor(error: unknown) {
  return error instanceof Error ? error.message : 'Social sign-in failed'
}

// oidc-client-ts reports these as plain messages: "Popup blocked by user",
// "Popup closed by user", "Popup aborted".
function isPopupBlocked(error: unknown) {
  return messageFor(error).toLowerCase().includes('blocked')
}

function isCancellation(error: unknown) {
  const message = messageFor(error).toLowerCase()
  return message.includes('closed') || message.includes('aborted')
}
