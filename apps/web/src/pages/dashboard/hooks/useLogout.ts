import { useMutation } from '@tanstack/react-query'
import { useRouter } from '@tanstack/react-router'

import { apiClient } from '#/utils/api/client'

export const useLogout = () => {
  const router = useRouter()

  return useMutation({
    mutationFn: () => apiClient.post<{ ok: boolean }>('/auth/logout'),
    onSuccess: () => {
      router.navigate({ to: '/login' })
    },
  })
}
