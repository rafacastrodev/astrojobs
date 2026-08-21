import { Button } from '@/components/Button'
import { Input } from '@/components/Input'
import { PasswordInput } from '@/components/PasswordInput'
import { PasswordRequirements } from '@/components/PasswordRequirements'
import { SocialIconButton } from '@/components/SocialIconButton'
import { GoogleIcon } from '@/components/SocialIconButton/icons'
import { MailIcon, UserIcon } from '@/components/icons'
import { useSocialSignin } from '@/utils/auth/useSocialSignin'

import { useSignup } from '../hooks/useSignup'

type SignupFormProps = {
  onSwitchToSignin: () => void
}

export const SignupForm = ({ onSwitchToSignin }: SignupFormProps) => {
  const {
    register,
    password,
    confirmPassword,
    errors,
    onSubmit,
    isLoading,
    isValid,
    errorMessage,
  } = useSignup()
  const { signinWith, error: socialError } = useSocialSignin()

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

      <div>
        <label
          htmlFor="signup-name"
          className="mb-1.5 block text-sm text-muted-foreground"
        >
          Full name
        </label>
        <Input
          id="signup-name"
          placeholder="Jane Doe"
          autoComplete="name"
          aria-invalid={Boolean(errors.name)}
          icon={<UserIcon />}
          {...register('name')}
        />
        {errors.name ? (
          <p className="mt-1 text-sm text-destructive">{errors.name.message}</p>
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

      {socialError ? (
        <p
          role="alert"
          className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          {socialError}
        </p>
      ) : null}

      <div className="flex items-center justify-center gap-3 pt-2">
        <SocialIconButton
          label="Sign up with Google"
          icon={<GoogleIcon />}
          onClick={signinWith('Google')}
        />
      </div>

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
