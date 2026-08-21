import { Button } from '@/components/Button'

import { useResumeAnalysis } from '../hooks/useResumeAnalysis'

type AnalysisPanelProps = {
  resumeId: number
}

export const AnalysisPanel = ({ resumeId }: AnalysisPanelProps) => {
  const {
    mode,
    setMode,
    jobInputMode,
    setJobInputMode,
    selectedJobId,
    setSelectedJobId,
    pastedText,
    setPastedText,
    jobs,
    jobsLoading,
    canSubmit,
    run,
    isAnalyzing,
    result,
    error,
  } = useResumeAnalysis(resumeId)

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
          Verificação geral
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
          Comparar com vaga
        </button>
      </div>

      {mode === 'job' ? (
        <div className="mt-3 flex flex-col gap-3">
          <div className="flex gap-3 text-xs text-muted-foreground">
            <button
              type="button"
              onClick={() => setJobInputMode('catalog')}
              className={`cursor-pointer ${jobInputMode === 'catalog' ? 'font-semibold text-card-foreground' : ''}`}
            >
              Escolher vaga cadastrada
            </button>
            <span>·</span>
            <button
              type="button"
              onClick={() => setJobInputMode('pasted')}
              className={`cursor-pointer ${jobInputMode === 'pasted' ? 'font-semibold text-card-foreground' : ''}`}
            >
              Colar descrição
            </button>
          </div>

          {jobInputMode === 'catalog' ? (
            <select
              value={selectedJobId ?? ''}
              onChange={(event) =>
                setSelectedJobId(event.target.value ? Number(event.target.value) : null)
              }
              className="rounded-md border border-border bg-card p-2 text-sm text-card-foreground"
            >
              <option value="">{jobsLoading ? 'Carregando vagas…' : 'Selecione uma vaga'}</option>
              {jobs.map((job) => (
                <option key={job.id} value={job.id}>
                  {job.title}
                </option>
              ))}
            </select>
          ) : (
            <textarea
              value={pastedText}
              onChange={(event) => setPastedText(event.target.value)}
              placeholder="Cole aqui a descrição da vaga"
              rows={4}
              className="rounded-md border border-border bg-card p-2 text-sm text-card-foreground"
            />
          )}
        </div>
      ) : null}

      <div className="mt-4 w-40">
        <Button
          type="button"
          onClick={run}
          isLoading={isAnalyzing}
          disabled={!canSubmit}
          className="!py-2 text-sm"
        >
          Analisar
        </Button>
      </div>

      {error ? (
        <p role="alert" className="mt-3 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      {result ? (
        <div className="mt-4 rounded-lg border border-border bg-card p-4">
          <p className="text-2xl font-semibold text-card-foreground">{result.score}/100</p>
          <p className="mt-1 text-sm text-muted-foreground">{result.summary}</p>
          <ul className="mt-3 flex flex-col gap-1 text-sm text-card-foreground">
            {result.findings.map((finding, index) => (
              <li key={index}>• {finding}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  )
}
