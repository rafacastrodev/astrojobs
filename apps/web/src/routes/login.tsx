import { createFileRoute, redirect } from '@tanstack/react-router'

import { LoginPage } from '@/pages/login/components/LoginPage'
import { getCurrentUser } from '@/utils/auth/getCurrentUser.server'

export const Route = createFileRoute('/login')({
  beforeLoad: async () => {
    const user = await getCurrentUser()
    if (user) {
      throw redirect({ to: '/dashboard' })
    }
  },
  component: LoginPage,
})
