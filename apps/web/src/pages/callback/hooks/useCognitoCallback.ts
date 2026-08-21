import { useContext, useEffect, useRef } from 'react'
import { AuthContext } from 'react-oidc-context'

import { useCognitoExchange } from '@/utils/auth/useCognitoExchange'

/** True while this document is the popup opened by signinPopup. */
const isInPopup = () =>
  typeof window !== 'undefined' && Boolean(window.opener) && window.opener !== window

/**
 * Finishes social sign-in on the redirect route.
 *
 * In a popup, oidc-client-ts posts the result back to the opener and closes
 * this window, so the exchange belongs to the opener and must not run here —
 * doing it twice would spend the same token on a second round-trip.
 */
export const useCognitoCallback = () => {
  const auth = useContext(AuthContext)
  const { startExchange, isExchanging, exchangeError } = useCognitoExchange()
  const exchanged = useRef(false)
  const inPopup = isInPopup()

  const idToken = auth?.user?.id_token

  useEffect(() => {
    if (inPopup || !idToken || exchanged.current) return
    exchanged.current = true
    startExchange(idToken)
  }, [inPopup, idToken, startExchange])

  return {
    isConfigured: Boolean(auth),
    isLoading: auth?.isLoading || isExchanging || inPopup,
    error: auth?.error ? auth.error.message : exchangeError,
    isAuthenticated: Boolean(auth?.isAuthenticated),
  }
}
