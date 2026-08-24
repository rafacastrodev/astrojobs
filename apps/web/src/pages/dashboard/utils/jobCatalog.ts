import type { JobMatch } from '../types'

export const OPEN_JOBS_PAGE_SIZE = 5

const publishedAt = (job: JobMatch) => {
  const value = new Date(job.created_at).getTime()
  return Number.isNaN(value) ? 0 : value
}

export const sortOpenJobs = (jobs: JobMatch[], hasResume: boolean) =>
  jobs
    .filter((job) => !job.closed_at)
    .slice()
    .sort((left, right) => {
      if (hasResume) {
        const scoreDifference = right.score - left.score
        if (scoreDifference !== 0) return scoreDifference
      }
      return (
        publishedAt(right) - publishedAt(left) ||
        right.id - left.id
      )
    })

export const pageJobs = (
  jobs: JobMatch[],
  page: number,
  pageSize = OPEN_JOBS_PAGE_SIZE,
) => jobs.slice(page * pageSize, page * pageSize + pageSize)
