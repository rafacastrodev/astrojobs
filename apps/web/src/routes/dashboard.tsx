import { createFileRoute, redirect } from '@tanstack/react-router'

import { LoadingScreen } from '@/components/LoadingScreen'
import { Dashboard } from '@/pages/dashboard/components/Dashboard'
import { userPhotoUrl, userServices } from '@/services/userServices'

export const Route = createFileRoute('/dashboard')({
  beforeLoad: async () => {
    const user = await userServices.getCurrentUser()
    if (!user) {
      throw redirect({ to: '/login' })
    }
    if (user.role === 'recruiter') {
      throw redirect({ to: '/recruiter' })
    }
    return { user }
  },
  pendingComponent: LoadingScreen,
  pendingMs: 0,
  component: DashboardPage,
})

function DashboardPage() {
  const { user } = Route.useRouteContext()
  return (
    <Dashboard
      name={user.name}
      photoUrl={userPhotoUrl(user)}
    />
  )
}
