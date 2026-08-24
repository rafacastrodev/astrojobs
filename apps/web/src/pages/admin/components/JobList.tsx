import { useState } from 'react'

import { TrashIcon } from '@/components/icons'
import { ResumeProfileView } from '@/pages/dashboard/components/ResumeProfileView'

import type { AdminDocument, RecruiterApplication } from '../types'

const iconButtonClassName =
  'inline-flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-lg text-muted-foreground transition hover:bg-muted hover:text-destructive disabled:cursor-not-allowed disabled:opacity-60'

type JobListProps = {
  jobs: AdminDocument[]
  applications: RecruiterApplication[]
  emptyLabel: string
  deletingId: number | null
  onDelete: (job: AdminDocument) => void
}

const jobTitle = (job: AdminDocument) =>
  typeof job.payload.title === 'string' ? job.payload.title : job.source_filename

const stringList = (value: unknown) =>
  Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string')
    : []

export const JobList = ({
  jobs,
  applications,
  emptyLabel,
  deletingId,
  onDelete,
}: JobListProps) => {
  const [openApplicationId, setOpenApplicationId] = useState<number | null>(null)

  if (jobs.length === 0) {
    return <p className="text-sm text-muted-foreground">{emptyLabel}</p>
  }

  return (
    <ul className="flex flex-col gap-3">
      {jobs.map((job) => {
        const applicants = applications.filter(
          (application) => application.job_document_id === job.id,
        )
        return (
          <li key={job.id} className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-start gap-2">
              <div className="min-w-0 flex-1 pt-1.5">
                <p className="truncate font-medium text-card-foreground">
                  {jobTitle(job)}
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
                <p className="mt-1 text-xs text-muted-foreground">
                  {new Date(job.created_at).toLocaleString()}
                </p>
              </div>
              <button
                type="button"
                aria-label={`Delete ${jobTitle(job)}`}
                onClick={() => onDelete(job)}
                disabled={deletingId === job.id}
                className={iconButtonClassName}
              >
                <TrashIcon />
              </button>
            </div>

            <div className="mt-4 border-t border-border pt-4">
              <p className="text-sm font-medium text-card-foreground">
                Applications · {applicants.length}
              </p>
              {applicants.length === 0 ? (
                <p className="mt-2 text-sm text-muted-foreground">
                  No applications yet.
                </p>
              ) : (
                <ul className="mt-3 flex flex-col gap-2">
                  {applicants.map((application) => {
                    const isOpen = openApplicationId === application.id
                    return (
                      <li
                        key={application.id}
                        className="rounded-lg border border-border p-3"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="font-medium text-card-foreground">
                              {application.applicant_name}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {application.resume_filename} ·{' '}
                              {new Date(application.created_at).toLocaleString()}
                            </p>
                            {application.resume_technologies.length > 0 ? (
                              <p className="mt-1 text-xs text-muted-foreground">
                                {application.resume_technologies.join(' · ')}
                              </p>
                            ) : null}
                            {application.resume_summary ? (
                              <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">
                                {application.resume_summary}
                              </p>
                            ) : null}
                          </div>
                          <button
                            type="button"
                            onClick={() =>
                              setOpenApplicationId(isOpen ? null : application.id)
                            }
                            className="shrink-0 cursor-pointer text-sm font-medium text-primary transition hover:opacity-80"
                          >
                            {isOpen ? 'Hide resume' : 'View resume'}
                          </button>
                        </div>
                        {isOpen ? (
                          <div className="mt-3 border-t border-border pt-3">
                            <ResumeProfileView payload={application.resume_payload} />
                          </div>
                        ) : null}
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
          </li>
        )
      })}
    </ul>
  )
}
