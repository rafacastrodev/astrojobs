import { Link } from '@tanstack/react-router'

import { Button } from '@/components/Button'
import { Logo } from '@/components/Logo'

import { useAdminDashboard } from '../hooks/useAdminDashboard'
import { DocumentDetail } from './DocumentDetail'
import { DocumentList } from './DocumentList'
import { DocumentUpload } from './DocumentUpload'

type AdminDashboardProps = {
  name: string
}

const ACCEPT = '.pdf,.docx,.txt,.md,application/pdf,text/plain,text/markdown'

export const AdminDashboard = ({ name }: AdminDashboardProps) => {
  const {
    tab,
    setTab,
    selectedIds,
    setSelectedIds,
    selectedDocument,
    setSelectedDocument,
    uploadError,
    setUploadError,
    syncMessage,
    setSyncMessage,
    documents,
    draftCount,
    handleUpload,
    handleSync,
    toggle,
    isUploading,
    isSyncing,
    isLoadingDocuments,
    errorMessageDocuments,
    handleDelete,
    isRemoving,
  } = useAdminDashboard()

  return (
    <div className="min-h-screen bg-background px-4 py-10 text-foreground [animation:auth-fade-in_280ms_ease-out]">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-8">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <Logo />
            <div>
              <p className="text-sm text-muted-foreground">AstroJobs</p>
              <h1 className="text-2xl font-semibold">Admin</h1>
              <p className="text-sm text-muted-foreground">
                Signed in as {name}
              </p>
            </div>
          </div>
          <Link
            to="/dashboard"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            Back to dashboard
          </Link>
        </header>

        <div className="flex gap-2">
          {(
            [
              ['resume', 'Resumes'],
              ['job', 'Jobs'],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => {
                setTab(value)
                setSelectedIds([])
                setSelectedDocument(null)
                setUploadError(null)
                setSyncMessage(null)
              }}
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

        <section className="space-y-3">
          <h2 className="text-lg font-semibold">
            Upload {tab === 'resume' ? 'resume' : 'job'}
          </h2>
          <DocumentUpload
            accept={ACCEPT}
            isLoading={isUploading}
            onUpload={handleUpload}
            error={uploadError}
          />
        </section>

        <section className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold">Documents</h2>
              <p className="text-sm text-muted-foreground">
                {documents.length} total · {draftCount} pending sync
              </p>
            </div>
            <div className="w-full sm:w-56">
              <Button
                onClick={handleSync}
                isLoading={isSyncing}
                disabled={documents.length === 0}
              >
                {selectedIds.length > 0
                  ? `Push selected (${selectedIds.length})`
                  : 'Push drafts to Pinecone'}
              </Button>
            </div>
          </div>
          {syncMessage ? (
            <p className="text-sm text-muted-foreground">{syncMessage}</p>
          ) : null}
          {isLoadingDocuments ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : errorMessageDocuments ? (
            <p className="text-sm text-destructive">{errorMessageDocuments}</p>
          ) : (
            <DocumentList
              documents={documents}
              selectedIds={selectedIds}
              onToggle={toggle}
              onSelectAll={() =>
                setSelectedIds(documents.map((document) => document.id))
              }
              onClearSelection={() => setSelectedIds([])}
              onSelect={setSelectedDocument}
              onDelete={handleDelete}
              isDeleting={isRemoving}
            />
          )}
        </section>

        {selectedDocument ? (
          <DocumentDetail
            filename={selectedDocument.source_filename}
            payload={selectedDocument.payload}
            errorMessage={selectedDocument.error_message}
            status={selectedDocument.status}
            onClose={() => setSelectedDocument(null)}
          />
        ) : null}
      </div>
    </div>
  )
}
