import { Link } from '@tanstack/react-router'

import { Button } from '@/components/Button'
import { Input } from '@/components/Input'

import { useForgotPassword } from '../hooks/useForgotPassword'

export const ForgotPasswordForm = () => {
  const { register, errors, onSubmit, isLoading, isSuccess, errorMessage } =
    useForgotPassword()

  if (isSuccess) {
    return (
      <p className="text-sm text-muted-foreground">
        If that email is registered, we&apos;ve sent a link to reset your
        password.
      </p>
    )
  }

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
          htmlFor="forgot-email"
          className="mb-1.5 block text-sm text-muted-foreground"
        >
          Email
        </label>
        <Input
          id="forgot-email"
          placeholder="you@example.com"
          type="email"
          autoComplete="email"
          aria-invalid={Boolean(errors.email)}
          {...register('email')}
        />
        {errors.email ? (
          <p className="mt-1 text-sm text-destructive">{errors.email.message}</p>
        ) : null}
      </div>

      <Button type="submit" isLoading={isLoading}>
        Send reset link
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        <Link
          to="/login"
          className="text-foreground underline underline-offset-2"
        >
          Back to sign in
        </Link>
      </p>
    </form>
  )
}
