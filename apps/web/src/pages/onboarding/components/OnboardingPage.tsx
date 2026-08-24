import { AuthLayout } from '@/components/AuthLayout'
import { Button } from '@/components/Button'
import { Input } from '@/components/Input'
import { RegionSelect } from '@/components/RegionSelect'

import { useOnboarding } from '../hooks/useOnboarding'

export const OnboardingPage = () => {
  const {
    register,
    errors,
    onSubmit,
    onSkip,
    isLoading,
    isSkipping,
    isValid,
    errorMessage,
  } = useOnboarding()

  return (
    <AuthLayout title="Tell us about your work">
      <form noValidate onSubmit={onSubmit} className="space-y-4">
        {errorMessage ? (
          <p
            role="alert"
            className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive"
          >
            {errorMessage}
          </p>
        ) : null}

        <div>
          <label
            htmlFor="onboarding-job-title"
            className="mb-1.5 block text-sm text-muted-foreground"
          >
            Job title
          </label>
          <Input
            id="onboarding-job-title"
            placeholder="Backend Engineer"
            aria-invalid={Boolean(errors.job_title)}
            {...register('job_title')}
          />
          {errors.job_title ? (
            <p className="mt-1 text-sm text-destructive">
              {errors.job_title.message}
            </p>
          ) : null}
        </div>

        <div>
          <label
            htmlFor="onboarding-region"
            className="mb-1.5 block text-sm text-muted-foreground"
          >
            Region
          </label>
          <RegionSelect
            id="onboarding-region"
            placeholder="LATAM"
            aria-invalid={Boolean(errors.region)}
            {...register('region')}
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
              htmlFor="onboarding-salary-min"
              className="mb-1.5 block text-sm text-muted-foreground"
            >
              Salary min (USD)
            </label>
            <Input
              id="onboarding-salary-min"
              type="text"
              inputMode="numeric"
              placeholder="Optional"
              aria-invalid={Boolean(errors.salary_min_usd)}
              {...register('salary_min_usd')}
            />
            {errors.salary_min_usd ? (
              <p className="mt-1 text-sm text-destructive">
                {errors.salary_min_usd.message}
              </p>
            ) : null}
          </div>
          <div>
            <label
              htmlFor="onboarding-salary-max"
              className="mb-1.5 block text-sm text-muted-foreground"
            >
              Salary max (USD)
            </label>
            <Input
              id="onboarding-salary-max"
              type="text"
              inputMode="numeric"
              placeholder="Optional"
              aria-invalid={Boolean(errors.salary_max_usd)}
              {...register('salary_max_usd')}
            />
            {errors.salary_max_usd ? (
              <p className="mt-1 text-sm text-destructive">
                {errors.salary_max_usd.message}
              </p>
            ) : null}
          </div>
        </div>

        <Button
          type="submit"
          isLoading={isLoading && !isSkipping}
          disabled={!isValid || isLoading}
        >
          Continue
        </Button>
        <button
          type="button"
          onClick={onSkip}
          disabled={isLoading}
          className="w-full cursor-pointer text-center text-sm text-muted-foreground underline underline-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSkipping ? 'Skipping…' : 'Skip for now'}
        </button>
      </form>
    </AuthLayout>
  )
}
