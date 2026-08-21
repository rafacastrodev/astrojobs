import { assertGithubEnv, missingGithubEnv } from './githubEnv'

describe('githubEnv', () => {
  const complete = {
    POSTGRES_USER: 'postgres',
    POSTGRES_PASSWORD: 'secret',
    POSTGRES_DB: 'astrojobs',
    JWT_SECRET: 'jwt',
    FRONTEND_ORIGIN: 'https://astrojobs.example',
    EC2_HOST: '1.2.3.4',
    EC2_USER: 'ubuntu',
    EC2_SSH_KEY: '-----BEGIN KEY-----',
    AWS_REGION: 'us-east-1',
    AWS_S3_BUCKET: 'astrojobs-resumes',
  }

  it('returns no missing keys when every required env is set', () => {
    expect(missingGithubEnv(complete)).toEqual([])
    expect(() => assertGithubEnv(complete)).not.toThrow()
  })

  it('treats blank values as missing', () => {
    expect(
      missingGithubEnv({ ...complete, JWT_SECRET: '  ', EC2_HOST: '' }),
    ).toEqual(['JWT_SECRET', 'EC2_HOST'])
  })

  it('throws with the names of missing GitHub env vars', () => {
    expect(() =>
      assertGithubEnv({ ...complete, POSTGRES_USER: undefined }),
    ).toThrow('Missing required GitHub Actions env: POSTGRES_USER')
  })
})
