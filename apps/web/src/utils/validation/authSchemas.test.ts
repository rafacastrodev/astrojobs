import {
  emailSchema,
  loginSchema,
  passwordSchema,
  resetPasswordSchema,
  signupSchema,
} from './authSchemas'

describe('authentication schemas', () => {
  it('normalizes valid email addresses', () => {
    expect(emailSchema.parse('  person@example.com  ')).toBe(
      'person@example.com',
    )
  })

  it('rejects invalid email addresses', () => {
    expect(emailSchema.safeParse('person@').success).toBe(false)
  })

  it.each(['short', 'password', 'a'.repeat(73)])(
    'rejects invalid password: %s',
    (value) => {
      expect(passwordSchema.safeParse(value).success).toBe(false)
    },
  )

  it('accepts a password that meets length and number requirements', () => {
    expect(passwordSchema.safeParse('password1').success).toBe(true)
  })

  it('accepts valid login data', () => {
    expect(
      loginSchema.safeParse({ email: 'person@example.com', password: 'secret' })
        .success,
    ).toBe(true)
  })

  it.each([signupSchema, resetPasswordSchema])(
    'rejects different password confirmations',
    (schema) => {
      const result = schema.safeParse({
        name: 'Person',
        email: 'person@example.com',
        password: 'password1',
        confirmPassword: 'different123',
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues).toEqual(
          expect.arrayContaining([
            expect.objectContaining({ path: ['confirmPassword'] }),
          ]),
        )
      }
    },
  )
})
