import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'

import { userServices } from '@/services/userServices'
import { getApiErrorMessage } from '@/utils'
import type { ForgotPasswordFormValues } from '@/utils/validation/authSchemas'
import { forgotPasswordSchema } from '@/utils/validation/authSchemas'

export const useForgotPassword = () => {
  const form = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: '',
    },
  })

  const mutation = useMutation({
    mutationFn: userServices.forgotPassword,
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
    errors: form.formState.errors,
    onSubmit,
    isLoading: form.formState.isSubmitting || mutation.isPending,
    isSuccess: mutation.isSuccess,
    errorMessage: mutation.isError ? getApiErrorMessage(mutation.error) : null,
  }
}
