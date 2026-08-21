import { Button } from '@/components/Button'
import { Input } from '@/components/Input'
import { PasswordInput } from '@/components/PasswordInput'
import { SocialIconButton } from '@/components/SocialIconButton'
import { GithubIcon, GoogleIcon } from '@/components/SocialIconButton/icons'
import { MailIcon, UserIcon } from '@/components/icons'

import { useSignup } from '../hooks/useSignup'

type SignupFormProps = {
  onSwitchToSignin: () => void
}

export const SignupForm = ({ onSwitchToSignin }: SignupFormProps) => {
  const { register, errors, onSubmit, isLoading, errorMessage } = useSignup()

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {errorMessage ? (
        <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {errorMessage}
        </p>
      ) : null}

      <div>
        <label className="mb-1.5 block text-sm text-muted-foreground">
          Full name
        </label>
        <Input
          placeholder="Jane Doe"
          icon={<UserIcon />}
          {...register('name')}
        />
        {errors.name ? (
          <p className="mt-1 text-sm text-destructive">{errors.name.message}</p>
        ) : null}
      </div>

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

      <div>
        <label className="mb-1.5 block text-sm text-muted-foreground">
          Confirm password
        </label>
        <PasswordInput
          placeholder="••••••••"
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

      <Button type="submit" isLoading={isLoading}>
        Sign up
      </Button>

      <div className="flex items-center justify-center gap-3 pt-2">
        <SocialIconButton label="Sign up with Google" icon={<GoogleIcon />} />
        <SocialIconButton label="Sign up with GitHub" icon={<GithubIcon />} />
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
