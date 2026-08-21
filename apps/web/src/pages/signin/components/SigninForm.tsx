import { Link } from '@tanstack/react-router'

import { Button } from '@/components/Button'
import { Input } from '@/components/Input'
import { PasswordInput } from '@/components/PasswordInput'
import { SocialIconButton } from '@/components/SocialIconButton'
import { GithubIcon, GoogleIcon } from '@/components/SocialIconButton/icons'
import { MailIcon } from '@/components/icons'

import { useSignin } from '../hooks/useSignin'

type SigninFormProps = {
  onSwitchToSignup: () => void
}

export const SigninForm = ({ onSwitchToSignup }: SigninFormProps) => {
  const { register, errors, onSubmit, isLoading, errorMessage } = useSignin()

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {errorMessage ? (
        <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {errorMessage}
        </p>
      ) : null}

      <div>
        <label className="mb-1.5 block text-sm text-muted-foreground">
          Email
        </label>
        <Input
          placeholder="you@example.com"
          type="email"
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
        <label className="mb-1.5 block text-sm text-muted-foreground">
          Password
        </label>
        <PasswordInput placeholder="••••••••" {...register('password')} />
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

      <Button type="submit" isLoading={isLoading}>
        Sign in
      </Button>

      <div className="flex items-center justify-center gap-3 pt-2">
        <SocialIconButton label="Sign in with Google" icon={<GoogleIcon />} />
        <SocialIconButton label="Sign in with GitHub" icon={<GithubIcon />} />
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
