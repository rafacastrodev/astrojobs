import { createFileRoute } from '@tanstack/react-router'

import { CallbackPage } from '@/pages/callback/components/CallbackPage'

// Must match VITE_COGNITO_REDIRECT_URI and the callback URL allow-listed on
// the Cognito app client. Deliberately not under /auth, which the dev server
// proxies to the API.
export const Route = createFileRoute('/callback')({
  component: CallbackPage,
})
