import type { Page } from '@playwright/test'
import { expect } from '@playwright/test'

export const PASSWORD = 'Password123'

export function uniqueEmail(prefix = 'e2e'): string {
  const stamp = `${Date.now()}${Math.floor(Math.random() * 1000)}`
  return `${prefix}.${stamp}@example.com`
}

export async function signUp(page: Page, email: string, name = 'E2E Runner') {
  await page.goto('/login?mode=signup')
  await page.getByRole('heading', { name: 'Create an account' }).waitFor()

  await page.locator('#signup-name').fill(name)
  await page.locator('#signup-email').fill(email)
  await page.locator('#signup-password').fill(PASSWORD)
  await page.locator('#signup-confirm-password').fill(PASSWORD)

  const submit = page.getByRole('button', { name: 'Sign up' })
  await expect(submit).toBeEnabled()
  await submit.click()
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

export async function expectSignedIn(page: Page, name = 'E2E Runner') {
  await expect(page).toHaveURL(/\/dashboard/)
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible()
  await expect(page.getByText(`Signed in as ${name}`)).toBeVisible()
}

export async function logOut(page: Page) {
  await page.getByRole('button', { name: 'Log out' }).click()
  await expect(page).toHaveURL(/\/login/)
}
