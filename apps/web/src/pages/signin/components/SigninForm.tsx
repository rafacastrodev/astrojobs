import { Link } from '@tanstack/react-router'

import { Button } from '@/components/Button'
import { Input } from '@/components/Input'
import { PasswordInput } from '@/components/PasswordInput'
import { SocialIconButton } from '@/components/SocialIconButton'
import { GoogleIcon } from '@/components/SocialIconButton/icons'
import { MailIcon } from '@/components/icons'
import { useSocialSignin } from '@/utils/auth/useSocialSignin'

import { useSignin } from '../hooks/useSignin'

type SigninFormProps = {
  onSwitchToSignup: () => void
}

export const SigninForm = ({ onSwitchToSignup }: SigninFormProps) => {
  const { register, errors, onSubmit, isLoading, isValid, errorMessage } =
    useSignin()
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
          htmlFor="signin-email"
          className="mb-1.5 block text-sm text-muted-foreground"
        >
          Email
        </label>
        <Input
          id="signin-email"
          placeholder="you@example.com"
          type="email"
          autoComplete="email"
          aria-invalid={Boolean(errors.email)}
          icon={<MailIcon />}
          {...register('email')}
        />
        {errors.email ? (
          <p className="mt-1 text-sm text-destructive">{errors.email.message}</p>
        ) : null}
      </div>

      <div>
        <label
          htmlFor="signin-password"
          className="mb-1.5 block text-sm text-muted-foreground"
        >
          Password
        </label>
        <PasswordInput
          id="signin-password"
          placeholder="••••••••"
          autoComplete="current-password"
          aria-invalid={Boolean(errors.password)}
          {...register('password')}
        />
        {errors.password ? (
          <p className="mt-1 text-sm text-destructive">
            {errors.password.message}
          </p>
        ) : null}
      </div>

      <div className="text-right text-sm">
        <Link
          to="/forgot-password"
          className="text-muted-foreground hover:text-foreground"
        >
          Forgot password?
        </Link>
      </div>

      <Button type="submit" isLoading={isLoading} disabled={!isValid}>
        Sign in
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
          label="Sign in with Google"
          icon={<GoogleIcon />}
          onClick={signinWith('Google')}
        />
      </div>

      <p className="text-center text-sm text-muted-foreground">
        Don&apos;t have an account?{' '}
        <button
          type="button"
          onClick={onSwitchToSignup}
          className="text-foreground underline underline-offset-2 cursor-pointer"
        >
          Sign up
        </button>
      </p>
    </form>
  )
}
