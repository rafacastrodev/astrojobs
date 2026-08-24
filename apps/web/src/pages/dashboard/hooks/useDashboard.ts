import { useMutation } from '@tanstack/react-query'

import { userServices } from '@/services/userServices'

export const useDashboard = () => {
  const logout = useMutation({
    mutationFn: userServices.signOut,
    onSuccess: () => {
      window.location.assign('/login?mode=signin')
    },
  })

  return {
    handleLogout: () => logout.mutate(),
    isLoggingOut: logout.isPending,
  }
}
