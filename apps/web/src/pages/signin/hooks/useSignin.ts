import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { useRouter } from '@tanstack/react-router'
import { useForm } from 'react-hook-form'

import {
  api,
  applyApiFieldErrors,
  getApiErrorMessage,
  hasApiFieldErrors,
} from '@/utils'
import type { LoginFormValues } from '@/utils/validation/authSchemas'
import { loginSchema } from '@/utils/validation/authSchemas'

type User = {
  id: number
  name: string
  email: string
  role: 'user' | 'admin'
  created_at: string
}

export const useSignin = () => {
  const router = useRouter()
  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  })

  const mutation = useMutation({
    mutationFn: async (values: LoginFormValues) => {
      const response = await api.post<User>('/auth/login', values)
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
