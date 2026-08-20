import { Link } from '@tanstack/react-router'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'

import { Button } from '#/components/Button'
import { Input } from '#/components/Input'
import { forgotPasswordSchema } from '#/utils/validation/authSchemas'
import type { ForgotPasswordFormValues } from '#/utils/validation/authSchemas'
import { useForgotPassword } from '../hooks/useForgotPassword'

export const ForgotPasswordForm = () => {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordFormValues>({ resolver: zodResolver(forgotPasswordSchema) })

  const forgotPassword = useForgotPassword()

  if (forgotPassword.isSuccess) {
    return (
      <p className="text-sm text-muted-foreground">
        If that email is registered, we&apos;ve sent a link to reset your password.
      </p>
    )
  }

  return (
    <form onSubmit={handleSubmit((values) => forgotPassword.mutate(values))} className="space-y-4">
      {forgotPassword.isError ? (
        <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {forgotPassword.error.message}
        </p>
      ) : null}

      <div>
        <Input placeholder="Email" type="email" {...register('email')} />
        {errors.email ? <p className="mt-1 text-sm text-destructive">{errors.email.message}</p> : null}
      </div>

      <Button type="submit" isLoading={isSubmitting || forgotPassword.isPending}>
        Send reset link
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        <Link to="/login" className="text-foreground underline underline-offset-2">
          Back to sign in
        </Link>
      </p>
    </form>
  )
}
