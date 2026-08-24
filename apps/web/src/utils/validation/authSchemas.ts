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

export const userRoles = ['professional', 'recruiter'] as const
export type UserRole = (typeof userRoles)[number]

export const signupSchema = z
  .object({
    username: z
      .string()
      .trim()
      .min(3, 'Username must be at least 3 characters')
      .max(30, 'Username must be at most 30 characters')
      .regex(/^[A-Za-z0-9]+$/, 'Use letters and numbers only')
      .transform((value) => value.toLowerCase()),
    email: emailSchema,
    role: z.enum(userRoles, { error: 'Choose professional or recruiter' }),
    password: passwordSchema,
    confirmPassword: confirmPasswordSchema,
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })

export type SignupFormValues = z.infer<typeof signupSchema>

export const loginIdentifierSchema = z
  .string()
  .trim()
  .min(1, 'Username or email is required')
  .superRefine((value, ctx) => {
    if (value.includes('@')) {
      if (!z.email().safeParse(value).success) {
        ctx.addIssue({
          code: 'custom',
          message: 'Enter a valid email',
        })
      }
      return
    }
    if (
      value.length < 3 ||
      value.length > 30 ||
      !/^[A-Za-z0-9]+$/.test(value)
    ) {
      ctx.addIssue({
        code: 'custom',
        message: 'Enter a username or email',
      })
    }
  })
  .transform((value) => (value.includes('@') ? value : value.toLowerCase()))

export const loginSchema = z.object({
  email: loginIdentifierSchema,
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
