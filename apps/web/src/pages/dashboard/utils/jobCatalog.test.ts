import type { JobMatch } from '../types'
import { OPEN_JOBS_PAGE_SIZE, pageJobs, sortOpenJobs } from './jobCatalog'

const job = (id: number, score: number, createdAt: string): JobMatch => ({
  id,
  title: `Job ${id}`,
  source_filename: `Job ${id}`,
  created_at: createdAt,
  score,
  payload: {},
})

describe('job catalog ordering', () => {
  const olderHighMatch = job(1, 0.9, '2026-08-20T12:00:00Z')
  const newerHighMatch = job(2, 0.9, '2026-08-24T12:00:00Z')
  const newestLowMatch = job(3, 0.2, '2026-08-25T12:00:00Z')

  it('orders by publication date when there is no resume', () => {
    expect(
      sortOpenJobs(
        [olderHighMatch, newerHighMatch, newestLowMatch],
        false,
      ).map((item) => item.id),
    ).toEqual([3, 2, 1])
  })

  it('prioritizes match and uses recency as the tie breaker with a resume', () => {
    expect(
      sortOpenJobs(
        [olderHighMatch, newerHighMatch, newestLowMatch],
        true,
      ).map((item) => item.id),
    ).toEqual([2, 1, 3])
  })

  it('returns five jobs per page', () => {
    const jobs = Array.from({ length: 12 }, (_, index) =>
      job(index + 1, 0, `2026-08-${String(index + 1).padStart(2, '0')}T12:00:00Z`),
    )

    expect(pageJobs(jobs, 0)).toHaveLength(OPEN_JOBS_PAGE_SIZE)
    expect(pageJobs(jobs, 1).map((item) => item.id)).toEqual([6, 7, 8, 9, 10])
    expect(pageJobs(jobs, 2).map((item) => item.id)).toEqual([11, 12])
  })
})
