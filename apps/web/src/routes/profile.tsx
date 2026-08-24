import { createFileRoute, redirect } from '@tanstack/react-router'

import { LoadingScreen } from '@/components/LoadingScreen'
import { ProfilePage } from '@/pages/profile/components/ProfilePage'
import { userPhotoUrl, needsOnboarding, userServices } from '@/services/userServices'

export const Route = createFileRoute('/profile')({
  beforeLoad: async () => {
    const user = await userServices.getCurrentUser()
    if (!user) {
      throw redirect({ to: '/login' })
    }
    if (needsOnboarding(user)) {
      throw redirect({ to: '/onboarding' })
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
      jobTitle={user.job_title}
      region={user.region}
      salaryMinUsd={user.salary_min_usd}
      salaryMaxUsd={user.salary_max_usd}
    />
  )
}
