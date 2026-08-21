import { useMutation } from '@tanstack/react-query'
import { useRouter } from '@tanstack/react-router'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'

import {
  api,
  applyApiFieldErrors,
  getApiErrorMessage,
  hasApiFieldErrors,
} from '@/utils'
import { signupSchema } from '@/utils/validation/authSchemas'
import type { SignupFormValues } from '@/utils/validation/authSchemas'

type User = {
  id: number
  name: string
  email: string
  role: 'user' | 'admin'
  created_at: string
}

export const useSignup = () => {
  const router = useRouter()
  const form = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
  })

  const mutation = useMutation({
    mutationFn: async ({
      confirmPassword: _confirmPassword,
      ...body
    }: SignupFormValues) => {
      const response = await api.post<User>('/auth/signup', body)
      return response.data
    },
    onSuccess: () => {
      router.navigate({ to: '/dashboard' })
    },
    onError: (error) => {
      applyApiFieldErrors(error, form.setError)
    },
  })

  const onSubmit = form.handleSubmit((values) => mutation.mutate(values))

  return {
    register: form.register,
    errors: form.formState.errors,
    onSubmit,
    isLoading: form.formState.isSubmitting || mutation.isPending,
    errorMessage:
      mutation.isError && !hasApiFieldErrors(mutation.error)
        ? getApiErrorMessage(mutation.error)
        : null,
  }
}
