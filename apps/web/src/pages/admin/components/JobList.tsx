import { useState } from 'react'

import { TrashIcon } from '@/components/icons'

import type { AdminDocument, RecruiterApplication } from '../types'
import { ApplicantProfileView } from './ApplicantProfileView'

const PAGE_SIZE = 5

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
  const [openJobId, setOpenJobId] = useState<number | null>(null)
  const [page, setPage] = useState(0)

  if (jobs.length === 0) {
    return <p className="text-sm text-muted-foreground">{emptyLabel}</p>
  }

  const pageCount = Math.max(1, Math.ceil(jobs.length / PAGE_SIZE))
  const currentPage = Math.min(page, pageCount - 1)
  const pagedJobs = jobs.slice(
    currentPage * PAGE_SIZE,
    currentPage * PAGE_SIZE + PAGE_SIZE,
  )

  return (
    <div className="flex flex-col gap-4">
      <ul className="flex flex-col gap-3">
        {pagedJobs.map((job) => {
          const applicants = applications.filter(
            (application) => application.job_document_id === job.id,
          )
          const isOpen = openJobId === job.id
          return (
            <li
              key={job.id}
              className="rounded-xl border border-border bg-card p-4"
            >
              <div className="flex items-start gap-2">
                <button
                  type="button"
                  aria-expanded={isOpen}
                  onClick={() => {
                    setOpenJobId(isOpen ? null : job.id)
                  }}
                  className="min-w-0 flex-1 cursor-pointer pt-1.5 text-left"
                >
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
                    {applicants.length > 0
                      ? ` · ${applicants.length} application${applicants.length === 1 ? '' : 's'}`
                      : ''}
                  </p>
                  <p className="mt-2 text-sm font-medium text-primary">
                    {isOpen ? 'Hide details' : 'View details'}
                  </p>
                </button>
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

              {isOpen ? (
                <div className="mt-4 border-t border-border pt-4">
                  {typeof job.payload.description === 'string' &&
                  job.payload.description.trim() ? (
                    <p className="mb-4 whitespace-pre-wrap text-sm text-muted-foreground">
                      {job.payload.description}
                    </p>
                  ) : null}
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
                        const jobTechnologies = stringList(
                          job.payload.technologies,
                        )
                        return (
                          <li
                            key={application.id}
                            className="rounded-lg border border-border p-3"
                          >
                            <ApplicantProfileView
                              payload={application.resume_payload}
                              displayName={application.applicant_name}
                              highlightTerms={jobTechnologies}
                              matchedTechnologies={
                                application.matched_technologies ?? []
                              }
                            />
                          </li>
                        )
                      })}
                    </ul>
                  )}
                </div>
              ) : null}
            </li>
          )
        })}
      </ul>

      {pageCount > 1 ? (
        <div className="flex items-center justify-between gap-3 text-sm">
          <button
            type="button"
            disabled={currentPage === 0}
            onClick={() => setPage(currentPage - 1)}
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
            onClick={() => setPage(currentPage + 1)}
            className="cursor-pointer font-medium text-primary disabled:cursor-not-allowed disabled:opacity-40"
          >
            Next
          </button>
        </div>
      ) : null}
    </div>
  )
}
