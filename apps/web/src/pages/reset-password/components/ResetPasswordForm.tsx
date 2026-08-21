import { Button } from '@/components/Button'
import { PasswordInput } from '@/components/PasswordInput'

import { useResetPassword } from '../hooks/useResetPassword'

export const ResetPasswordForm = ({ token }: { token: string }) => {
  const { register, errors, onSubmit, isLoading, errorMessage } = useResetPassword(token)

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {errorMessage ? (
        <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {errorMessage}
        </p>
      ) : null}

      <div>
        <label className="mb-1.5 block text-sm text-muted-foreground">New password</label>
        <PasswordInput placeholder="New password" {...register('password')} />
        {errors.password ? (
          <p className="mt-1 text-sm text-destructive">{errors.password.message}</p>
        ) : null}
      </div>

      <div>
        <label className="mb-1.5 block text-sm text-muted-foreground">Confirm new password</label>
        <PasswordInput placeholder="Confirm new password" {...register('confirmPassword')} />
        {errors.confirmPassword ? (
          <p className="mt-1 text-sm text-destructive">{errors.confirmPassword.message}</p>
        ) : null}
      </div>

      <Button type="submit" isLoading={isLoading}>
        Reset password
      </Button>
    </form>
  )
}
