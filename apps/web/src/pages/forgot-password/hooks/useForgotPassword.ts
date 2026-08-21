import { useMutation } from '@tanstack/react-query'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'

import { api, getApiErrorMessage } from '@/utils'
import { forgotPasswordSchema } from '@/utils/validation/authSchemas'
import type { ForgotPasswordFormValues } from '@/utils/validation/authSchemas'

export const useForgotPassword = () => {
  const form = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
  })

  const mutation = useMutation({
    mutationFn: async (values: ForgotPasswordFormValues) => {
      const response = await api.post<{ ok: boolean }>('/auth/forgot-password', values)
      return response.data
    },
  })

  const onSubmit = form.handleSubmit((values) => mutation.mutate(values))

  return {
    register: form.register,
    errors: form.formState.errors,
    onSubmit,
    isLoading: form.formState.isSubmitting || mutation.isPending,
    isSuccess: mutation.isSuccess,
    errorMessage: mutation.isError ? getApiErrorMessage(mutation.error) : null,
  }
}
