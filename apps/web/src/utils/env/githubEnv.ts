export const REQUIRED_GITHUB_ENV = [
  'POSTGRES_USER',
  'POSTGRES_PASSWORD',
  'POSTGRES_DB',
  'JWT_SECRET',
  'FRONTEND_ORIGIN',
  'EC2_HOST',
  'EC2_USER',
  'EC2_SSH_KEY',
  'AWS_REGION',
  'AWS_S3_BUCKET',
] as const

export function missingGithubEnv(
  source: Record<string, string | undefined>,
): string[] {
  return REQUIRED_GITHUB_ENV.filter((key) => !source[key]?.trim())
}

export function assertGithubEnv(
  source: Record<string, string | undefined>,
): void {
  const missing = missingGithubEnv(source)
  if (missing.length > 0) {
    throw new Error(
      `Missing required GitHub Actions env: ${missing.join(', ')}`,
    )
  }
}
