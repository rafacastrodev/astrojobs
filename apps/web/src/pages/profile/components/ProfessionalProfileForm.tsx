import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from '@tanstack/react-router'
import { useForm } from 'react-hook-form'
import type { Resolver } from 'react-hook-form'

import { Button } from '@/components/Button'
import { Input } from '@/components/Input'
import { RegionSelect } from '@/components/RegionSelect'
import { currentUserKey } from '@/hooks/useCurrentUser'
import { userServices } from '@/services/userServices'
import { getApiErrorMessage } from '@/utils'
import type { ProfileFormValues } from '@/utils/validation/authSchemas'
import { parseSalaryUsd, profileSchema } from '@/utils/validation/authSchemas'

type ProfessionalProfileFormProps = {
  jobTitle?: string | null
  region?: string | null
  salaryMinUsd?: number | null
  salaryMaxUsd?: number | null
}

export const ProfessionalProfileForm = ({
  jobTitle,
  region,
  salaryMinUsd,
  salaryMaxUsd,
}: ProfessionalProfileFormProps) => {
  const router = useRouter()
  const queryClient = useQueryClient()
  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema) as Resolver<ProfileFormValues>,
    mode: 'onChange',
    defaultValues: {
      job_title: jobTitle ?? '',
      region: region ?? '',
      salary_min_usd: salaryMinUsd != null ? String(salaryMinUsd) : '',
      salary_max_usd: salaryMaxUsd != null ? String(salaryMaxUsd) : '',
    },
  })
  const mutation = useMutation({
    mutationFn: userServices.updateProfile,
    onSuccess: async (user) => {
      queryClient.setQueryData(currentUserKey, user)
      await router.invalidate()
    },
  })

  const { errors, isValid, isSubmitting } = form.formState

  return (
    <form
      className="grid gap-4 rounded-2xl border border-border bg-card p-6"
      onSubmit={form.handleSubmit(async (values) => {
        try {
          await mutation.mutateAsync({
            job_title: values.job_title || null,
            region: values.region || null,
            salary_min_usd: parseSalaryUsd(values.salary_min_usd),
            salary_max_usd: parseSalaryUsd(values.salary_max_usd),
          })
        } catch {
          return
        }
      })}
    >
      <h2 className="text-lg font-semibold text-card-foreground">
        Professional profile
      </h2>
      <div>
        <label
          htmlFor="profile-job-title"
          className="mb-1.5 block text-sm text-muted-foreground"
        >
          Job title
        </label>
        <Input
          id="profile-job-title"
          aria-invalid={Boolean(errors.job_title)}
          {...form.register('job_title')}
        />
        {errors.job_title ? (
          <p className="mt-1 text-sm text-destructive">
            {errors.job_title.message}
          </p>
        ) : null}
      </div>
      <div>
        <label
          htmlFor="profile-region"
          className="mb-1.5 block text-sm text-muted-foreground"
        >
          Region
        </label>
        <RegionSelect
          id="profile-region"
          aria-invalid={Boolean(errors.region)}
          {...form.register('region')}
        />
        {errors.region ? (
          <p className="mt-1 text-sm text-destructive">
            {errors.region.message}
          </p>
        ) : null}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label
            htmlFor="profile-salary-min"
            className="mb-1.5 block text-sm text-muted-foreground"
          >
            Salary min (USD)
          </label>
          <Input
            id="profile-salary-min"
            type="text"
            inputMode="numeric"
            aria-invalid={Boolean(errors.salary_min_usd)}
            {...form.register('salary_min_usd')}
          />
          {errors.salary_min_usd ? (
            <p className="mt-1 text-sm text-destructive">
              {errors.salary_min_usd.message}
            </p>
          ) : null}
        </div>
        <div>
          <label
            htmlFor="profile-salary-max"
            className="mb-1.5 block text-sm text-muted-foreground"
          >
            Salary max (USD)
          </label>
          <Input
            id="profile-salary-max"
            type="text"
            inputMode="numeric"
            aria-invalid={Boolean(errors.salary_max_usd)}
            {...form.register('salary_max_usd')}
          />
          {errors.salary_max_usd ? (
            <p className="mt-1 text-sm text-destructive">
              {errors.salary_max_usd.message}
            </p>
          ) : null}
        </div>
      </div>
      <div className="w-40">
        <Button
          type="submit"
          disabled={!isValid}
          isLoading={isSubmitting || mutation.isPending}
        >
          Save profile
        </Button>
      </div>
      {mutation.isError ? (
        <p role="alert" className="text-sm text-destructive">
          {getApiErrorMessage(mutation.error, 'Could not update your profile')}
        </p>
      ) : null}
      {mutation.isSuccess ? (
        <p className="text-sm text-muted-foreground">Profile saved.</p>
      ) : null}
    </form>
  )
}
