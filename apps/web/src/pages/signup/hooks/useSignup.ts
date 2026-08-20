import { useMutation } from '@tanstack/react-query'
import { useRouter } from '@tanstack/react-router'
import type { UseFormSetError } from 'react-hook-form'

import type { ApiError } from '#/utils/api/client'
import { apiClient } from '#/utils/api/client'
import type { SignupFormValues } from '#/utils/validation/authSchemas'

type User = { id: number; name: string; email: string; created_at: string }

export const useSignup = ({
  setError,
}: {
  setError: UseFormSetError<SignupFormValues>
}) => {
  const router = useRouter()

  return useMutation<User, ApiError, SignupFormValues>({
    mutationFn: ({ confirmPassword: _confirmPassword, ...body }) =>
      apiClient.post<User>('/auth/signup', body),
    onSuccess: () => {
      router.navigate({ to: '/dashboard' })
    },
    onError: (error) => {
      if (error.fieldErrors) {
        for (const [field, message] of Object.entries(error.fieldErrors)) {
          setError(field as keyof SignupFormValues, { message })
        }
      }
    },
  })
}
