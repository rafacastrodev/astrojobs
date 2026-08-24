import { hashPassword } from './password'

describe('hashPassword', () => {
  it('returns the SHA-256 hex digest of the password', async () => {
    await expect(hashPassword('password1')).resolves.toBe(
      '0b14d501a594442a01c6859541bcb3e8164d183d32937b851835442f69d5c94e',
    )
  })

  it('produces a different digest for a different password', async () => {
    const [first, second] = await Promise.all([
      hashPassword('password1'),
      hashPassword('password2'),
    ])

    expect(first).not.toBe(second)
    expect(first).toHaveLength(64)
    expect(second).toHaveLength(64)
  })
})
