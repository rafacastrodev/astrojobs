import { useMutation } from '@tanstack/react-query'
import { useRouter } from '@tanstack/react-router'

import { apiClient } from '#/utils/api/client'
import type { ApiError } from '#/utils/api/client'
import type { ResetPasswordFormValues } from '#/utils/validation/authSchemas'

export const useResetPassword = (token: string) => {
  const router = useRouter()

  return useMutation<{ ok: boolean }, ApiError, ResetPasswordFormValues>({
    mutationFn: (values) => apiClient.post('/auth/reset-password', { token, new_password: values.password }),
    onSuccess: () => {
      router.navigate({ to: '/login' })
    },
  })
}
