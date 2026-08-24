import type { RecruiterMatch } from '../types'

export const RECRUITER_MATCHES_PAGE_SIZE = 5

export const scoreForJob = (match: RecruiterMatch, jobId: number) =>
  match.matched_jobs.find((job) => job.id === jobId)?.score ?? 0

export const rankMatchesForJob = (matches: RecruiterMatch[], jobId: number) =>
  matches
    .filter((match) => match.matched_jobs.some((job) => job.id === jobId))
    .slice()
    .sort(
      (left, right) =>
        scoreForJob(right, jobId) - scoreForJob(left, jobId) ||
        new Date(right.created_at).getTime() -
          new Date(left.created_at).getTime() ||
        right.id - left.id,
    )

export const pageRecruiterMatches = (matches: RecruiterMatch[], page: number) =>
  matches.slice(
    page * RECRUITER_MATCHES_PAGE_SIZE,
    page * RECRUITER_MATCHES_PAGE_SIZE + RECRUITER_MATCHES_PAGE_SIZE,
  )
