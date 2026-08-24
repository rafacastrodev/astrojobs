import { useEffect, useState } from 'react'

import type {
  AdminDocument,
  ApplicationStatus,
  RecruiterApplication,
} from '../types'
import { ApplicantProfileView } from './ApplicantProfileView'

const PAGE_SIZE = 5

type JobListProps = {
  jobs: AdminDocument[]
  applications: RecruiterApplication[]
  emptyLabel: string
  closingId: number | null
  onClose?: (job: AdminDocument) => void
  initialOpenJobId?: number
  initialApplicationId?: number
  updatingApplicationId?: number | null
  onStatusChange?: (applicationId: number, status: ApplicationStatus) => void
  onRemove?: (application: RecruiterApplication) => void
}

const statusLabels: Record<ApplicationStatus, string> = {
  submitted: 'Submitted',
  reviewing: 'In review',
  accepted: 'Accepted',
  rejected: 'Rejected',
  removed: 'Removed',
}

const transitions: Record<ApplicationStatus, ApplicationStatus[]> = {
  submitted: ['reviewing', 'accepted', 'rejected'],
  reviewing: ['accepted', 'rejected'],
  accepted: [],
  rejected: [],
  removed: [],
}

const jobTitle = (job: AdminDocument) =>
  typeof job.payload.title === 'string'
    ? job.payload.title
    : job.source_filename

const stringList = (value: unknown) =>
  Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string')
    : []

export const JobList = ({
  jobs,
  applications,
  emptyLabel,
  closingId,
  onClose,
  initialOpenJobId,
  initialApplicationId,
  updatingApplicationId,
  onStatusChange,
  onRemove,
}: JobListProps) => {
  const initialJobIndex = jobs.findIndex((job) => job.id === initialOpenJobId)
  const [openJobId, setOpenJobId] = useState<number | null>(
    initialOpenJobId ?? null,
  )
  const [page, setPage] = useState(
    initialJobIndex >= 0 ? Math.floor(initialJobIndex / PAGE_SIZE) : 0,
  )

  useEffect(() => {
    if (initialOpenJobId == null) return
    const index = jobs.findIndex((job) => job.id === initialOpenJobId)
    if (index >= 0) {
      setOpenJobId(initialOpenJobId)
      setPage(Math.floor(index / PAGE_SIZE))
    }
  }, [initialOpenJobId, jobs])

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
          const activeApplicants = applicants.filter(
            (application) => application.status !== 'removed',
          )
          const removedApplicants = applicants.filter(
            (application) => application.status === 'removed',
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
                  {job.closed_at ? (
                    <span className="mt-2 inline-flex rounded-full border border-border px-2 py-0.5 text-xs font-medium text-muted-foreground">
                      Closed
                    </span>
                  ) : null}
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
                      .filter(
                        (item): item is string => typeof item === 'string',
                      )
                      .join(' · ')}
                    {activeApplicants.length > 0
                      ? ` · ${activeApplicants.length} application${activeApplicants.length === 1 ? '' : 's'}`
                      : ''}
                  </p>
                  <p className="mt-2 text-sm font-medium text-primary">
                    {isOpen ? 'Hide details' : 'View details'}
                  </p>
                </button>
                {!job.closed_at && onClose ? (
                  <button
                    type="button"
                    onClick={() => onClose(job)}
                    disabled={closingId === job.id}
                    className="shrink-0 cursor-pointer rounded-lg border border-border px-3 py-2 text-sm font-medium text-muted-foreground transition hover:bg-muted hover:text-card-foreground disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Close role
                  </button>
                ) : null}
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
                    Applications · {activeApplicants.length}
                  </p>
                  {activeApplicants.length === 0 ? (
                    <p className="mt-2 text-sm text-muted-foreground">
                      No applications yet.
                    </p>
                  ) : (
                    <ul className="mt-3 flex flex-col gap-2">
                      {activeApplicants.map((application) => {
                        const jobTechnologies = stringList(
                          job.payload.technologies,
                        )
                        return (
                          <li
                            key={application.id}
                            className={`rounded-lg border p-3 ${application.id === initialApplicationId ? 'border-primary bg-primary/5' : 'border-border'}`}
                          >
                            <ApplicantProfileView
                              payload={application.resume_payload}
                              displayName={application.applicant_name}
                              contactEmail={application.applicant_email}
                              highlightTerms={jobTechnologies}
                              matchedTechnologies={
                                application.matched_technologies
                              }
                            />
                            <div className="mt-4 flex flex-wrap items-end justify-between gap-3 border-t border-border pt-3">
                              <label className="grid gap-1 text-xs font-medium text-muted-foreground">
                                Application status
                                <select
                                  value={application.status}
                                  disabled={
                                    updatingApplicationId === application.id ||
                                    transitions[application.status].length === 0
                                  }
                                  onChange={(event) =>
                                    onStatusChange?.(
                                      application.id,
                                      event.target.value as ApplicationStatus,
                                    )
                                  }
                                  className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-card-foreground disabled:opacity-60"
                                >
                                  <option value={application.status}>
                                    {statusLabels[application.status]}
                                  </option>
                                  {transitions[application.status].map(
                                    (status) => (
                                      <option key={status} value={status}>
                                        {statusLabels[status]}
                                      </option>
                                    ),
                                  )}
                                </select>
                              </label>
                              <div className="flex items-center gap-3">
                                <span className="text-xs text-muted-foreground">
                                  Updated{' '}
                                  {new Date(
                                    application.updated_at,
                                  ).toLocaleDateString()}
                                </span>
                                {onRemove ? (
                                  <button
                                    type="button"
                                    disabled={
                                      updatingApplicationId === application.id
                                    }
                                    onClick={() => onRemove(application)}
                                    className="cursor-pointer rounded-lg border border-destructive/40 px-3 py-2 text-sm font-medium text-destructive transition hover:bg-destructive/10 disabled:cursor-not-allowed disabled:opacity-50"
                                  >
                                    Remove candidate
                                  </button>
                                ) : null}
                              </div>
                            </div>
                          </li>
                        )
                      })}
                    </ul>
                  )}
                  {removedApplicants.length > 0 ? (
                    <details className="mt-4 rounded-lg border border-dashed border-border p-3">
                      <summary className="cursor-pointer text-sm font-medium text-muted-foreground">
                        Removed candidates · {removedApplicants.length}
                      </summary>
                      <ul className="mt-3 space-y-2">
                        {removedApplicants.map((application) => (
                          <li
                            key={application.id}
                            className="rounded-lg bg-muted/40 p-3 text-sm"
                          >
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <span className="font-medium text-card-foreground">
                                {application.applicant_name}
                              </span>
                              <span className="rounded-full border border-border px-2 py-0.5 text-xs text-muted-foreground">
                                Removed
                              </span>
                            </div>
                            <a
                              href={`mailto:${application.applicant_email}`}
                              className="mt-1 block text-muted-foreground underline-offset-2 hover:underline"
                            >
                              {application.applicant_email}
                            </a>
                          </li>
                        ))}
                      </ul>
                    </details>
                  ) : null}
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
