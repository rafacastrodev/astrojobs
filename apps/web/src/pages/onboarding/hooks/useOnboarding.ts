import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from '@tanstack/react-router'
import { useForm } from 'react-hook-form'
import type { Resolver } from 'react-hook-form'

import { currentUserKey } from '@/hooks/useCurrentUser'
import { userServices } from '@/services/userServices'
import { getApiErrorMessage } from '@/utils'
import type { OnboardingFormValues } from '@/utils/validation/authSchemas'
import { onboardingSchema, parseSalaryUsd } from '@/utils/validation/authSchemas'

export const useOnboarding = () => {
  const router = useRouter()
  const queryClient = useQueryClient()
  const form = useForm<OnboardingFormValues>({
    resolver: zodResolver(onboardingSchema) as Resolver<OnboardingFormValues>,
    mode: 'onChange',
    defaultValues: {
      job_title: '',
      region: '',
      salary_min_usd: '',
      salary_max_usd: '',
    },
  })

  const goToDashboard = (user: Awaited<ReturnType<typeof userServices.updateProfile>>) => {
    queryClient.setQueryData(currentUserKey, user)
    router.navigate({ to: '/dashboard', replace: true })
  }

  const complete = useMutation({
    mutationFn: userServices.updateProfile,
    onSuccess: goToDashboard,
  })

  const skip = useMutation({
    mutationFn: () =>
      userServices.updateProfile({ onboarding_status: 'skipped' }),
    onSuccess: goToDashboard,
  })

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      await complete.mutateAsync({
        job_title: values.job_title || null,
        region: values.region || null,
        salary_min_usd: parseSalaryUsd(values.salary_min_usd),
        salary_max_usd: parseSalaryUsd(values.salary_max_usd),
        onboarding_status: 'completed',
      })
    } catch {
      return
    }
  })

  const { errors, isValid, isSubmitting } = form.formState
  const isBusy = isSubmitting || complete.isPending || skip.isPending

  return {
    register: form.register,
    errors,
    isValid,
    onSubmit,
    onSkip: () => skip.mutate(),
    isLoading: isBusy,
    isSkipping: skip.isPending,
    errorMessage: complete.isError
      ? getApiErrorMessage(complete.error, 'Could not save your profile')
      : skip.isError
        ? getApiErrorMessage(skip.error, 'Could not skip onboarding')
        : null,
  }
}
