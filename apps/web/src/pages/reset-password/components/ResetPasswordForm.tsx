import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'

import { Button } from '#/components/Button'
import { PasswordInput } from '#/components/PasswordInput'
import { resetPasswordSchema } from '#/utils/validation/authSchemas'
import type { ResetPasswordFormValues } from '#/utils/validation/authSchemas'
import { useResetPassword } from '../hooks/useResetPassword'

export const ResetPasswordForm = ({ token }: { token: string }) => {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordFormValues>({ resolver: zodResolver(resetPasswordSchema) })

  const resetPassword = useResetPassword(token)

  return (
    <form onSubmit={handleSubmit((values) => resetPassword.mutate(values))} className="space-y-4">
      {resetPassword.isError ? (
        <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{resetPassword.error.message}</p>
      ) : null}

      <div>
        <label className="mb-1.5 block text-sm text-muted-foreground">New password</label>
        <PasswordInput placeholder="New password" {...register('password')} />
        {errors.password ? <p className="mt-1 text-sm text-destructive">{errors.password.message}</p> : null}
      </div>

      <div>
        <label className="mb-1.5 block text-sm text-muted-foreground">Confirm new password</label>
        <PasswordInput placeholder="Confirm new password" {...register('confirmPassword')} />
        {errors.confirmPassword ? (
          <p className="mt-1 text-sm text-destructive">{errors.confirmPassword.message}</p>
        ) : null}
      </div>

      <Button type="submit" isLoading={isSubmitting || resetPassword.isPending}>
        Reset password
      </Button>
    </form>
  )
}
