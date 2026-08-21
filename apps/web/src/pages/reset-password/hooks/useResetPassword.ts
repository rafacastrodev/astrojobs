import { useMutation } from '@tanstack/react-query'
import { useRouter } from '@tanstack/react-router'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'

import { api, getApiErrorMessage } from '@/utils'
import { resetPasswordSchema } from '@/utils/validation/authSchemas'
import type { ResetPasswordFormValues } from '@/utils/validation/authSchemas'

export const useResetPassword = (token: string) => {
  const router = useRouter()
  const form = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
  })

  const mutation = useMutation({
    mutationFn: async (values: ResetPasswordFormValues) => {
      const response = await api.post<{ ok: boolean }>('/auth/reset-password', {
        token,
        new_password: values.password,
      })
      return response.data
    },
    onSuccess: () => {
      router.navigate({ to: '/login' })
    },
  })

  const onSubmit = form.handleSubmit((values) => mutation.mutate(values))

  return {
    register: form.register,
    errors: form.formState.errors,
    onSubmit,
    isLoading: form.formState.isSubmitting || mutation.isPending,
    errorMessage: mutation.isError ? getApiErrorMessage(mutation.error) : null,
  }
}
