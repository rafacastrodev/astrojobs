import { createFileRoute, redirect } from '@tanstack/react-router'

import { LoginPage } from '@/pages/login/components/LoginPage'
import { userServices } from '@/services/userServices'

export const Route = createFileRoute('/login')({
  beforeLoad: async () => {
    const user = await userServices.getCurrentUser()
    if (user) {
      throw redirect({ to: '/dashboard' })
    }
  },
  component: LoginPage,
})
