import { useRef, useState } from 'react'

import { Button } from '@/components/Button'

import { ACCEPTED_EXTENSIONS, useResumes } from '../hooks/useResumes'
import type { Resume } from '../types'

const STATUS_LABELS: Record<Resume['status'], string> = {
  draft: 'Awaiting indexing',
  synced: 'Indexed',
  failed: 'Indexing failed',
}

export const ResumeSection = () => {
  const inputRef = useRef<HTMLInputElement>(null)
  const [isDraggingOver, setIsDraggingOver] = useState(false)
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
                className="flex flex-col gap-3 rounded-xl border border-border p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium text-card-foreground">
                    {resume.source_filename}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {STATUS_LABELS[resume.status]} ·{' '}
                    {new Date(resume.created_at).toLocaleDateString()}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleDelete(resume.id)}
                  disabled={deletingId === resume.id}
                  className="shrink-0 cursor-pointer text-sm text-muted-foreground transition hover:text-destructive disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {deletingId === resume.id ? 'Removing…' : 'Remove'}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}
