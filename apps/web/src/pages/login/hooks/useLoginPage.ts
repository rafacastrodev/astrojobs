import { useState } from 'react'

type Mode = 'signin' | 'signup'

export const useLoginPage = () => {
  const [mode, setMode] = useState<Mode>('signin')

  return {
    mode,
    title: mode === 'signin' ? 'Welcome back' : 'Create an account',
    subtitle:
      mode === 'signin'
        ? 'Sign in to continue to AstroJobs'
        : "Let's start your journey with us today",
    switchToSignin: () => setMode('signin'),
    switchToSignup: () => setMode('signup'),
  }
}
