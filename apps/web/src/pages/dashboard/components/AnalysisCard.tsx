import type { AnalysisResult } from '../types'

type AnalysisCardProps = {
  analysis: AnalysisResult
}

const jobLabel = (analysis: AnalysisResult) => {
  if (analysis.job_source === 'none') return 'Verificação geral'
  return analysis.job_title ?? 'Comparação com vaga'
}

export const AnalysisCard = ({ analysis }: AnalysisCardProps) => (
  <div className="rounded-lg border border-border bg-card p-4">
    <div className="flex flex-wrap items-baseline justify-between gap-2">
      <p className="text-2xl font-semibold text-card-foreground">{analysis.score}/100</p>
      <p className="text-xs text-muted-foreground">
        {jobLabel(analysis)} · {new Date(analysis.created_at).toLocaleString()}
      </p>
    </div>
    <p className="mt-1 text-sm text-muted-foreground">{analysis.summary}</p>
    <ul className="mt-3 flex flex-col gap-1 text-sm text-card-foreground">
      {analysis.findings.map((finding, index) => (
        <li key={index}>• {finding}</li>
      ))}
    </ul>
  </div>
)
