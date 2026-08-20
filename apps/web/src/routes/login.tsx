import { createFileRoute, redirect } from '@tanstack/react-router'
import { useState } from 'react'

import { AuthLayout } from '#/components/AuthLayout'
import { SigninForm } from '#/pages/signin/components/SigninForm'
import { SignupForm } from '#/pages/signup/components/SignupForm'
import { getCurrentUser } from '#/utils/auth/getCurrentUser.server'

export const Route = createFileRoute('/login')({
  beforeLoad: async () => {
    const user = await getCurrentUser()
    if (user) {
      throw redirect({ to: '/dashboard' })
    }
  },
  component: LoginPage,
})

type Mode = 'signin' | 'signup'

function LoginPage() {
  const [mode, setMode] = useState<Mode>('signin')

  return (
    <AuthLayout
      title={mode === 'signin' ? 'Welcome back' : 'Create an account'}
      subtitle={
        mode === 'signin' ? 'Sign in to continue to AstroJobs' : "Let's start your journey with us today"
      }
    >
      <div key={mode} className="animate-[auth-fade-in_200ms_ease-out]">
        {mode === 'signin' ? (
          <SigninForm onSwitchToSignup={() => setMode('signup')} />
        ) : (
          <SignupForm onSwitchToSignin={() => setMode('signin')} />
        )}
      </div>
    </AuthLayout>
  )
}
