import { useMutation } from '@tanstack/react-query'

import { apiClient } from '#/utils/api/client'
import type { ApiError } from '#/utils/api/client'
import type { ForgotPasswordFormValues } from '#/utils/validation/authSchemas'

export const useForgotPassword = () => {
  return useMutation<{ ok: boolean }, ApiError, ForgotPasswordFormValues>({
    mutationFn: (values) => apiClient.post<{ ok: boolean }>('/auth/forgot-password', values),
  })
}
