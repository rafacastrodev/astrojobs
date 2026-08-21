import { ThumbDownIcon, ThumbUpIcon } from '@/components/icons'

import { useAnalysisFeedback } from '../hooks/useAnalysisFeedback'
import type { AnalysisResult } from '../types'

type AnalysisFeedbackProps = {
  analysis: AnalysisResult
}

const thumbClass = (isActive: boolean) =>
  `flex cursor-pointer items-center gap-1 rounded-md px-2 py-1 transition disabled:cursor-not-allowed disabled:opacity-60 ${
    isActive ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-card-foreground'
  }`

export const AnalysisFeedback = ({ analysis }: AnalysisFeedbackProps) => {
  const {
    rating,
    isCorrecting,
    startCorrecting,
    cancelCorrecting,
    expectedScore,
    setExpectedScore,
    comment,
    setComment,
    scoreIsValid,
    agree,
    disagree,
    isSubmitting,
    error,
  } = useAnalysisFeedback(analysis)

  return (
    <div className="mt-4 border-t border-border pt-3">
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="text-muted-foreground">Essa análise faz sentido?</span>
        <button
          type="button"
          onClick={agree}
          disabled={isSubmitting}
          aria-pressed={rating === 'up'}
          aria-label="Concordo com a análise"
          className={thumbClass(rating === 'up')}
        >
          <ThumbUpIcon className="h-3.5 w-3.5" />
          Faz
        </button>
        <button
          type="button"
          onClick={startCorrecting}
          disabled={isSubmitting}
          aria-pressed={rating === 'down'}
          aria-label="Discordo da análise"
          className={thumbClass(rating === 'down')}
        >
          <ThumbDownIcon className="h-3.5 w-3.5" />
          Não faz
        </button>
      </div>

      {isCorrecting ? (
        <div className="mt-3 flex flex-col gap-2">
          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            Qual seria a nota?
            <input
              type="number"
              min={0}
              max={100}
              value={expectedScore}
              onChange={(event) => setExpectedScore(event.target.value)}
              placeholder="0-100"
              className="w-24 rounded-md border border-border bg-card p-1.5 text-sm text-card-foreground"
            />
          </label>
          <textarea
            value={comment}
            onChange={(event) => setComment(event.target.value)}
            placeholder="O que está errado? (opcional)"
            rows={2}
            className="rounded-md border border-border bg-card p-2 text-sm text-card-foreground"
          />
          {!scoreIsValid ? (
            <p className="text-xs text-destructive">A nota precisa ser um inteiro de 0 a 100.</p>
          ) : null}
          <div className="flex gap-3 text-xs">
            <button
              type="button"
              onClick={disagree}
              disabled={isSubmitting || !scoreIsValid}
              className="cursor-pointer font-semibold text-card-foreground disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? 'Enviando…' : 'Enviar'}
            </button>
            <button
              type="button"
              onClick={cancelCorrecting}
              className="cursor-pointer text-muted-foreground hover:text-card-foreground"
            >
              Cancelar
            </button>
          </div>
        </div>
      ) : null}

      {!isCorrecting && analysis.feedback?.expected_score != null ? (
        <p className="mt-2 text-xs text-muted-foreground">
          Sua nota: {analysis.feedback.expected_score}/100
          {analysis.feedback.comment ? ` · ${analysis.feedback.comment}` : ''}
        </p>
      ) : null}

      {error ? (
        <p role="alert" className="mt-2 text-xs text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  )
}
