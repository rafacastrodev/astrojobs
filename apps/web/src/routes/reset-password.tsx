import { createFileRoute } from '@tanstack/react-router'

import { ResetPasswordPage } from '@/pages/reset-password/components/ResetPasswordPage'

type ResetPasswordSearch = { token: string }

export const Route = createFileRoute('/reset-password')({
  validateSearch: (search: Record<string, unknown>): ResetPasswordSearch => ({
    token: typeof search.token === 'string' ? search.token : '',
  }),
  component: ResetPasswordRoute,
})

function ResetPasswordRoute() {
  const { token } = Route.useSearch()
  return <ResetPasswordPage token={token} />
}
