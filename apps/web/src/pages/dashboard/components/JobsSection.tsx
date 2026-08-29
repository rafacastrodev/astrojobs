import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useMemo, useState } from 'react'

import { Button } from '@/components/Button'
import { UserAvatar } from '@/components/UserAvatar'
import { ChevronIcon } from '@/components/icons'
import { analysisServices } from '@/services/analysisServices'
import { resumeServices } from '@/services/resumeServices'
import { formatUsdSalary } from '@/utils/formatSalary'
import { getApiErrorMessage } from '@/utils'

import type { JobMatch, Resume } from '../types'
import {
  OPEN_JOBS_PAGE_SIZE,
  pageJobs,
  sortOpenJobs,
} from '../utils/jobCatalog'

const stringList = (value: unknown) =>
  Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string')
    : []

const iconButtonClassName =
  'inline-flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-lg text-muted-foreground transition hover:bg-card hover:text-card-foreground'

const applicationStatusCopy = {
  submitted: 'Submitted',
  reviewing: 'In review',
  accepted: 'Accepted',
  rejected: 'Not selected',
  removed: 'Removed from process',
} as const

const applicationStatusClass = {
  submitted: 'border-border text-muted-foreground',
  reviewing: 'border-primary/40 bg-primary/10 text-primary',
  accepted: 'border-green-500/40 bg-green-500/10 text-green-700',
  rejected: 'border-destructive/40 bg-destructive/10 text-destructive',
  removed: 'border-border bg-muted text-muted-foreground',
} as const

const JobCard = ({
  job,
  resumeId,
  isOpen,
  onToggle,
  apply,
}: {
  job: JobMatch
  resumeId: number | undefined
  isOpen: boolean
  onToggle: () => void
  apply: {
    isPending: boolean
    variables?: { jobId: number; resumeDocumentId: number }
    isError: boolean
    error: unknown
    mutate: (input: { jobId: number; resumeDocumentId: number }) => void
  }
}) => {
  const applied = Boolean(job.applied)
  const applicationStatus = job.application_status ?? null
  const closed = Boolean(job.closed_at)
  const isApplying = apply.isPending && apply.variables?.jobId === job.id
  const description =
    typeof job.payload.description === 'string'
      ? job.payload.description.trim()
      : ''
  const requirements = stringList(job.payload.requirements)
  const recruiterName = job.recruiter_name?.trim() || null
  const recruiterEmail = job.recruiter_email?.trim() || null

  return (
    <li className="rounded-xl border border-border p-4 transition hover:border-ring hover:bg-muted">
      <div className="flex items-start gap-2">
        <button
          type="button"
          aria-expanded={isOpen}
          onClick={onToggle}
          className="min-w-0 flex-1 cursor-pointer text-left"
        >
          <p className="truncate font-medium text-card-foreground">
            {job.title}
          </p>
          {recruiterName || recruiterEmail ? (
            <span className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
              <UserAvatar
                name={recruiterName ?? recruiterEmail ?? ''}
                size="sm"
              />
              <span className="min-w-0">
                {recruiterName ? (
                  <span className="block truncate text-card-foreground">
                    {recruiterName}
                  </span>
                ) : null}
                {recruiterEmail ? (
                  <span className="block truncate">{recruiterEmail}</span>
                ) : null}
              </span>
            </span>
          ) : null}
          {stringList(job.payload.technologies).length > 0 ? (
            <p className="mt-2 text-sm text-muted-foreground">
              {stringList(job.payload.technologies).join(' · ')}
            </p>
          ) : null}
          <p className="mt-1 text-xs text-muted-foreground">
            {[
              job.payload.seniority,
              job.payload.work_mode,
              job.payload.region,
              job.payload.employment_type,
              formatUsdSalary(
                job.payload.salary_min_usd,
                job.payload.salary_max_usd,
              ),
            ]
              .filter((item): item is string => typeof item === 'string')
              .join(' · ')}
          </p>
          <p className="mt-2 text-sm font-medium text-primary">
            {isOpen ? 'Hide job' : 'View job'}
          </p>
        </button>
        {job.offered ? (
          <span className="shrink-0 rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
            Invited
          </span>
        ) : null}
        {applicationStatus ? (
          <span
            className={`shrink-0 rounded-full border px-3 py-1 text-sm font-medium ${applicationStatusClass[applicationStatus]}`}
          >
            {applicationStatusCopy[applicationStatus]}
          </span>
        ) : null}
        {closed ? (
          <span className="shrink-0 rounded-full border border-border px-3 py-1 text-sm font-medium text-muted-foreground">
            Closed
          </span>
        ) : resumeId != null ? (
          <span className="shrink-0 rounded-full border border-border px-3 py-1 text-sm font-medium text-card-foreground">
            {Math.round(Math.max(0, Math.min(1, job.score)) * 100)}% stack match
          </span>
        ) : null}
        <button
          type="button"
          aria-expanded={isOpen}
          aria-label={isOpen ? 'Hide job' : 'View job'}
          onClick={onToggle}
          className={iconButtonClassName}
        >
          <ChevronIcon className={`transition ${isOpen ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {isOpen ? (
        <div className="mt-4 border-t border-border pt-4">
          {description ? (
            <p className="whitespace-pre-wrap text-sm text-muted-foreground">
              {description}
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">
              No description was provided for this role.
            </p>
          )}
          {requirements.length > 0 ? (
            <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
              {requirements.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          ) : null}
          {recruiterEmail ? (
            <p className="mt-4 text-sm text-muted-foreground">
              Recruiter contact:{' '}
              <a
                href={`mailto:${recruiterEmail}`}
                className="text-card-foreground underline-offset-2 hover:underline"
              >
                {recruiterEmail}
              </a>
            </p>
          ) : null}
        </div>
      ) : null}

      {!closed ? (
        <div className="mt-4 w-36">
          <Button
            type="button"
            disabled={applied || resumeId == null}
            isLoading={isApplying}
            onClick={() => {
              if (resumeId == null) return
              apply.mutate({ jobId: job.id, resumeDocumentId: resumeId })
            }}
            className="!py-2 text-sm"
          >
            {applicationStatus
              ? applicationStatusCopy[applicationStatus]
              : applied
                ? 'Applied'
                : 'Apply'}
          </Button>
        </div>
      ) : null}
      {apply.isError && apply.variables?.jobId === job.id ? (
        <p role="alert" className="mt-2 text-sm text-destructive">
          {getApiErrorMessage(apply.error, 'Could not apply')}
        </p>
      ) : null}
    </li>
  )
}

export const JobsSection = ({ focusJobId }: { focusJobId?: number }) => {
  const queryClient = useQueryClient()
  const [openJobId, setOpenJobId] = useState<number | null>(null)
  const [page, setPage] = useState(0)
  const [selectedResumeId, setSelectedResumeId] = useState<number | undefined>()
  const resumesQuery = useQuery({
    queryKey: ['resumes'],
    queryFn: resumeServices.list,
  })
  const resumes = (
    Array.isArray(resumesQuery.data) ? resumesQuery.data : []
  ) as Resume[]
  const hasResume = resumes.length > 0
  const selectedResume = resumes.find(
    (resume) => resume.id === selectedResumeId,
  )
  const resumeId = selectedResume?.id

  const jobsQuery = useQuery({
    queryKey: ['catalog-jobs', resumeId],
    queryFn: () => analysisServices.listJobs(resumeId),
    refetchInterval: 15_000,
  })
  const jobs = (jobsQuery.data ?? []) as JobMatch[]
  const openJobs = useMemo(
    () => sortOpenJobs(jobs, hasResume),
    [hasResume, jobs],
  )
  const closedApplications = jobs
    .filter((job) => job.closed_at && job.applied)
    .slice()
    .sort(
      (left, right) =>
        new Date(right.created_at).getTime() -
          new Date(left.created_at).getTime() || right.id - left.id,
    )
  const pageCount = Math.max(
    1,
    Math.ceil(openJobs.length / OPEN_JOBS_PAGE_SIZE),
  )
  const currentPage = Math.min(page, pageCount - 1)
  const pagedOpenJobs = pageJobs(openJobs, currentPage)

  useEffect(() => {
    if (focusJobId == null) return
    setOpenJobId(focusJobId)
    const index = openJobs.findIndex((job) => job.id === focusJobId)
    if (index >= 0) setPage(Math.floor(index / OPEN_JOBS_PAGE_SIZE))
  }, [focusJobId, openJobs])

  useEffect(() => {
    setPage((current) => Math.min(current, pageCount - 1))
  }, [pageCount])

  useEffect(() => {
    setPage(0)
  }, [resumeId])

  useEffect(() => {
    if (resumes.length === 0) {
      setSelectedResumeId(undefined)
      return
    }
    if (!resumes.some((resume) => resume.id === selectedResumeId)) {
      setSelectedResumeId(resumes[0].id)
    }
  }, [resumes, selectedResumeId])

  const apply = useMutation({
    mutationFn: ({
      jobId,
      resumeDocumentId,
    }: {
      jobId: number
      resumeDocumentId: number
    }) => analysisServices.applyToJob(jobId, resumeDocumentId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['catalog-jobs'] })
    },
  })

  return (
    <section className="rounded-2xl border border-border bg-card p-8">
      <h2 className="text-lg font-semibold text-card-foreground">Open jobs</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        {hasResume
          ? 'Ranked for the selected resume. Region and salary incompatibilities receive no match.'
          : 'Newest roles first. Upload a resume to rank them by match.'}
      </p>
      {hasResume ? (
        <label className="mt-4 block max-w-md text-sm font-medium text-card-foreground">
          Rank and apply with
          <select
            value={resumeId ?? ''}
            onChange={(event) => {
              setOpenJobId(null)
              setSelectedResumeId(Number(event.target.value))
            }}
            className="mt-2 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none transition focus:border-ring"
          >
            {resumes.map((resume) => (
              <option key={resume.id} value={resume.id}>
                {resume.source_filename}
              </option>
            ))}
          </select>
        </label>
      ) : null}
      <div className="mt-6">
        {jobsQuery.isLoading ? (
          <p className="text-sm text-muted-foreground">Loading jobs…</p>
        ) : jobsQuery.isError ? (
          <p role="alert" className="text-sm text-destructive">
            {getApiErrorMessage(jobsQuery.error, 'Failed to load jobs')}
          </p>
        ) : openJobs.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No jobs have been posted yet.
          </p>
        ) : (
          <div className="flex flex-col gap-4">
            <ul className="flex flex-col gap-3">
              {pagedOpenJobs.map((job) => (
                <JobCard
                  key={job.id}
                  job={job}
                  resumeId={resumeId}
                  isOpen={openJobId === job.id}
                  onToggle={() =>
                    setOpenJobId(openJobId === job.id ? null : job.id)
                  }
                  apply={apply}
                />
              ))}
            </ul>
            {pageCount > 1 ? (
              <nav
                aria-label="Open jobs pagination"
                className="flex items-center justify-between gap-3 text-sm"
              >
                <button
                  type="button"
                  disabled={currentPage === 0}
                  onClick={() => {
                    setOpenJobId(null)
                    setPage(currentPage - 1)
                  }}
                  className="cursor-pointer font-medium text-primary disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Previous
                </button>
                <p className="text-muted-foreground">
                  Page {currentPage + 1} of {pageCount}
                </p>
                <button
                  type="button"
                  disabled={currentPage >= pageCount - 1}
                  onClick={() => {
                    setOpenJobId(null)
                    setPage(currentPage + 1)
                  }}
                  className="cursor-pointer font-medium text-primary disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Next
                </button>
              </nav>
            ) : null}
          </div>
        )}
      </div>
      {closedApplications.length > 0 ? (
        <div className="mt-8 border-t border-border pt-6">
          <h3 className="font-semibold text-card-foreground">
            Application history
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Closed roles you applied to remain available here.
          </p>
          <ul className="mt-4 flex flex-col gap-3">
            {closedApplications.map((job) => (
              <JobCard
                key={job.id}
                job={job}
                resumeId={resumeId}
                isOpen={openJobId === job.id}
                onToggle={() =>
                  setOpenJobId(openJobId === job.id ? null : job.id)
                }
                apply={apply}
              />
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  )
}
