import { useMutation } from '@tanstack/react-query'
import { useRouter } from '@tanstack/react-router'

import { userServices } from '@/services/userServices'

export const useDashboard = () => {
  const router = useRouter()

  const logout = useMutation({
    mutationFn: userServices.signOut,
    onSuccess: () => {
      router.navigate({ to: '/login' })
    },
  })

  return {
    handleLogout: () => logout.mutate(),
    isLoggingOut: logout.isPending,
  }
}
