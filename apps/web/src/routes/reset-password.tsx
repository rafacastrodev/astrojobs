import { createFileRoute } from '@tanstack/react-router'

import { AuthLayout } from '#/components/AuthLayout'
import { ResetPasswordForm } from '#/pages/reset-password/components/ResetPasswordForm'

type ResetPasswordSearch = { token: string }

export const Route = createFileRoute('/reset-password')({
  validateSearch: (search: Record<string, unknown>): ResetPasswordSearch => ({
    token: typeof search.token === 'string' ? search.token : '',
  }),
  component: ResetPasswordPage,
})

function ResetPasswordPage() {
  const { token } = Route.useSearch()

  return (
    <AuthLayout title="Choose a new password" subtitle="Enter a new password for your account">
      <ResetPasswordForm token={token} />
    </AuthLayout>
  )
}
