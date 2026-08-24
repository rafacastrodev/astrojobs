import { Button } from '@/components/Button'
import { StatusBadge } from '@/components/StatusBadge'

import type { AdminDocument } from '../types'

type DocumentListProps = {
  documents: AdminDocument[]
  emptyLabel: string
  onSelect: (document: AdminDocument) => void
  onDelete: (id: number) => void
  isDeleting: boolean
}

export const DocumentList = ({
  documents,
  emptyLabel,
  onSelect,
  onDelete,
  isDeleting,
}: DocumentListProps) => {
  if (documents.length === 0) {
    return <p className="text-sm text-muted-foreground">{emptyLabel}</p>
  }

  return (
    <ul className="divide-y divide-border rounded-2xl border border-border bg-card">
      {documents.map((document) => {
        const label =
          document.type === 'job' &&
          typeof document.payload.title === 'string'
            ? document.payload.title
            : document.source_filename
        return (
          <li
            key={document.id}
            className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between"
          >
            <button
              type="button"
              onClick={() => onSelect(document)}
              className="text-left"
            >
              <p className="font-medium text-card-foreground">{label}</p>
              {document.type === 'job' &&
              Array.isArray(document.payload.technologies) &&
              document.payload.technologies.length > 0 ? (
                <p className="mt-1 text-sm text-muted-foreground">
                  {document.payload.technologies
                    .filter((item): item is string => typeof item === 'string')
                    .join(' · ')}
                </p>
              ) : null}
              {document.type === 'job' ? (
                <p className="mt-1 text-xs text-muted-foreground">
                  {[
                    document.payload.seniority,
                    document.payload.work_mode,
                    document.payload.region,
                    document.payload.employment_type,
                  ]
                    .filter((item): item is string => typeof item === 'string')
                    .join(' · ')}
                </p>
              ) : null}
              <p className="mt-1 text-xs text-muted-foreground">
                {new Date(document.created_at).toLocaleString()}
              </p>
            </button>
            <div className="flex items-center gap-3">
              <StatusBadge
                status={document.status}
                label={
                  document.type === 'job' && document.status !== 'failed'
                    ? 'Posted'
                    : undefined
                }
              />
              <div className="w-24">
                <Button
                  type="button"
                  onClick={() => onDelete(document.id)}
                  isLoading={isDeleting}
                  className="!bg-muted !py-2 !text-sm !text-muted-foreground"
                >
                  Delete
                </Button>
              </div>
            </div>
          </li>
        )
      })}
    </ul>
  )
}
