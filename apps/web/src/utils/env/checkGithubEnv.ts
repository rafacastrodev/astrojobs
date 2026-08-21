import { assertGithubEnv } from './githubEnv.ts'

try {
  assertGithubEnv(process.env)
} catch (error) {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
}
