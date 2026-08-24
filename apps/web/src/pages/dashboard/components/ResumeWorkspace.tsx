import { useState } from 'react'

import type { Resume } from '../types'
import { AnalysisFeedback } from './AnalysisFeedback'
import { AnalysisPanel } from './AnalysisPanel'
import { JobMatches } from './JobMatches'
import { ResumeProfileView } from './ResumeProfileView'

export const ResumeWorkspace = ({ resume }: { resume: Resume }) => {
  const [analysisJobId, setAnalysisJobId] = useState<number | null>(null)
  const analysis = resume.latest_analysis

  return (
    <div className="mt-4 space-y-8 border-t border-border pt-6">
      <section>
        <h3 className="text-base font-semibold text-card-foreground">Resume</h3>
        <div className="mt-3">
          <ResumeProfileView payload={resume.payload} analysis={analysis} />
        </div>
      </section>

      <section>
        <h3 className="text-base font-semibold text-card-foreground">
          Suggestions
        </h3>
        {analysis ? (
          <div className="mt-3">
            <ul className="flex flex-col gap-1 text-sm text-card-foreground">
              {analysis.findings.map((finding, index) => (
                <li key={index}>• {finding}</li>
              ))}
            </ul>
            {analysis.summary ? (
              <p className="mt-3 text-sm text-muted-foreground">
                {analysis.summary}
              </p>
            ) : null}
            <AnalysisFeedback analysis={analysis} />
          </div>
        ) : resume.analysis_status === 'pending' ? (
          <p className="mt-3 text-sm text-muted-foreground">
            ATS analysis is still running…
          </p>
        ) : resume.analysis_status === 'failed' ? (
          <p role="alert" className="mt-3 text-sm text-destructive">
            {resume.analysis_error_message ?? 'ATS analysis failed.'}
          </p>
        ) : (
          <p className="mt-3 text-sm text-muted-foreground">
            No ATS analysis yet.
          </p>
        )}
        <AnalysisPanel
          resumeId={resume.id}
          initialJobId={analysisJobId}
          hiddenAnalysisId={analysis?.id}
        />
      </section>

      <section>
        <h3 className="text-base font-semibold text-card-foreground">
          Matching jobs
        </h3>
        <div className="mt-3">
          <JobMatches
            resumeId={resume.id}
            onAnalyze={(jobId) => setAnalysisJobId(jobId)}
          />
        </div>
      </section>
    </div>
  )
}
