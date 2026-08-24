import type { ResumeMatch } from '../types'

type CandidateDetailProps = {
  match: ResumeMatch
  onClose: () => void
}

const asList = (value: unknown) => {
  if (!Array.isArray(value)) return []
  return value
    .map((item) => (typeof item === 'string' ? item.trim() : ''))
    .filter(Boolean)
}

export const CandidateDetail = ({ match, onClose }: CandidateDetailProps) => {
  const skills = asList(match.payload.skills)
  const technologies = asList(match.payload.technologies)
  const summary =
    match.summary ||
    (typeof match.payload.summary === 'string' ? match.payload.summary : '')

  return (
    <div className="rounded-2xl border border-border bg-card p-6 [animation:auth-fade-in_280ms_ease-out]">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <h2 className="text-lg font-semibold text-card-foreground">
            {match.source_filename}
          </h2>
          <p className="text-sm text-muted-foreground">
            {Math.round(Math.max(0, Math.min(1, match.score)) * 100)}% match
            {match.matched_jobs.length > 0
              ? ` · ${match.matched_jobs.map((job) => job.title).join(', ')}`
              : ''}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="cursor-pointer text-sm text-muted-foreground hover:text-foreground"
        >
          Close
        </button>
      </div>
      {match.matched_technologies.length > 0 ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {match.matched_technologies.map((tech) => (
            <span
              key={tech}
              className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-card-foreground"
            >
              {tech}
            </span>
          ))}
        </div>
      ) : null}
      {summary ? (
        <p className="mt-4 text-sm text-muted-foreground">{summary}</p>
      ) : null}
      {skills.length > 0 || technologies.length > 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">
          {(skills.length > 0 ? skills : technologies).join(' · ')}
        </p>
      ) : null}
    </div>
  )
}