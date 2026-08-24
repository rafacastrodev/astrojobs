import type { RecruiterMatch } from '../types'
import {
  pageRecruiterMatches,
  rankMatchesForJob,
  RECRUITER_MATCHES_PAGE_SIZE,
} from './recruiterMatches'

const match = (
  id: number,
  score: number,
  createdAt: string,
  jobId = 10,
): RecruiterMatch => ({
  id,
  created_at: createdAt,
  professional_name: `Professional ${id}`,
  professional_email: `professional-${id}@example.com`,
  source_filename: `resume-${id}.pdf`,
  score,
  matched_technologies: [],
  matched_jobs: [{ id: jobId, title: 'Backend', score }],
  payload: {},
  summary: null,
  applied_job_ids: [],
  offered_job_ids: [],
})

describe('recruiter match ordering', () => {
  it('ranks candidates for the selected role by match then resume recency', () => {
    const olderHigh = match(1, 0.8, '2026-08-20T12:00:00Z')
    const newerHigh = match(2, 0.8, '2026-08-24T12:00:00Z')
    const newestLow = match(3, 0.4, '2026-08-25T12:00:00Z')

    expect(
      rankMatchesForJob([olderHigh, newestLow, newerHigh], 10).map(
        (item) => item.id,
      ),
    ).toEqual([2, 1, 3])
  })

  it('only includes candidates matched to the selected role', () => {
    expect(
      rankMatchesForJob(
        [match(1, 0.8, '2026-08-20', 10), match(2, 0.9, '2026-08-21', 20)],
        20,
      ).map((item) => item.id),
    ).toEqual([2])
  })

  it('returns five candidates per page', () => {
    const matches = Array.from({ length: 12 }, (_, index) =>
      match(
        index + 1,
        1 - index / 20,
        `2026-08-${String(index + 1).padStart(2, '0')}`,
      ),
    )

    expect(pageRecruiterMatches(matches, 0)).toHaveLength(
      RECRUITER_MATCHES_PAGE_SIZE,
    )
    expect(pageRecruiterMatches(matches, 2).map((item) => item.id)).toEqual([
      11, 12,
    ])
  })
})
