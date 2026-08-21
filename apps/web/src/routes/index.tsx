import { createFileRoute, redirect } from '@tanstack/react-router'

import { LoadingScreen } from '@/components/LoadingScreen'
import { userServices } from '@/services/userServices'

export const Route = createFileRoute('/')({
  beforeLoad: async () => {
    const user = await userServices.getCurrentUser()
    throw redirect({ to: user ? '/dashboard' : '/login' })
  },
  pendingComponent: LoadingScreen,
  pendingMs: 0,
})
