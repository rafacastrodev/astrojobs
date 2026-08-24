import { useEffect, useMemo, useState } from 'react'

import { Button } from '@/components/Button'
import { getApiErrorMessage } from '@/utils'

import { useCreateOffer } from '../hooks/useAdminDocuments'
import type { AdminDocument, RecruiterMatch } from '../types'
import {
  pageRecruiterMatches,
  rankMatchesForJob,
  RECRUITER_MATCHES_PAGE_SIZE,
  scoreForJob,
} from '../utils/recruiterMatches'
import { ApplicantProfileView } from './ApplicantProfileView'

type OfferTarget = {
  resumeDocumentId: number
  jobId: number
  jobTitle: string
}

const displayName = (match: RecruiterMatch) => {
  return match.professional_name.trim() || match.source_filename
}

export const MatchingProfessionals = ({
  matches,
  isLoading,
  openJobs,
  onCreateRole,
}: {
  matches: RecruiterMatch[]
  isLoading: boolean
  openJobs: AdminDocument[]
  onCreateRole: () => void
}) => {
  const createOffer = useCreateOffer()
  const [target, setTarget] = useState<OfferTarget | null>(null)
  const [message, setMessage] = useState('')
  const [selectedJobId, setSelectedJobId] = useState<number | null>(
    openJobs[0]?.id ?? null,
  )
  const [page, setPage] = useState(0)
  const rankedMatches = useMemo(
    () =>
      selectedJobId == null ? [] : rankMatchesForJob(matches, selectedJobId),
    [matches, selectedJobId],
  )
  const pageCount = Math.max(
    1,
    Math.ceil(rankedMatches.length / RECRUITER_MATCHES_PAGE_SIZE),
  )
  const currentPage = Math.min(page, pageCount - 1)
  const pagedMatches = pageRecruiterMatches(rankedMatches, currentPage)

  useEffect(() => {
    if (openJobs.length === 0) {
      setSelectedJobId(null)
      return
    }
    if (!openJobs.some((job) => job.id === selectedJobId)) {
      setSelectedJobId(openJobs[0].id)
    }
  }, [openJobs, selectedJobId])

  useEffect(() => {
    setPage(0)
  }, [selectedJobId])

  useEffect(() => {
    setPage((current) => Math.min(current, pageCount - 1))
  }, [pageCount])

  const closeDialog = () => {
    if (createOffer.isPending) return
    setTarget(null)
    setMessage('')
    createOffer.reset()
  }

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Loading matches…</p>
  }
  if (openJobs.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-muted/30 p-6">
        <p className="font-medium text-card-foreground">
          Post an open role to start matching professionals.
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          Candidate compatibility is calculated against the requirements of a
          specific role.
        </p>
        <div className="mt-4 w-40">
          <Button
            type="button"
            onClick={onCreateRole}
            className="!py-2 text-sm"
          >
            Create a role
          </Button>
        </div>
      </div>
    )
  }
  return (
    <>
      <div className="flex flex-col gap-4">
        <label className="block max-w-md text-sm font-medium text-card-foreground">
          Match candidates for
          <select
            value={selectedJobId ?? ''}
            onChange={(event) => setSelectedJobId(Number(event.target.value))}
            className="mt-2 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none transition focus:border-ring"
          >
            {openJobs.map((job) => (
              <option key={job.id} value={job.id}>
                {typeof job.payload.title === 'string'
                  ? job.payload.title
                  : job.source_filename}
              </option>
            ))}
          </select>
        </label>
        <p className="text-sm text-muted-foreground">
          {rankedMatches.length} matching{' '}
          {rankedMatches.length === 1 ? 'professional' : 'professionals'} ·
          highest compatibility first
        </p>
      </div>

      {rankedMatches.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">
          No compatible professionals were found for this role yet.
        </p>
      ) : (
        <ul className="mt-4 flex flex-col gap-3">
          {pagedMatches.map((match) => {
            const selectedJob = match.matched_jobs.find(
              (job) => job.id === selectedJobId,
            )
            const applied =
              selectedJob != null &&
              match.applied_job_ids.includes(selectedJob.id)
            const offered =
              selectedJob != null &&
              match.offered_job_ids.includes(selectedJob.id)
            return (
              <li
                key={match.id}
                className="rounded-xl border border-border bg-card p-4"
              >
                <div className="mb-3 flex justify-end">
                  <span className="rounded-full border border-border px-3 py-1 text-sm font-medium text-card-foreground">
                    {Math.round(
                      Math.max(
                        0,
                        Math.min(
                          1,
                          selectedJobId == null
                            ? 0
                            : scoreForJob(match, selectedJobId),
                        ),
                      ) * 100,
                    )}
                    % stack match
                  </span>
                </div>
                <ApplicantProfileView
                  payload={match.payload}
                  displayName={displayName(match)}
                  contactEmail={match.professional_email}
                  highlightTerms={match.matched_technologies}
                  matchedTechnologies={match.matched_technologies}
                />
                {match.summary ? (
                  <p className="mt-3 text-sm text-muted-foreground">
                    {match.summary}
                  </p>
                ) : null}
                {selectedJob ? (
                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={applied || offered}
                      onClick={() => {
                        createOffer.reset()
                        setTarget({
                          resumeDocumentId: match.id,
                          jobId: selectedJob.id,
                          jobTitle: selectedJob.title,
                        })
                      }}
                      className="cursor-pointer rounded-lg border border-border px-3 py-2 text-sm font-medium text-card-foreground transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-55"
                    >
                      {applied
                        ? 'Already applied'
                        : offered
                          ? 'Offer sent'
                          : 'Send offer'}
                    </button>
                  </div>
                ) : null}
              </li>
            )
          })}
        </ul>
      )}

      {pageCount > 1 ? (
        <nav
          aria-label="Matching professionals pagination"
          className="mt-4 flex items-center justify-between gap-3 text-sm"
        >
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
        </nav>
      ) : null}

      {target ? (
        <div
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeDialog()
          }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4"
        >
          <form
            onSubmit={(event) => {
              event.preventDefault()
              const cleaned = message.trim()
              if (!cleaned) return
              createOffer.mutate(
                {
                  jobId: target.jobId,
                  resumeDocumentId: target.resumeDocumentId,
                  message: cleaned,
                },
                {
                  onSuccess: () => {
                    setTarget(null)
                    setMessage('')
                  },
                },
              )
            }}
            className="w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-2xl"
          >
            <h3 className="text-lg font-semibold text-card-foreground">
              Send offer for {target.jobTitle}
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              This offer is for that role only. Confirm before sending.
            </p>
            <label className="mt-5 block text-sm font-medium text-card-foreground">
              Message
              <textarea
                autoFocus
                required
                maxLength={500}
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                placeholder="Tell the professional why this role could be a good fit."
                className="mt-2 min-h-32 w-full resize-y rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none transition focus:border-ring"
              />
            </label>
            <p className="mt-1 text-right text-xs text-muted-foreground">
              {message.length}/500
            </p>
            {createOffer.isError ? (
              <p role="alert" className="mt-3 text-sm text-destructive">
                {getApiErrorMessage(
                  createOffer.error,
                  'Offer could not be sent',
                )}
              </p>
            ) : null}
            <div className="mt-5 flex justify-end gap-3">
              <button
                type="button"
                disabled={createOffer.isPending}
                onClick={closeDialog}
                className="cursor-pointer px-4 py-2 text-sm font-medium text-muted-foreground disabled:opacity-50"
              >
                Cancel
              </button>
              <div className="w-32">
                <Button
                  type="submit"
                  disabled={!message.trim()}
                  isLoading={createOffer.isPending}
                  className="!py-2 text-sm"
                >
                  Send offer
                </Button>
              </div>
            </div>
          </form>
        </div>
      ) : null}
    </>
  )
}
