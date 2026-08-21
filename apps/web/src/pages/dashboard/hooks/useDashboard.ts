import { useMutation } from '@tanstack/react-query'
import { useRouter } from '@tanstack/react-router'

import { api } from '@/utils'

export const useDashboard = () => {
  const router = useRouter()

  const logout = useMutation({
    mutationFn: async () => {
      const response = await api.post<{ ok: boolean }>('/auth/logout')
      return response.data
    },
    onSuccess: () => {
      router.navigate({ to: '/login' })
    },
  })

  return {
    handleLogout: () => logout.mutate(),
    isLoggingOut: logout.isPending,
  }
}
