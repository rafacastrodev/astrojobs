import { Link } from '@tanstack/react-router'

import { AuthLayout } from '@/components/AuthLayout'
import { ResetPasswordForm } from '@/pages/reset-password/components/ResetPasswordForm'

export const ResetPasswordPage = ({ token }: { token: string }) => {
  if (!token) {
    return (
      <AuthLayout
        title="Invalid reset link"
        subtitle="Request a new password reset link to continue"
      >
        <Link
          to="/forgot-password"
          className="block w-full rounded-lg bg-primary px-4 py-2.5 text-center font-medium text-primary-foreground transition hover:opacity-90"
        >
          Request a new link
        </Link>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout
      title="Choose a new password"
      subtitle="Enter a new password for your account"
    >
      <ResetPasswordForm token={token} />
    </AuthLayout>
  )
}
