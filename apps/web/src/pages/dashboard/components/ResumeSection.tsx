import { useRef, useState } from 'react'

import { Button } from '@/components/Button'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { CloseIcon, TrashIcon } from '@/components/icons'

import { ResumeWorkspace } from './ResumeWorkspace'
import { ACCEPTED_EXTENSIONS, useResumes } from '../hooks/useResumes'
import type { Resume } from '../types'

const iconButtonClassName =
  'inline-flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-lg text-muted-foreground transition hover:bg-muted hover:text-card-foreground disabled:cursor-not-allowed disabled:opacity-60'

const STATUS_LABELS: Record<Resume['status'], string> = {
  draft: 'Awaiting indexing',
  synced: 'Indexed',
  failed: 'Indexing failed',
}

const ANALYSIS_STATUS_LABELS: Record<Resume['analysis_status'], string> = {
  pending: 'ATS analysis pending',
  completed: 'ATS analysis complete',
  failed: 'ATS analysis failed',
}

const ATS_CATEGORY_LABELS = {
  low: 'Low ATS fit',
  medium: 'Medium ATS fit',
  high: 'High ATS fit',
} as const

export const ResumeSection = () => {
  const inputRef = useRef<HTMLInputElement>(null)
  const [isDraggingOver, setIsDraggingOver] = useState(false)
  const [expandedResumeId, setExpandedResumeId] = useState<number | null>(null)
  const [resumePendingDelete, setResumePendingDelete] = useState<Resume | null>(
    null,
  )
  const {
    resumes,
    isLoading,
    listError,
    handleUpload,
    isUploading,
    uploadError,
    handleDelete,
    deletingId,
    deleteError,
    handleProcess,
    processingId,
    processError,
  } = useResumes()

  const submitFile = (file: File | undefined) => {
    if (file) handleUpload(file)
    if (inputRef.current) inputRef.current.value = ''
  }

  return (
    <section className="rounded-2xl border border-border bg-card p-8">
      <h2 className="text-lg font-semibold text-card-foreground">
        Your resumes
      </h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Upload a resume so we can match you with jobs. PDF, DOCX, TXT or MD, up
        to 5MB.
      </p>

      <div
        onDragOver={(event) => {
          event.preventDefault()
          setIsDraggingOver(true)
        }}
        onDragLeave={() => setIsDraggingOver(false)}
        onDrop={(event) => {
          event.preventDefault()
          setIsDraggingOver(false)
          submitFile(event.dataTransfer.files[0])
        }}
        className={`mt-6 flex flex-col items-center gap-4 rounded-xl border border-dashed p-8 text-center transition ${
          isDraggingOver ? 'border-ring bg-input' : 'border-border'
        }`}
      >
        <p className="text-sm text-muted-foreground">
          Drag a file here, or pick one from your computer.
        </p>
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED_EXTENSIONS.join(',')}
          className="hidden"
          onChange={(event) => submitFile(event.target.files?.[0])}
        />
        <div className="w-48">
          <Button
            type="button"
            onClick={() => inputRef.current?.click()}
            isLoading={isUploading}
            className="!py-2 text-sm"
          >
            Choose file
          </Button>
        </div>
      </div>

      {uploadError ? (
        <p role="alert" className="mt-4 text-sm text-destructive">
          {uploadError}
        </p>
      ) : null}
      {deleteError ? (
        <p role="alert" className="mt-4 text-sm text-destructive">
          {deleteError}
        </p>
      ) : null}
      {processError ? (
        <p role="alert" className="mt-4 text-sm text-destructive">
          {processError}
        </p>
      ) : null}

      <div className="mt-8">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading your resumes…</p>
        ) : listError ? (
          <p role="alert" className="text-sm text-destructive">
            {listError}
          </p>
        ) : resumes.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            You have not uploaded a resume yet.
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {resumes.map((resume) => (
              <li
                key={resume.id}
                className="rounded-xl border border-border p-4"
              >
                <div className="flex items-start gap-2">
                  <div className="min-w-0 flex-1 pt-1.5">
                    <p className="truncate font-medium text-card-foreground">
                      {resume.source_filename}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {STATUS_LABELS[resume.status]} ·{' '}
                      {ANALYSIS_STATUS_LABELS[resume.analysis_status]} ·{' '}
                      {new Date(resume.created_at).toLocaleDateString()}
                      {resume.latest_analysis ? (
                        <>
                          {' '}
                          ·{' '}
                          <span className="font-medium text-card-foreground">
                            {resume.latest_analysis.score}/100
                          </span>
                          {` · ${ATS_CATEGORY_LABELS[resume.latest_analysis.ats_category]}`}
                          {resume.latest_analysis.years_of_experience !== null
                            ? ` · ${resume.latest_analysis.years_of_experience} anos`
                            : ''}
                          {resume.latest_analysis.technologies.length > 0
                            ? ` · ${resume.latest_analysis.technologies.length} technologies`
                            : ''}
                        </>
                      ) : null}
                    </p>
                    {resume.status === 'failed' ||
                    resume.analysis_status === 'failed' ? (
                      <button
                        type="button"
                        onClick={() => handleProcess(resume.id)}
                        disabled={processingId === resume.id}
                        className="mt-2 cursor-pointer text-sm font-medium text-primary transition hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {processingId === resume.id
                          ? 'Trying again…'
                          : 'Try again'}
                      </button>
                    ) : null}
                  </div>
                  <button
                    type="button"
                    aria-label={`Delete ${resume.source_filename}`}
                    onClick={() => setResumePendingDelete(resume)}
                    disabled={deletingId === resume.id}
                    className={`${iconButtonClassName} hover:text-destructive`}
                  >
                    <TrashIcon />
                  </button>
                  <button
                    type="button"
                    aria-expanded={expandedResumeId === resume.id}
                    aria-label={
                      expandedResumeId === resume.id
                        ? `Close ${resume.source_filename}`
                        : `Open ${resume.source_filename}`
                    }
                    onClick={() =>
                      setExpandedResumeId(
                        expandedResumeId === resume.id ? null : resume.id,
                      )
                    }
                    className={iconButtonClassName}
                  >
                    <CloseIcon />
                  </button>
                </div>
                {resume.analysis_error_message || resume.error_message ? (
                  <p role="alert" className="mt-3 text-sm text-destructive">
                    {resume.analysis_error_message ?? resume.error_message}
                  </p>
                ) : null}
                {expandedResumeId === resume.id ? (
                  <ResumeWorkspace resume={resume} />
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </div>

      {resumePendingDelete ? (
        <ConfirmDialog
          title="Remove this resume?"
          description={`${resumePendingDelete.source_filename} will be permanently deleted.`}
          confirmLabel="Remove"
          isConfirming={deletingId === resumePendingDelete.id}
          onCancel={() => setResumePendingDelete(null)}
          onConfirm={() => {
            const id = resumePendingDelete.id
            if (expandedResumeId === id) setExpandedResumeId(null)
            handleDelete(id)
            setResumePendingDelete(null)
          }}
        />
      ) : null}
    </section>
  )
}
