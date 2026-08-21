import { Link } from '@tanstack/react-router'

import { LoadingScreen } from '@/components/LoadingScreen'
import { RouteStatus } from '@/components/RouteStatus'

import { useCognitoCallback } from '../hooks/useCognitoCallback'

const BackToLogin = () => (
  <Link
    to="/login"
    className="text-sm text-muted-foreground underline underline-offset-2 hover:text-foreground"
  >
    Back to sign in
  </Link>
)

export const CallbackPage = () => {
  const { isConfigured, isLoading, error, isAuthenticated } =
    useCognitoCallback()

  if (!isConfigured) {
    return (
      <RouteStatus
        code="CONFIG"
        title="Social sign-in is off"
        description="No Cognito pool is configured for this environment."
      >
        <BackToLogin />
      </RouteStatus>
    )
  }

  if (error) {
    return (
      <RouteStatus code="ERROR" title="Sign-in failed" description={error}>
        <BackToLogin />
      </RouteStatus>
    )
  }

  // Also covers the moment between a successful exchange and the redirect.
  if (isLoading || isAuthenticated) return <LoadingScreen />

  return (
    <RouteStatus
      code="404"
      title="Nothing to complete"
      description="This page finishes a social sign-in redirect."
    >
      <BackToLogin />
    </RouteStatus>
  )
}
