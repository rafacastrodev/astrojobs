import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'

import { Button } from '@/components/Button'
import { UserAvatar } from '@/components/UserAvatar'
import { ChevronIcon } from '@/components/icons'
import { analysisServices } from '@/services/analysisServices'
import { resumeServices } from '@/services/resumeServices'
import { getApiErrorMessage } from '@/utils'

import type { JobMatch, Resume } from '../types'

const stringList = (value: unknown) =>
  Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string')
    : []

const iconButtonClassName =
  'inline-flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-lg text-muted-foreground transition hover:bg-card hover:text-card-foreground'

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
  const isApplying = apply.isPending && apply.variables?.jobId === job.id
  const description =
    typeof job.payload.description === 'string' ? job.payload.description.trim() : ''
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
          <p className="truncate font-medium text-card-foreground">{job.title}</p>
          {recruiterName || recruiterEmail ? (
            <span className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
              <UserAvatar name={recruiterName ?? recruiterEmail ?? ''} size="sm" />
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
            ]
              .filter((item): item is string => typeof item === 'string')
              .join(' · ')}
          </p>
          <p className="mt-2 text-sm font-medium text-primary">
            {isOpen ? 'Hide job' : 'View job'}
          </p>
        </button>
        <span className="shrink-0 rounded-full border border-border px-3 py-1 text-sm font-medium text-card-foreground">
          {Math.round(Math.max(0, Math.min(1, job.score)) * 100)}% match
        </span>
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
          {applied ? 'Applied' : 'Apply'}
        </Button>
      </div>
      {apply.isError && apply.variables?.jobId === job.id ? (
        <p role="alert" className="mt-2 text-sm text-destructive">
          {getApiErrorMessage(apply.error, 'Could not apply')}
        </p>
      ) : null}
    </li>
  )
}

export const JobsSection = () => {
  const queryClient = useQueryClient()
  const [openJobId, setOpenJobId] = useState<number | null>(null)
  const resumesQuery = useQuery({
    queryKey: ['resumes'],
    queryFn: resumeServices.list,
  })
  const resumes = (Array.isArray(resumesQuery.data) ? resumesQuery.data : []) as Resume[]
  const hasResume = resumes.length > 0
  const resumeId = resumes[0]?.id

  const jobsQuery = useQuery({
    queryKey: ['catalog-jobs'],
    queryFn: analysisServices.listJobs,
    enabled: hasResume,
  })
  const jobs = (jobsQuery.data ?? []) as JobMatch[]

  const apply = useMutation({
    mutationFn: ({ jobId, resumeDocumentId }: { jobId: number; resumeDocumentId: number }) =>
      analysisServices.applyToJob(jobId, resumeDocumentId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['catalog-jobs'] })
    },
  })

  if (!hasResume) {
    return null
  }

  return (
    <section className="rounded-2xl border border-border bg-card p-8">
      <h2 className="text-lg font-semibold text-card-foreground">Open jobs</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Ranked by how well they match your resume.
      </p>
      <div className="mt-6">
        {jobsQuery.isLoading ? (
          <p className="text-sm text-muted-foreground">Loading jobs…</p>
        ) : jobsQuery.isError ? (
          <p role="alert" className="text-sm text-destructive">
            {getApiErrorMessage(jobsQuery.error, 'Failed to load jobs')}
          </p>
        ) : jobs.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No jobs have been posted yet.
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {jobs.map((job) => (
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
        )}
      </div>
    </section>
  )
}
