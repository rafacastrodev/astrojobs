import { Button } from '@/components/Button'

import { AnalysisCard } from './AnalysisCard'
import { useResumeAnalysis } from '../hooks/useResumeAnalysis'

type AnalysisPanelProps = {
  resumeId: number
  initialJobId?: number | null
}

export const AnalysisPanel = ({
  resumeId,
  initialJobId,
}: AnalysisPanelProps) => {
  const {
    mode,
    setMode,
    selectedJobId,
    setSelectedJobId,
    jobs,
    jobsLoading,
    canSubmit,
    run,
    isAnalyzing,
    analyses,
    analysesLoading,
    error,
  } = useResumeAnalysis(resumeId, initialJobId)

  return (
    <div className="mt-4 rounded-lg border border-border bg-input/40 p-4">
      <div className="flex gap-2 text-sm">
        <button
          type="button"
          onClick={() => setMode('ats')}
          className={`cursor-pointer rounded-md px-3 py-1.5 ${
            mode === 'ats'
              ? 'bg-primary text-primary-foreground'
              : 'bg-transparent text-muted-foreground'
          }`}
        >
          General review
        </button>
        <button
          type="button"
          onClick={() => setMode('job')}
          className={`cursor-pointer rounded-md px-3 py-1.5 ${
            mode === 'job'
              ? 'bg-primary text-primary-foreground'
              : 'bg-transparent text-muted-foreground'
          }`}
        >
          Compare with job
        </button>
      </div>

      {mode === 'job' ? (
        <select
          value={selectedJobId ?? ''}
          onChange={(event) =>
            setSelectedJobId(
              event.target.value ? Number(event.target.value) : null,
            )
          }
          className="mt-3 w-full rounded-md border border-border bg-card p-2 text-sm text-card-foreground"
        >
          <option value="">
            {jobsLoading ? 'Loading jobs…' : 'Select a catalog job'}
          </option>
          {jobs.map((job) => (
            <option key={job.id} value={job.id}>
              {job.title}
            </option>
          ))}
        </select>
      ) : null}

      <div className="mt-4 w-40">
        <Button
          type="button"
          onClick={run}
          isLoading={isAnalyzing}
          disabled={!canSubmit}
          className="!py-2 text-sm"
        >
          Analyze
        </Button>
      </div>

      {error ? (
        <p role="alert" className="mt-3 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      {analysesLoading ? (
        <p className="mt-4 text-sm text-muted-foreground">
          Loading previous analyses…
        </p>
      ) : null}

      {analyses.length > 0 ? (
        <div className="mt-4 flex flex-col gap-3">
          {analyses.map((analysis) => (
            <AnalysisCard key={analysis.id} analysis={analysis} />
          ))}
        </div>
      ) : null}
    </div>
  )
}
