import { useMutation } from '@tanstack/react-query'
import { useRouter } from '@tanstack/react-router'
import type { UseFormSetError } from 'react-hook-form'

import type { ApiError } from '#/utils/api/client'
import { apiClient } from '#/utils/api/client'
import type { LoginFormValues } from '#/utils/validation/authSchemas'

type User = { id: number; name: string; email: string; created_at: string }

export const useSignin = ({
  setError,
}: {
  setError: UseFormSetError<LoginFormValues>
}) => {
  const router = useRouter()

  return useMutation<User, ApiError, LoginFormValues>({
    mutationFn: (values) => apiClient.post<User>('/auth/login', values),
    onSuccess: () => {
      router.navigate({ to: '/dashboard' })
    },
    onError: (error) => {
      if (error.fieldErrors) {
        for (const [field, message] of Object.entries(error.fieldErrors)) {
          setError(field as keyof LoginFormValues, { message })
        }
      }
    },
  })
}
