import { createFileRoute, redirect } from '@tanstack/react-router'

import { LoadingScreen } from '@/components/LoadingScreen'
import { AdminDashboard } from '@/pages/admin/components/AdminDashboard'
import { userPhotoUrl, userServices } from '@/services/userServices'

export const Route = createFileRoute('/recruiter')({
  beforeLoad: async () => {
    const user = await userServices.getCurrentUser()
    if (!user) {
      throw redirect({ to: '/login' })
    }
    if (user.role !== 'recruiter') {
      throw redirect({ to: '/dashboard' })
    }
    return { user }
  },
  pendingComponent: LoadingScreen,
  pendingMs: 0,
  component: RecruiterPage,
})

function RecruiterPage() {
  const { user } = Route.useRouteContext()
  return <AdminDashboard name={user.name} photoUrl={userPhotoUrl(user)} />
}
