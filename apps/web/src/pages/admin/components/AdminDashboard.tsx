import { useState } from 'react'

import { AppHeader } from '@/components/AppHeader'
import { Button } from '@/components/Button'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { useDashboard } from '@/pages/dashboard/hooks/useDashboard'
import { getApiErrorMessage } from '@/utils'

import {
  useCloseJob,
  useRecruiterApplications,
  useRecruiterJobs,
  useRecruiterMatches,
  useRemoveCandidate,
  useUpdateApplicationStatus,
} from '../hooks/useAdminDocuments'
import type { AdminDocument, RecruiterApplication } from '../types'
import { JobForm } from './JobForm'
import { JobList } from './JobList'
import { MatchingProfessionals } from './MatchingProfessionals'

type AdminDashboardProps = {
  name: string
  photoUrl?: string | null
  focusJobId?: number
  focusApplicationId?: number
}

export const AdminDashboard = ({
  name,
  photoUrl,
  focusJobId,
  focusApplicationId,
}: AdminDashboardProps) => {
  const { handleLogout, isLoggingOut } = useDashboard()
  const jobsQuery = useRecruiterJobs()
  const applicationsQuery = useRecruiterApplications()
  const matchesQuery = useRecruiterMatches()
  const close = useCloseJob()
  const updateApplication = useUpdateApplicationStatus()
  const removeCandidate = useRemoveCandidate()
  const [jobPendingClose, setJobPendingClose] = useState<AdminDocument | null>(
    null,
  )
  const [isCreating, setIsCreating] = useState(false)
  const [candidatePendingRemove, setCandidatePendingRemove] =
    useState<RecruiterApplication | null>(null)
  const jobs = jobsQuery.data ?? []
  const openJobs = jobs
    .filter((job) => !job.closed_at)
    .slice()
    .sort(
      (left, right) =>
        new Date(right.created_at).getTime() -
          new Date(left.created_at).getTime() || right.id - left.id,
    )
  const closedJobs = jobs.filter((job) => job.closed_at)
  const hasJobs = jobs.length > 0
  const startCreatingRole = () => {
    setIsCreating(true)
    window.requestAnimationFrame(() => {
      document.getElementById('job-creation')?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      })
    })
  }

  return (
    <div className="flex-1 bg-background px-4 py-10 text-foreground [animation:auth-fade-in_280ms_ease-out]">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-8">
        <AppHeader title="Recruiter" name={name} photoUrl={photoUrl}>
          <div className="w-28">
            <Button
              onClick={handleLogout}
              isLoading={isLoggingOut}
              className="!py-2 text-sm"
            >
              Log out
            </Button>
          </div>
        </AppHeader>

        <section id="job-creation" className="scroll-mt-6 space-y-3">
          {jobsQuery.isLoading ? null : hasJobs && !isCreating ? (
            <div className="w-52">
              <Button
                type="button"
                onClick={startCreatingRole}
                className="!py-2 text-sm"
              >
                Post a new role
              </Button>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-lg font-semibold">Create job</h2>
                {hasJobs ? (
                  <button
                    type="button"
                    onClick={() => setIsCreating(false)}
                    className="cursor-pointer text-sm font-medium text-muted-foreground transition hover:text-card-foreground"
                  >
                    Cancel
                  </button>
                ) : null}
              </div>
              <JobForm onCreated={() => setIsCreating(false)} />
            </>
          )}
        </section>

        <section className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold">Open roles</h2>
            <p className="text-sm text-muted-foreground">
              {openJobs.length > 0
                ? `${openJobs.length} open ${openJobs.length === 1 ? 'role' : 'roles'}`
                : 'Roles you post will show up here.'}
            </p>
          </div>
          {jobsQuery.isLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : jobsQuery.isError ? (
            <p role="alert" className="text-sm text-destructive">
              {getApiErrorMessage(jobsQuery.error, 'Failed to load jobs')}
            </p>
          ) : (
            <JobList
              jobs={openJobs}
              applications={applicationsQuery.data ?? []}
              emptyLabel="No open roles. Create one to get started."
              closingId={close.isPending ? close.variables : null}
              onClose={setJobPendingClose}
              initialOpenJobId={focusJobId}
              initialApplicationId={focusApplicationId}
              updatingApplicationId={
                updateApplication.isPending
                  ? updateApplication.variables.applicationId
                  : removeCandidate.isPending
                    ? removeCandidate.variables
                    : null
              }
              onStatusChange={(applicationId, status) =>
                updateApplication.mutate({ applicationId, status })
              }
              onRemove={setCandidatePendingRemove}
            />
          )}
          {close.isError ? (
            <p role="alert" className="text-sm text-destructive">
              {getApiErrorMessage(close.error, 'The role could not be closed')}
            </p>
          ) : null}
        </section>

        {closedJobs.length > 0 ? (
          <section className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold">Closed roles</h2>
              <p className="text-sm text-muted-foreground">
                Applications are preserved for your records.
              </p>
            </div>
            <JobList
              jobs={closedJobs}
              applications={applicationsQuery.data ?? []}
              emptyLabel="No closed roles."
              closingId={null}
              initialOpenJobId={focusJobId}
              initialApplicationId={focusApplicationId}
              updatingApplicationId={
                updateApplication.isPending
                  ? updateApplication.variables.applicationId
                  : removeCandidate.isPending
                    ? removeCandidate.variables
                    : null
              }
              onStatusChange={(applicationId, status) =>
                updateApplication.mutate({ applicationId, status })
              }
              onRemove={setCandidatePendingRemove}
            />
          </section>
        ) : null}

        <section className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold">Matching professionals</h2>
            <p className="text-sm text-muted-foreground">
              Invite a matching professional to apply to one of your open roles.
            </p>
          </div>
          {matchesQuery.isError ? (
            <p role="alert" className="text-sm text-destructive">
              {getApiErrorMessage(matchesQuery.error, 'Failed to load matches')}
            </p>
          ) : (
            <MatchingProfessionals
              matches={matchesQuery.data ?? []}
              isLoading={
                jobsQuery.isLoading ||
                (openJobs.length > 0 && matchesQuery.isLoading)
              }
              openJobs={openJobs}
              onCreateRole={startCreatingRole}
            />
          )}
        </section>
      </div>

      {jobPendingClose ? (
        <ConfirmDialog
          title="Close this role?"
          description={`${typeof jobPendingClose.payload.title === 'string' ? jobPendingClose.payload.title : jobPendingClose.source_filename} will leave the job catalog. ${applicationsQuery.data?.filter((application) => application.job_document_id === jobPendingClose.id && application.status !== 'removed').length ?? 0} applicant(s) will be notified.`}
          confirmLabel="Close role"
          isConfirming={close.isPending}
          onCancel={() => setJobPendingClose(null)}
          onConfirm={() => {
            const id = jobPendingClose.id
            close.mutate(id, {
              onSuccess: () => setJobPendingClose(null),
            })
          }}
        />
      ) : null}
      {candidatePendingRemove ? (
        <ConfirmDialog
          title="Remove this candidate?"
          description={`${candidatePendingRemove.applicant_name} will be removed from the active pipeline for ${candidatePendingRemove.job_title}. The decision remains in the application history and the professional will be notified.`}
          confirmLabel="Remove candidate"
          isConfirming={removeCandidate.isPending}
          onCancel={() => setCandidatePendingRemove(null)}
          onConfirm={() => {
            removeCandidate.mutate(candidatePendingRemove.id, {
              onSuccess: () => setCandidatePendingRemove(null),
            })
          }}
        />
      ) : null}
      {updateApplication.isError || removeCandidate.isError ? (
        <p
          role="alert"
          className="fixed bottom-4 right-4 z-[60] max-w-sm rounded-lg border border-destructive bg-card p-4 text-sm text-destructive shadow-xl"
        >
          {getApiErrorMessage(
            updateApplication.error ?? removeCandidate.error,
            'The application could not be updated',
          )}
        </p>
      ) : null}
    </div>
  )
}
