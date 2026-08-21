import { createFileRoute, redirect } from '@tanstack/react-router'

import { LoadingScreen } from '@/components/LoadingScreen'
import { Dashboard } from '@/pages/dashboard/components/Dashboard'
import { getCurrentUser } from '@/utils/auth/getCurrentUser.server'

export const Route = createFileRoute('/dashboard')({
  beforeLoad: async () => {
    const user = await getCurrentUser()
    if (!user) {
      throw redirect({ to: '/login' })
    }
    return { user }
  },
  pendingComponent: LoadingScreen,
  pendingMs: 0,
  component: DashboardPage,
})

function DashboardPage() {
  const { user } = Route.useRouteContext()
  return <Dashboard name={user.name} role={user.role} />
}
