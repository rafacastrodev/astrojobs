import { useState } from 'react'

import type { Resume } from '../types'
import { AnalysisPanel } from './AnalysisPanel'
import { JobMatches } from './JobMatches'
import { ResumeProfileView } from './ResumeProfileView'

type Tab = 'resume' | 'analysis' | 'matches'

export const ResumeWorkspace = ({ resume }: { resume: Resume }) => {
  const [tab, setTab] = useState<Tab>('resume')
  const [analysisJobId, setAnalysisJobId] = useState<number | null>(null)

  return (
    <div className="mt-4 rounded-lg border border-border bg-input/40 p-4">
      <div className="mb-4 flex flex-wrap gap-2 text-sm">
        {(
          [
            ['resume', 'Full resume'],
            ['analysis', 'Score and tips'],
            ['matches', 'Matching jobs'],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => setTab(value)}
            className={`rounded-md px-3 py-1.5 ${tab === value ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'}`}
          >
            {label}
          </button>
        ))}
      </div>
      {tab === 'resume' ? <ResumeProfileView resume={resume} /> : null}
      {tab === 'analysis' ? (
        <AnalysisPanel resumeId={resume.id} initialJobId={analysisJobId} />
      ) : null}
      {tab === 'matches' ? (
        <JobMatches
          resumeId={resume.id}
          onAnalyze={(jobId) => {
            setAnalysisJobId(jobId)
            setTab('analysis')
          }}
        />
      ) : null}
    </div>
  )
}
