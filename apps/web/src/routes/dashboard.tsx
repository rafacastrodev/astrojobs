import { createFileRoute, redirect } from '@tanstack/react-router'

import { DashboardStub } from '#/pages/dashboard/components/DashboardStub'
import { LoadingScreen } from '#/components/LoadingScreen'
import { getCurrentUser } from '#/utils/auth/getCurrentUser.server'

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
  return <DashboardStub name={user.name} />
}
