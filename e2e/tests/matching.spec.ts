import { fileURLToPath } from 'node:url'
import { expect, test } from '@playwright/test'

import { expectSignedIn, signUp, uniqueEmail } from './support/account'

const resumeFixture = fileURLToPath(new URL('./fixtures/resume.txt', import.meta.url))

test.describe('job matching', () => {
  test('ranks the job catalogue against an uploaded resume', async ({ page }) => {
    await signUp(page, uniqueEmail('match'))
    await expectSignedIn(page)

    await page.locator('input[type="file"]').setInputFiles(resumeFixture)
    await expect(page.getByRole('listitem').filter({ hasText: 'resume.txt' })).toBeVisible()

    const resumes = await (await page.request.get('/api/documents/resumes')).json()
    const resumeId = resumes[0].id

    const catalogue = await (await page.request.get('/api/documents/jobs')).json()
    test.skip(catalogue.length === 0, 'the job catalogue is empty on this environment')

    const response = await page.request.get(`/api/documents/resumes/${resumeId}/matches?top_k=5`)
    expect(response.status()).toBe(200)

    const matches = await response.json()
    expect(matches.length).toBeGreaterThan(0)
    expect(matches.length).toBeLessThanOrEqual(catalogue.length)

    for (const match of matches) {
      expect(typeof match.score).toBe('number')
      expect(match.score).toBeGreaterThan(0)
      expect(match.title).toBeTruthy()
    }

    const scores = matches.map((match: { score: number }) => match.score)
    expect(scores).toEqual([...scores].sort((a: number, b: number) => b - a))

    const entry = page.getByRole('listitem').filter({ hasText: 'resume.txt' })
    await entry.getByLabel('View details').click()
    await expect(page.getByText(matches[0].title)).toBeVisible()
    await expect(page.getByRole('button', { name: 'Detailed analysis' }).first()).toBeVisible()
  })

  test('honours top_k', async ({ page }) => {
    await signUp(page, uniqueEmail('topk'))
    await expectSignedIn(page)

    await page.locator('input[type="file"]').setInputFiles(resumeFixture)
    await expect(page.getByRole('listitem').filter({ hasText: 'resume.txt' })).toBeVisible()

    const resumes = await (await page.request.get('/api/documents/resumes')).json()
    const resumeId = resumes[0].id

    const catalogue = await (await page.request.get('/api/documents/jobs')).json()
    test.skip(catalogue.length < 2, 'needs at least two catalogue jobs')

    const response = await page.request.get(`/api/documents/resumes/${resumeId}/matches?top_k=1`)
    expect(response.status()).toBe(200)
    expect(await response.json()).toHaveLength(1)
  })

  test('hides another user resume behind a 404', async ({ page, browser }) => {
    await signUp(page, uniqueEmail('owner'))
    await expectSignedIn(page)
    await page.locator('input[type="file"]').setInputFiles(resumeFixture)
    await expect(page.getByRole('listitem').filter({ hasText: 'resume.txt' })).toBeVisible()

    const resumes = await (await page.request.get('/api/documents/resumes')).json()
    const resumeId = resumes[0].id

    const context = await browser.newContext()
    const intruder = await context.newPage()
    await signUp(intruder, uniqueEmail('intruder'))
    await expectSignedIn(intruder)

    const response = await intruder.request.get(`/api/documents/resumes/${resumeId}/matches`)
    expect(response.status()).toBe(404)

    await context.close()
  })

  test('refuses matches for anonymous callers', async ({ browser }) => {
    const context = await browser.newContext()
    const response = await context.request.get('/api/documents/resumes/1/matches')
    expect(response.status()).toBe(401)
    await context.close()
  })
})
