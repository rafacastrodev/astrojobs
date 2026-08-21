import { useMutation } from '@tanstack/react-query'
import { useRouter } from '@tanstack/react-router'
import { useContext } from 'react'
import { AuthContext } from 'react-oidc-context'

import { userServices } from '@/services/userServices'
import { getApiErrorMessage } from '@/utils'

/**
 * Trades a Cognito ID token for the app's session cookie and lands the user on
 * the dashboard. Shared by both sign-in styles: the popup flow calls it once
 * the popup resolves, the redirect flow calls it from the callback route.
 */
export const useCognitoExchange = () => {
  const router = useRouter()
  const auth = useContext(AuthContext)

  const mutation = useMutation({
    mutationFn: userServices.signInWithCognito,
    onSuccess: () => {
      // The Cognito tokens have done their job; the session is the cookie now.
      void auth?.removeUser()
      router.navigate({ to: '/dashboard' })
    },
  })

  return {
    exchange: mutation.mutateAsync,
    startExchange: mutation.mutate,
    isExchanging: mutation.isPending,
    exchangeError: mutation.isError
      ? getApiErrorMessage(mutation.error, 'Could not complete sign-in')
      : null,
  }
}
