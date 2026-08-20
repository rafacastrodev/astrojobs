import { createFileRoute, redirect } from '@tanstack/react-router'

import { LoadingScreen } from '#/components/LoadingScreen'
import { getCurrentUser } from '#/utils/auth/getCurrentUser.server'

export const Route = createFileRoute('/')({
  beforeLoad: async () => {
    const user = await getCurrentUser()
    throw redirect({ to: user ? '/dashboard' : '/login' })
  },
  pendingComponent: LoadingScreen,
  pendingMs: 0,
})
