import { createFileRoute, redirect } from '@tanstack/react-router'

import { LoginPage } from '@/pages/login/components/LoginPage'
import { userServices } from '@/services/userServices'

type LoginSearch = { mode?: 'signin' | 'signup' }

export const Route = createFileRoute('/login')({
  validateSearch: (search: Record<string, unknown>): LoginSearch => ({
    mode: search.mode === 'signup' ? 'signup' : 'signin',
  }),
  beforeLoad: async () => {
    const user = await userServices.getCurrentUser()
    if (user) {
      throw redirect({
        to: user.role === 'recruiter' ? '/recruiter' : '/dashboard',
      })
    }
  },
  component: LoginRoute,
})

function LoginRoute() {
  const { mode } = Route.useSearch()
  return <LoginPage initialMode={mode} />
}
