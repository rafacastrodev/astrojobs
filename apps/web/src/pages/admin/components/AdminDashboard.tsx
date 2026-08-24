import { AppHeader } from '@/components/AppHeader'
import { Button } from '@/components/Button'
import { useDashboard } from '@/pages/dashboard/hooks/useDashboard'

import { useAdminDashboard } from '../hooks/useAdminDashboard'
import { CandidateDetail } from './CandidateDetail'
import { CandidateList } from './CandidateList'
import { DocumentDetail } from './DocumentDetail'
import { DocumentList } from './DocumentList'
import { JobForm } from './JobForm'

type AdminDashboardProps = {
  name: string
}

export const AdminDashboard = ({ name }: AdminDashboardProps) => {
  const { handleLogout, isLoggingOut } = useDashboard()
  const {
    tab,
    setTab,
    selectedDocument,
    setSelectedDocument,
    selectedMatch,
    setSelectedMatch,
    actionError,
    documents,
    matches,
    handleDelete,
    isRemoving,
    isLoadingDocuments,
    errorMessageDocuments,
    isLoadingMatches,
    errorMessageMatches,
  } = useAdminDashboard()

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

        <div className="flex gap-2">
          {(
            [
              ['job', 'Jobs'],
              ['resume', 'Resumes'],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setTab(value)}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
                tab === value
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:text-foreground'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {tab === 'job' ? (
          <section className="space-y-3">
            <h2 className="text-lg font-semibold">Create job</h2>
            <JobForm />
          </section>
        ) : null}

        {actionError ? (
          <p role="alert" className="text-sm text-destructive">
            {actionError}
          </p>
        ) : null}

        {tab === 'job' ? (
          <section className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold">Jobs</h2>
              <p className="text-sm text-muted-foreground">
                {documents.length} total
              </p>
            </div>
            {isLoadingDocuments ? (
              <p className="text-sm text-muted-foreground">Loading…</p>
            ) : errorMessageDocuments ? (
              <p className="text-sm text-destructive">{errorMessageDocuments}</p>
            ) : (
              <DocumentList
                documents={documents}
                emptyLabel="No jobs yet. Create one to get started."
                onSelect={setSelectedDocument}
                onDelete={handleDelete}
                isDeleting={isRemoving}
              />
            )}
          </section>
        ) : (
          <section className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold">Matching resumes</h2>
              <p className="text-sm text-muted-foreground">
                Candidates whose technologies overlap with your posted jobs.
              </p>
            </div>
            {isLoadingMatches ? (
              <p className="text-sm text-muted-foreground">
                Finding matching resumes…
              </p>
            ) : errorMessageMatches ? (
              <p className="text-sm text-destructive">{errorMessageMatches}</p>
            ) : (
              <CandidateList
                matches={matches}
                emptyLabel={
                  documents.length === 0
                    ? 'Post a job with technologies to see matching resumes.'
                    : 'No matching resumes yet.'
                }
                onSelect={setSelectedMatch}
              />
            )}
          </section>
        )}

        {tab === 'job' && selectedDocument ? (
          <DocumentDetail
            filename={
              typeof selectedDocument.payload.title === 'string'
                ? selectedDocument.payload.title
                : selectedDocument.source_filename
            }
            payload={selectedDocument.payload}
            errorMessage={selectedDocument.error_message}
            status={selectedDocument.status}
            onClose={() => setSelectedDocument(null)}
          />
        ) : null}

        {tab === 'resume' && selectedMatch ? (
          <CandidateDetail
            match={selectedMatch}
            onClose={() => setSelectedMatch(null)}
          />
        ) : null}
      </div>
    </div>
  )
}