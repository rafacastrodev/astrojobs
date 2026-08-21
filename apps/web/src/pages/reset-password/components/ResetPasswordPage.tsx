import { AuthLayout } from '@/components/AuthLayout'
import { ResetPasswordForm } from '@/pages/reset-password/components/ResetPasswordForm'

export const ResetPasswordPage = ({ token }: { token: string }) => {
  return (
    <AuthLayout title="Choose a new password" subtitle="Enter a new password for your account">
      <ResetPasswordForm token={token} />
    </AuthLayout>
  )
}
