import { createFileRoute, redirect } from '@tanstack/react-router'

import { LoadingScreen } from '@/components/LoadingScreen'
import { AdminDashboard } from '@/pages/admin/components/AdminDashboard'
import { userServices } from '@/services/userServices'

export const Route = createFileRoute('/admin')({
  beforeLoad: async () => {
    const user = await userServices.getCurrentUser()
    if (!user) {
      throw redirect({ to: '/login' })
    }
    if (user.role !== 'admin') {
      throw redirect({ to: '/dashboard' })
    }
    return { user }
  },
  pendingComponent: LoadingScreen,
  pendingMs: 0,
  component: AdminPage,
})

function AdminPage() {
  const { user } = Route.useRouteContext()
  return <AdminDashboard name={user.name} />
}
