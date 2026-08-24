import { createFileRoute, redirect } from '@tanstack/react-router'

import { LoadingScreen } from '@/components/LoadingScreen'
import { OnboardingPage } from '@/pages/onboarding/components/OnboardingPage'
import { needsOnboarding, userServices } from '@/services/userServices'

export const Route = createFileRoute('/onboarding')({
  beforeLoad: async () => {
    const user = await userServices.getCurrentUser()
    if (!user) {
      throw redirect({ to: '/login' })
    }
    if (user.role === 'recruiter') {
      throw redirect({ to: '/recruiter' })
    }
    if (!needsOnboarding(user)) {
      throw redirect({ to: '/dashboard' })
    }
    return { user }
  },
  pendingComponent: LoadingScreen,
  pendingMs: 0,
  component: OnboardingRoute,
})

function OnboardingRoute() {
  return <OnboardingPage />
}
