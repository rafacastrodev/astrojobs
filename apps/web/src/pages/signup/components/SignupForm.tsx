import { Button } from '@/components/Button'
import { Input } from '@/components/Input'
import { PasswordInput } from '@/components/PasswordInput'
import { PasswordRequirements } from '@/components/PasswordRequirements'
import { MailIcon, UserIcon } from '@/components/icons'

import { useSignup } from '../hooks/useSignup'

const ACCOUNT_TYPES = [
  {
    value: 'professional' as const,
    label: 'Professional',
    hint: 'Upload a resume and find jobs',
  },
  {
    value: 'recruiter' as const,
    label: 'Recruiter',
    hint: 'Post jobs and review talent',
  },
]

type SignupFormProps = {
  onSwitchToSignin: () => void
}

export const SignupForm = ({ onSwitchToSignin }: SignupFormProps) => {
  const {
    register,
    setValue,
    role,
    password,
    confirmPassword,
    errors,
    onSubmit,
    isLoading,
    isValid,
    errorMessage,
  } = useSignup()

  return (
    <form noValidate onSubmit={onSubmit} className="space-y-4">
      {errorMessage ? (
        <p
          role="alert"
          className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          {errorMessage}
        </p>
      ) : null}

      <fieldset>
        <legend className="mb-1.5 block text-sm text-muted-foreground">
          I am a
        </legend>
        <div className="grid grid-cols-2 gap-2">
          {ACCOUNT_TYPES.map((account) => {
            const selected = role === account.value
            return (
              <button
                key={account.value}
                type="button"
                onClick={() =>
                  setValue('role', account.value, {
                    shouldValidate: true,
                    shouldDirty: true,
                  })
                }
                aria-pressed={selected}
                className={`rounded-xl border px-3 py-3 text-left transition ${
                  selected
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-border bg-input text-card-foreground hover:border-ring'
                }`}
              >
                <span className="block text-sm font-medium">{account.label}</span>
                <span
                  className={`mt-1 block text-xs ${
                    selected ? 'text-primary-foreground/80' : 'text-muted-foreground'
                  }`}
                >
                  {account.hint}
                </span>
              </button>
            )
          })}
        </div>
        {errors.role ? (
          <p className="mt-1 text-sm text-destructive">{errors.role.message}</p>
        ) : null}
      </fieldset>

      <div>
        <label
          htmlFor="signup-username"
          className="mb-1.5 block text-sm text-muted-foreground"
        >
          Username
        </label>
        <Input
          id="signup-username"
          placeholder="janedoe"
          autoComplete="username"
          aria-invalid={Boolean(errors.username)}
          icon={<UserIcon />}
          {...register('username')}
        />
        {errors.username ? (
          <p className="mt-1 text-sm text-destructive">
            {errors.username.message}
          </p>
        ) : null}
      </div>

      <div>
        <label
          htmlFor="signup-email"
          className="mb-1.5 block text-sm text-muted-foreground"
        >
          Email
        </label>
        <Input
          id="signup-email"
          placeholder="you@example.com"
          type="email"
          autoComplete="email"
          aria-invalid={Boolean(errors.email)}
          icon={<MailIcon />}
          {...register('email')}
        />
        {errors.email ? (
          <p className="mt-1 text-sm text-destructive">
            {errors.email.message}
          </p>
        ) : null}
      </div>

      <div>
        <label
          htmlFor="signup-password"
          className="mb-1.5 block text-sm text-muted-foreground"
        >
          Password
        </label>
        <PasswordInput
          id="signup-password"
          placeholder="••••••••"
          autoComplete="new-password"
          aria-invalid={Boolean(errors.password)}
          aria-describedby="signup-password-requirements"
          {...register('password')}
        />
        <PasswordRequirements
          id="signup-password-requirements"
          password={password}
          confirmPassword={confirmPassword}
        />
      </div>

      <div>
        <label
          htmlFor="signup-confirm-password"
          className="mb-1.5 block text-sm text-muted-foreground"
        >
          Confirm password
        </label>
        <PasswordInput
          id="signup-confirm-password"
          placeholder="••••••••"
          autoComplete="new-password"
          aria-invalid={Boolean(errors.confirmPassword)}
          {...register('confirmPassword')}
        />
        {errors.confirmPassword ? (
          <p className="mt-1 text-sm text-destructive">
            {errors.confirmPassword.message}
          </p>
        ) : null}
      </div>

      <p className="text-center text-xs text-muted-foreground">
        By creating an account, you agree with our Terms of Service
      </p>

      <Button type="submit" isLoading={isLoading} disabled={!isValid}>
        Sign up
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{' '}
        <button
          type="button"
          onClick={onSwitchToSignin}
          className="text-foreground underline underline-offset-2 cursor-pointer"
        >
          Log in
        </button>
      </p>
    </form>
  )
}
