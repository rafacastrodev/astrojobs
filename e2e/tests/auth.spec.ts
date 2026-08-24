import { expect, test } from '@playwright/test'

import {
  PASSWORD,
  expectSignedIn,
  logOut,
  signIn,
  signUp,
  uniqueEmail,
  uniqueUsername,
} from './support/account'

test.describe('authentication', () => {
  test('signs up, lands on the dashboard, logs out and back in', async ({ page }) => {
    const email = uniqueEmail('auth')

    await signUp(page, email)
    await expectSignedIn(page)

    await logOut(page)

    await signIn(page, email)
    await expectSignedIn(page)
  })

  test('signs in with username', async ({ page }) => {
    const email = uniqueEmail('userlogin')
    const username = uniqueUsername('userlogin')

    await signUp(page, email, username)
    await expectSignedIn(page, username)

    await logOut(page)

    await signIn(page, username)
    await expectSignedIn(page, username)
  })

  test('drops the session on logout', async ({ page }) => {
    const email = uniqueEmail('session')

    await signUp(page, email)
    await expectSignedIn(page)

    const authenticated = await page.request.get('/api/auth/me')
    expect(authenticated.status()).toBe(200)

    await logOut(page)

    const anonymous = await page.request.get('/api/auth/me')
    expect(anonymous.status()).toBe(401)
  })

  test('sends a signed-out visitor from the dashboard to the login page', async ({ page }) => {
    await page.goto('/dashboard')
    await expect(page).toHaveURL(/\/login/)
    await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible()
  })

  test('keeps a signed-in visitor away from the login page', async ({ page }) => {
    await signUp(page, uniqueEmail('guard'))
    await expectSignedIn(page)

    await page.goto('/login')
    await expect(page).toHaveURL(/\/dashboard/)
  })

  test('rejects a duplicate email', async ({ page }) => {
    const email = uniqueEmail('dup')

    await signUp(page, email)
    await expectSignedIn(page)
    await logOut(page)

    await signUp(page, email)
    await expect(page.getByRole('alert')).toContainText(
      'Could not create this account',
    )
    await expect(page).not.toHaveURL(/\/dashboard/)
  })

  test('rejects a wrong password', async ({ page }) => {
    const email = uniqueEmail('wrongpass')

    await signUp(page, email)
    await expectSignedIn(page)
    await logOut(page)

    await signIn(page, email, `${PASSWORD}-nope`)
    await expect(page.getByRole('alert')).toContainText('Invalid username or password')
    await expect(page).not.toHaveURL(/\/dashboard/)
  })

  test('keeps the sign up button disabled until the form is valid', async ({ page }) => {
    await page.goto('/login?mode=signup')
    await page.getByRole('heading', { name: 'Create an account' }).waitFor()

    const submit = page.getByRole('button', { name: 'Sign up' })
    await expect(submit).toBeDisabled()

    await page.locator('#signup-username').fill('e2erunner')
    await page.locator('#signup-email').fill(uniqueEmail('validation'))
    await page.locator('#signup-password').fill('short1')
    await page.locator('#signup-confirm-password').fill('short1')
    await expect(submit).toBeDisabled()

    await page.locator('#signup-password').fill(PASSWORD)
    await page.locator('#signup-confirm-password').fill(`${PASSWORD}-different`)
    await expect(submit).toBeDisabled()

    await page.locator('#signup-confirm-password').fill(PASSWORD)
    await expect(submit).toBeEnabled()
  })
})
