import { z } from 'zod'

export const emailSchema = z
  .string()
  .trim()
  .min(1, 'Email is required')
  .pipe(z.email('Enter a valid email'))

export const PASSWORD_MIN_LENGTH = 8
export const PASSWORD_MAX_LENGTH = 72

type PasswordRequirementInput = {
  password: string
  confirmPassword: string
}

export const passwordRequirements = [
  {
    id: 'min-length',
    label: `At least ${PASSWORD_MIN_LENGTH} characters in length`,
    test: ({ password }: PasswordRequirementInput) =>
      password.length >= PASSWORD_MIN_LENGTH,
  },
  {
    id: 'number',
    label: 'Numbers (0–9)',
    test: ({ password }: PasswordRequirementInput) => /[0-9]/.test(password),
  },
  {
    id: 'match',
    label: 'Passwords must match',
    test: ({ password, confirmPassword }: PasswordRequirementInput) =>
      password.length > 0 &&
      confirmPassword.length > 0 &&
      password === confirmPassword,
  },
] as const

export const passwordSchema = z
  .string()
  .max(
    PASSWORD_MAX_LENGTH,
    `Password must be at most ${PASSWORD_MAX_LENGTH} characters`,
  )
  .superRefine((password, ctx) => {
    for (const requirement of passwordRequirements) {
      if (requirement.id === 'match') {
        continue
      }
      if (!requirement.test({ password, confirmPassword: password })) {
        ctx.addIssue({
          code: 'custom',
          message: requirement.label,
        })
      }
    }
  })

const confirmPasswordSchema = z.string().min(1, 'Confirm your password')

export const signupSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, 'Name is required')
      .max(120, 'Name must be at most 120 characters'),
    email: emailSchema,
    password: passwordSchema,
    confirmPassword: confirmPasswordSchema,
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })

export type SignupFormValues = z.infer<typeof signupSchema>

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required'),
})

export type LoginFormValues = z.infer<typeof loginSchema>

export const forgotPasswordSchema = z.object({
  email: emailSchema,
})

export type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>

export const resetPasswordSchema = z
  .object({
    password: passwordSchema,
    confirmPassword: confirmPasswordSchema,
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })

export type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>
