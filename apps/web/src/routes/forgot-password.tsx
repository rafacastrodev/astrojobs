import { createFileRoute } from '@tanstack/react-router'

import { AuthLayout } from '#/components/AuthLayout'
import { ForgotPasswordForm } from '#/pages/forgot-password/components/ForgotPasswordForm'

export const Route = createFileRoute('/forgot-password')({
  component: ForgotPasswordPage,
})

function ForgotPasswordPage() {
  return (
    <AuthLayout title="Reset your password" subtitle="We'll email you a link to get back in">
      <ForgotPasswordForm />
    </AuthLayout>
  )
}
