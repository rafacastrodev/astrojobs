import { useQuery } from '@tanstack/react-query'

import { Button } from '@/components/Button'
import { resumeServices } from '@/services/resumeServices'
import { getApiErrorMessage } from '@/utils'

type Props = {
  resumeId: number
  onAnalyze: (jobId: number) => void
}

export const JobMatches = ({ resumeId, onAnalyze }: Props) => {
  const query = useQuery({
    queryKey: ['resume-matches', resumeId],
    queryFn: () => resumeServices.matches(resumeId),
  })

  if (query.isLoading)
    return (
      <p className="text-sm text-muted-foreground">Finding matching jobs…</p>
    )
  if (query.isError)
    return (
      <p role="alert" className="text-sm text-destructive">
        {getApiErrorMessage(query.error)}
      </p>
    )
  const matches = query.data ?? []
  if (!matches.length)
    return (
      <p className="text-sm text-muted-foreground">No indexed jobs found.</p>
    )

  return (
    <ul className="space-y-3">
      {matches.map((match) => (
        <li
          key={match.id}
          className="rounded-lg border border-border bg-card p-4"
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="font-semibold text-card-foreground">
                {match.title}
              </p>
              <p className="text-xs text-muted-foreground">
                {[match.payload.seniority, match.payload.employment_type]
                  .filter(Boolean)
                  .join(' · ')}
              </p>
            </div>
            <span className="rounded-full bg-input px-3 py-1 text-sm font-medium">
              {Math.round(Math.max(0, Math.min(1, match.score)) * 100)}% similar
            </span>
          </div>
          {match.payload.requirements?.length ? (
            <p className="mt-3 text-sm text-muted-foreground">
              {match.payload.requirements.slice(0, 3).join(' · ')}
            </p>
          ) : null}
          <div className="mt-3 w-44">
            <Button
              type="button"
              onClick={() => onAnalyze(match.id)}
              className="!py-2 text-sm"
            >
              Detailed analysis
            </Button>
          </div>
        </li>
      ))}
    </ul>
  )
}
