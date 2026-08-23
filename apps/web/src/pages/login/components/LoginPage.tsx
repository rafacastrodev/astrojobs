import { AuthLayout } from '@/components/AuthLayout'
import { SigninForm } from '@/pages/signin/components/SigninForm'
import { SignupForm } from '@/pages/signup/components/SignupForm'

import { useLoginPage } from '../hooks/useLoginPage'

type LoginPageProps = {
  initialMode?: 'signin' | 'signup'
}

export const LoginPage = ({ initialMode }: LoginPageProps) => {
  const { mode, title, subtitle, switchToSignin, switchToSignup } =
    useLoginPage(initialMode)

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
