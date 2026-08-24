import { useState } from 'react'

import { AppHeader } from '@/components/AppHeader'
import { Button } from '@/components/Button'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { useDashboard } from '@/pages/dashboard/hooks/useDashboard'
import { getApiErrorMessage } from '@/utils'

import {
  useDeleteJob,
  useRecruiterApplications,
  useRecruiterJobs,
} from '../hooks/useAdminDocuments'
import type { AdminDocument } from '../types'
import { JobForm } from './JobForm'
import { JobList } from './JobList'

type AdminDashboardProps = {
  name: string
}

export const AdminDashboard = ({ name }: AdminDashboardProps) => {
  const { handleLogout, isLoggingOut } = useDashboard()
  const jobsQuery = useRecruiterJobs()
  const applicationsQuery = useRecruiterApplications()
  const remove = useDeleteJob()
  const [jobPendingDelete, setJobPendingDelete] =
    useState<AdminDocument | null>(null)
  const jobs = jobsQuery.data ?? []

  return (
    <div className="flex-1 bg-background px-4 py-10 text-foreground [animation:auth-fade-in_280ms_ease-out]">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-8">
        <AppHeader title="Recruiter" name={name}>
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

        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Create job</h2>
          <JobForm />
        </section>

        <section className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold">Jobs</h2>
            <p className="text-sm text-muted-foreground">{jobs.length} total</p>
          </div>
          {jobsQuery.isLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : jobsQuery.isError ? (
            <p role="alert" className="text-sm text-destructive">
              {getApiErrorMessage(jobsQuery.error, 'Failed to load jobs')}
            </p>
          ) : (
            <JobList
              jobs={jobs}
              applications={applicationsQuery.data ?? []}
              emptyLabel="No jobs yet. Create one to get started."
              deletingId={remove.isPending ? (remove.variables ?? null) : null}
              onDelete={setJobPendingDelete}
            />
          )}
          {remove.isError ? (
            <p role="alert" className="text-sm text-destructive">
              {getApiErrorMessage(remove.error, 'Delete failed')}
            </p>
          ) : null}
        </section>
      </div>

      {jobPendingDelete ? (
        <ConfirmDialog
          title="Remove this job?"
          description={`${typeof jobPendingDelete.payload.title === 'string' ? jobPendingDelete.payload.title : jobPendingDelete.source_filename} will be permanently deleted.`}
          confirmLabel="Remove"
          isConfirming={remove.isPending}
          onCancel={() => setJobPendingDelete(null)}
          onConfirm={() => {
            const id = jobPendingDelete.id
            remove.mutate(id, {
              onSettled: () => setJobPendingDelete(null),
            })
          }}
        />
      ) : null}
    </div>
  )
}
