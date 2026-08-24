import type { ChangeEvent } from 'react'

type DocumentUploadProps = {
  accept: string
  isLoading: boolean
  onUpload: (file: File) => void
  error?: string | null
}

export const DocumentUpload = ({ accept, isLoading, onUpload, error }: DocumentUploadProps) => {
  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    onUpload(file)
    event.target.value = ''
  }

  return (
    <div className="rounded-2xl border border-dashed border-border bg-card p-6">
      <p className="text-sm text-muted-foreground">
        PDF, DOCX, TXT, or MD. Original file is discarded after extract.
      </p>
      <input
        type="file"
        accept={accept}
        className="mt-4 block w-full text-sm text-muted-foreground file:mr-4 file:rounded-lg file:border-0 file:bg-primary file:px-4 file:py-2.5 file:text-sm file:font-medium file:text-primary-foreground disabled:opacity-60"
        onChange={handleChange}
        disabled={isLoading}
      />
      {isLoading ? <p className="mt-3 text-sm text-muted-foreground">Processing…</p> : null}
      {error ? <p className="mt-3 text-sm text-destructive">{error}</p> : null}
    </div>
  )
}
