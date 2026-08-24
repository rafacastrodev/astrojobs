import type { ResumeMatch } from '../types'

type CandidateListProps = {
  matches: ResumeMatch[]
  emptyLabel: string
  onSelect: (match: ResumeMatch) => void
}

export const CandidateList = ({
  matches,
  emptyLabel,
  onSelect,
}: CandidateListProps) => {
  if (matches.length === 0) {
    return <p className="text-sm text-muted-foreground">{emptyLabel}</p>
  }

  return (
    <ul className="divide-y divide-border rounded-2xl border border-border bg-card">
      {matches.map((match) => (
        <li key={match.id}>
          <button
            type="button"
            onClick={() => onSelect(match)}
            className="flex w-full cursor-pointer flex-col gap-2 px-4 py-4 text-left transition hover:bg-muted/40"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <p className="font-medium text-card-foreground">
                {match.source_filename}
              </p>
              <span className="rounded-full bg-input px-3 py-1 text-xs font-medium">
                {Math.round(Math.max(0, Math.min(1, match.score)) * 100)}% match
              </span>
            </div>
            {match.matched_technologies.length > 0 ? (
              <p className="text-sm text-muted-foreground">
                {match.matched_technologies.join(' · ')}
              </p>
            ) : null}
            {match.matched_jobs.length > 0 ? (
              <p className="text-xs text-muted-foreground">
                {match.matched_jobs.map((job) => job.title).join(' · ')}
              </p>
            ) : null}
          </button>
        </li>
      ))}
    </ul>
  )
}