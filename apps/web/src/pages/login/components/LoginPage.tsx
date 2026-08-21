import { AuthLayout } from '@/components/AuthLayout'
import { SigninForm } from '@/pages/signin/components/SigninForm'
import { SignupForm } from '@/pages/signup/components/SignupForm'

import { useLoginPage } from '../hooks/useLoginPage'

export const LoginPage = () => {
  const { mode, title, subtitle, switchToSignin, switchToSignup } = useLoginPage()

  return (
    <AuthLayout title={title} subtitle={subtitle}>
      <div key={mode} className="animate-[auth-fade-in_200ms_ease-out]">
        {mode === 'signin' ? (
          <SigninForm onSwitchToSignup={switchToSignup} />
        ) : (
          <SignupForm onSwitchToSignin={switchToSignin} />
        )}
      </div>
    </AuthLayout>
  )
}
