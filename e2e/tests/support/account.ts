import type { Page } from '@playwright/test'
import { expect } from '@playwright/test'

export const PASSWORD = 'Password123'
const signedInNames = new WeakMap<Page, string>()

export function uniqueEmail(prefix = 'e2e'): string {
  const stamp = `${Date.now()}${Math.floor(Math.random() * 1000)}`
  return `${prefix}.${stamp}@example.com`
}

export function uniqueUsername(prefix = 'e2e'): string {
  return `${prefix}${Date.now()}${Math.floor(Math.random() * 1000)}`.slice(0, 30)
}

export async function signUp(
  page: Page,
  email: string,
  name?: string,
  expectSuccess = true,
) {
  const username = name ?? uniqueUsername('e2e')
  signedInNames.set(page, username)
  const testIp = Array.from(email).reduce(
    (total, character) => (total + character.charCodeAt(0)) % 65000,
    1,
  )
  await page.context().setExtraHTTPHeaders({
    'x-forwarded-for': `198.18.${Math.floor(testIp / 255)}.${testIp % 255}`,
  })
  await page.goto('/login?mode=signup')
  await page.getByRole('heading', { name: 'Create an account' }).waitFor()

  await page.locator('#signup-username').fill(username)
  await page.locator('#signup-email').fill(email)
  await page.locator('#signup-password').fill(PASSWORD)
  await page.locator('#signup-confirm-password').fill(PASSWORD)

  const submit = page.getByRole('button', { name: 'Sign up' })
  await expect(submit).toBeEnabled()
  await submit.click()
  if (!expectSuccess) return
  await page.waitForURL(/\/(onboarding|dashboard)/)
  if (new URL(page.url()).pathname === '/onboarding') {
    await page.getByRole('button', { name: 'Skip for now' }).click()
    await page.waitForURL(/\/dashboard/)
  }
}

export async function signIn(page: Page, email: string, password = PASSWORD) {
  await page.goto('/login')
  await page.getByRole('heading', { name: 'Welcome back' }).waitFor()

  await page.locator('#signin-email').fill(email)
  await page.locator('#signin-password').fill(password)

  const submit = page.getByRole('button', { name: 'Sign in' })
  await expect(submit).toBeEnabled()
  await submit.click()
}

export async function expectSignedIn(page: Page, name?: string) {
  const expectedName = name ?? signedInNames.get(page) ?? 'e2erunner'
  await expect(page).toHaveURL(/\/dashboard/)
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible()
  await expect(
    page.getByRole('link', { name: `Open profile, ${expectedName}` }),
  ).toBeVisible()
}

export async function logOut(page: Page) {
  await page.getByRole('button', { name: 'Log out' }).click()
  await expect(page).toHaveURL(/\/login/)
}
