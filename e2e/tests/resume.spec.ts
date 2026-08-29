import { fileURLToPath } from 'node:url'
import { expect, test } from '@playwright/test'

import { expectSignedIn, signUp, uniqueEmail } from './support/account'

const resumeFixture = fileURLToPath(new URL('./fixtures/resume.txt', import.meta.url))

test.describe('resumes', () => {
  test.beforeEach(async ({ page }) => {
    await signUp(page, uniqueEmail('resume'))
    await expectSignedIn(page)
  })

  test('starts with an empty state', async ({ page }) => {
    await expect(page.getByText('You have not uploaded a resume yet.')).toBeVisible()
  })

  test('uploads a resume and lists it', async ({ page }) => {
    await page.locator('input[type="file"]').setInputFiles(resumeFixture)

    const entry = page.getByRole('listitem').filter({ hasText: 'resume.txt' })
    await expect(entry).toBeVisible()
    await expect(entry).toContainText(/Awaiting indexing|Indexed/)
    await expect(page.getByText('You have not uploaded a resume yet.')).toBeHidden()
  })

  test('extracts the sections from the uploaded file', async ({ page }) => {
    await page.locator('input[type="file"]').setInputFiles(resumeFixture)
    await expect(page.getByRole('listitem').filter({ hasText: 'resume.txt' })).toBeVisible()

    const response = await page.request.get('/api/documents/resumes')
    expect(response.status()).toBe(200)

    const resumes = await response.json()
    expect(resumes).toHaveLength(1)

    const { payload } = resumes[0]
    expect(payload.schema_version).toBe(2)
    expect(payload.full_text).toContain('Backend engineer')
    expect(payload.summary).toBeTruthy()
    expect(payload.experiences.length).toBeGreaterThan(0)
    expect(payload.education.length).toBeGreaterThan(0)
    expect(payload.structure.has_experience).toBe(true)
    expect(payload.currently_employed).toBe(true)

    const entry = page.getByRole('listitem').filter({ hasText: 'resume.txt' })
    await entry.getByLabel('View details').click()
    await expect(entry.getByRole('heading', { name: 'Resume' })).toBeVisible()
    await expect(entry.getByRole('heading', { name: 'Suggestions' })).toBeVisible()
    await expect(entry.getByRole('heading', { name: 'Matching jobs' })).toBeVisible()
  })

  test('removes a resume', async ({ page }) => {
    await page.locator('input[type="file"]').setInputFiles(resumeFixture)

    const entry = page.getByRole('listitem').filter({ hasText: 'resume.txt' })
    await expect(entry).toBeVisible()

    await entry.getByLabel('Delete resume.txt').click()
    await page.getByRole('button', { name: 'Remove' }).click()
    await expect(page.getByText('You have not uploaded a resume yet.')).toBeVisible()
  })

  test('rejects an unsupported file type', async ({ page }) => {
    const response = await page.request.post('/api/documents/resumes', {
      multipart: {
        file: {
          name: 'payload.bin',
          mimeType: 'application/octet-stream',
          buffer: Buffer.from('not a resume'),
        },
      },
    })

    expect(response.status()).toBe(422)
    expect(await response.text()).toContain('Unsupported file type')
  })

  test('refuses resumes for anonymous callers', async ({ browser }) => {
    const context = await browser.newContext()
    const response = await context.request.get('/api/documents/resumes')
    expect(response.status()).toBe(401)
    await context.close()
  })
})
