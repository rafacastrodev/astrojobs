import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from '@tanstack/react-router'
import { useForm } from 'react-hook-form'

import { currentUserKey } from '@/hooks/useCurrentUser'
import { postAuthPath, userServices } from '@/services/userServices'
import {
  applyApiFieldErrors,
  getApiErrorMessage,
  hasApiFieldErrors,
} from '@/utils'
import type { SignupFormValues } from '@/utils/validation/authSchemas'
import { signupSchema } from '@/utils/validation/authSchemas'

export const useSignup = () => {
  const router = useRouter()
  const queryClient = useQueryClient()
  const form = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
    mode: 'onChange',
    defaultValues: {
      username: '',
      email: '',
      role: 'professional',
      password: '',
      confirmPassword: '',
    },
  })

  const mutation = useMutation({
    mutationFn: userServices.signUp,
    onSuccess: (user) => {
      queryClient.setQueryData(currentUserKey, user)
      router.navigate({
        to: postAuthPath(user),
        replace: true,
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
    setValue: form.setValue,
    role: form.watch('role'),
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
