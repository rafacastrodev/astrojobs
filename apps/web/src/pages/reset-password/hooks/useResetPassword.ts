import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { useRouter } from '@tanstack/react-router'
import { useForm } from 'react-hook-form'

import { userServices } from '@/services/userServices'
import { getApiErrorMessage } from '@/utils'
import type { ResetPasswordFormValues } from '@/utils/validation/authSchemas'
import { resetPasswordSchema } from '@/utils/validation/authSchemas'

export const useResetPassword = (token: string) => {
  const router = useRouter()
  const form = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      password: '',
      confirmPassword: '',
    },
  })

  const mutation = useMutation({
    mutationFn: (values: ResetPasswordFormValues) =>
      userServices.resetPassword(token, values),
    onSuccess: () => {
      router.navigate({ to: '/login' })
    },
  })

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      await mutation.mutateAsync(values)
    } catch {
      return
    }
  })

  return {
    register: form.register,
    password: form.watch('password'),
    confirmPassword: form.watch('confirmPassword'),
    errors: form.formState.errors,
    onSubmit,
    isLoading: form.formState.isSubmitting || mutation.isPending,
    errorMessage: mutation.isError ? getApiErrorMessage(mutation.error) : null,
  }
}
