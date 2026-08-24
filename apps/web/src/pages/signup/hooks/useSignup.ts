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
import type { SignupFormValues } from '@/utils/validation/authSchemas'
import { signupSchema } from '@/utils/validation/authSchemas'

export const useSignup = () => {
  const router = useRouter()
  const form = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
    mode: 'onChange',
    defaultValues: {
      username: '',
      email: '',
      password: '',
      confirmPassword: '',
    },
  })

  const mutation = useMutation({
    mutationFn: userServices.signUp,
    onSuccess: () => {
      router.navigate({ to: '/dashboard' })
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
    password: form.watch('password'),
    confirmPassword: form.watch('confirmPassword'),
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
