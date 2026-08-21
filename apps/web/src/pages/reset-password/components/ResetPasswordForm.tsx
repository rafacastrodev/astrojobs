import { Button } from '@/components/Button'
import { PasswordInput } from '@/components/PasswordInput'
import { PasswordRequirements } from '@/components/PasswordRequirements'

import { useResetPassword } from '../hooks/useResetPassword'

export const ResetPasswordForm = ({ token }: { token: string }) => {
  const {
    register,
    password,
    confirmPassword,
    errors,
    onSubmit,
    isLoading,
    errorMessage,
  } = useResetPassword(token)

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
          htmlFor="reset-password"
          className="mb-1.5 block text-sm text-muted-foreground"
        >
          New password
        </label>
        <PasswordInput
          id="reset-password"
          placeholder="New password"
          autoComplete="new-password"
          aria-invalid={Boolean(errors.password)}
          aria-describedby="reset-password-requirements"
          {...register('password')}
        />
        <PasswordRequirements
          id="reset-password-requirements"
          password={password}
          confirmPassword={confirmPassword}
        />
      </div>

      <div>
        <label
          htmlFor="reset-confirm-password"
          className="mb-1.5 block text-sm text-muted-foreground"
        >
          Confirm new password
        </label>
        <PasswordInput
          id="reset-confirm-password"
          placeholder="Confirm new password"
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

      <Button type="submit" isLoading={isLoading}>
        Reset password
      </Button>
    </form>
  )
}
