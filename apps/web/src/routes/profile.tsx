import { createFileRoute, redirect } from '@tanstack/react-router'

import { LoadingScreen } from '@/components/LoadingScreen'
import { ProfilePage } from '@/pages/profile/components/ProfilePage'
import { userPhotoUrl, userServices } from '@/services/userServices'

export const Route = createFileRoute('/profile')({
  beforeLoad: async () => {
    const user = await userServices.getCurrentUser()
    if (!user) {
      throw redirect({ to: '/login' })
    }
    return { user }
  },
  pendingComponent: LoadingScreen,
  pendingMs: 0,
  component: ProfileRoute,
})

function ProfileRoute() {
  const { user } = Route.useRouteContext()
  return (
    <ProfilePage
      name={user.name}
      email={user.email}
      role={user.role}
      createdAt={user.created_at}
      photoUrl={userPhotoUrl(user)}
    />
  )
}
