import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { useRouter } from '@tanstack/react-router'
import { useForm } from 'react-hook-form'

import { userServices } from '@/services/userServices'
import {
  applyApiFieldErrors,
  getApiErrorMessage,
  hasApiFieldErrors,
} from '@/utils'
import type { LoginFormValues } from '@/utils/validation/authSchemas'
import { loginSchema } from '@/utils/validation/authSchemas'

export const useSignin = () => {
  const router = useRouter()
  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    mode: 'onChange',
    defaultValues: {
      email: '',
      password: '',
    },
  })

  const mutation = useMutation({
    mutationFn: userServices.signIn,
    onSuccess: (user) => {
      router.navigate({
        to: user.role === 'recruiter' ? '/recruiter' : '/dashboard',
      })
    },
    onError: (error) => {
      applyApiFieldErrors(error, form.setError)
    },
  })

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      await mutation.mutateAsync(values)
    } catch {
      return
    }
  })

  const { errors, isValid, isSubmitting } = form.formState

  return {
    register: form.register,
    errors,
    isValid,
    onSubmit,
    isLoading: isSubmitting || mutation.isPending,
    errorMessage:
      mutation.isError && !hasApiFieldErrors(mutation.error)
        ? getApiErrorMessage(mutation.error)
        : null,
  }
}
