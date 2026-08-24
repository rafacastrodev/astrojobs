import { Button } from '@/components/Button'
import { StatusBadge } from '@/components/StatusBadge'

import type { AdminDocument } from '../types'

type DocumentListProps = {
  documents: AdminDocument[]
  selectedIds: number[]
  onToggle: (id: number) => void
  onSelectAll: () => void
  onClearSelection: () => void
  onSelect: (document: AdminDocument) => void
  onDelete: (id: number) => void
  isDeleting: boolean
}

export const DocumentList = ({
  documents,
  selectedIds,
  onToggle,
  onSelectAll,
  onClearSelection,
  onSelect,
  onDelete,
  isDeleting,
}: DocumentListProps) => {
  if (documents.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No documents yet. Upload one to get started.
      </p>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <div className="w-28">
          <Button type="button" onClick={onSelectAll} className="!py-2 text-sm">
            Select all
          </Button>
        </div>
        <div className="w-28">
          <Button
            type="button"
            onClick={onClearSelection}
            className="!bg-muted !text-muted-foreground !py-2 text-sm"
          >
            Clear
          </Button>
        </div>
      </div>
      <ul className="divide-y divide-border rounded-2xl border border-border bg-card">
        {documents.map((document) => {
          const checked = selectedIds.includes(document.id)
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
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => onToggle(document.id)}
                  className="mt-1"
                  aria-label={`Select ${label}`}
                />
                <button
                  type="button"
                  onClick={() => onSelect(document)}
                  className="text-left"
                >
                  <p className="font-medium text-card-foreground">{label}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {new Date(document.created_at).toLocaleString()}
                  </p>
                </button>
              </div>
              <div className="flex items-center gap-3">
                <StatusBadge status={document.status} />
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
    </div>
  )
}
