import { StatusBadge } from '@/components/StatusBadge'

type DocumentDetailProps = {
  filename: string
  payload: Record<string, unknown>
  status: 'draft' | 'synced' | 'failed'
  errorMessage?: string | null
  onClose: () => void
}

export const DocumentDetail = ({
  filename,
  payload,
  status,
  errorMessage,
  onClose,
}: DocumentDetailProps) => {
  return (
    <div className="rounded-2xl border border-border bg-card p-6 [animation:auth-fade-in_280ms_ease-out]">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold text-card-foreground">Extracted payload</h2>
            <StatusBadge
              status={status}
              label={status !== 'failed' ? 'Posted' : undefined}
            />
          </div>
          <p className="text-sm text-muted-foreground">{filename}</p>
          {errorMessage ? <p className="text-sm text-destructive">{errorMessage}</p> : null}
        </div>
        <button type="button" onClick={onClose} className="text-sm text-muted-foreground hover:text-foreground">
          Close
        </button>
      </div>
      <pre className="mt-4 overflow-x-auto rounded-xl bg-muted p-4 text-xs text-foreground">
        {JSON.stringify(payload, null, 2)}
      </pre>
    </div>
  )
}
