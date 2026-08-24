import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { Button } from '@/components/Button'
import { analysisServices } from '@/services/analysisServices'
import { resumeServices } from '@/services/resumeServices'
import { getApiErrorMessage } from '@/utils'

import type { JobMatch, Resume } from '../types'

const stringList = (value: unknown) =>
  Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string')
    : []

export const JobsSection = () => {
  const queryClient = useQueryClient()
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
            {jobs.map((job) => {
              const applied = Boolean(job.applied)
              const isApplying =
                apply.isPending && apply.variables?.jobId === job.id
              return (
                <li
                  key={job.id}
                  className="rounded-xl border border-border p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-medium text-card-foreground">
                        {job.title}
                      </p>
                      {stringList(job.payload.technologies).length > 0 ? (
                        <p className="mt-1 text-sm text-muted-foreground">
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
                    </div>
                    <span className="shrink-0 rounded-full border border-border px-3 py-1 text-sm font-medium text-card-foreground">
                      {Math.round(Math.max(0, Math.min(1, job.score)) * 100)}%
                      match
                    </span>
                  </div>
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
            })}
          </ul>
        )}
      </div>
    </section>
  )
}
