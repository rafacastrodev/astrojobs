import { useMutation, useQuery } from '@tanstack/react-query'
import { useState } from 'react'

import { analysisServices } from '@/services/analysisServices'
import { getApiErrorMessage } from '@/utils'

import type { JobSource } from '../types'

type Mode = 'ats' | 'job'
type JobInputMode = 'catalog' | 'pasted'

export const useResumeAnalysis = (resumeId: number) => {
  const [mode, setMode] = useState<Mode>('ats')
  const [jobInputMode, setJobInputMode] = useState<JobInputMode>('catalog')
  const [selectedJobId, setSelectedJobId] = useState<number | null>(null)
  const [pastedText, setPastedText] = useState('')

  const jobs = useQuery({
    queryKey: ['catalog-jobs'],
    queryFn: analysisServices.listJobs,
    enabled: mode === 'job' && jobInputMode === 'catalog',
  })

  const analyze = useMutation({
    mutationFn: () => {
      const jobSource: JobSource =
        mode === 'ats' ? 'none' : jobInputMode === 'catalog' ? 'catalog' : 'pasted'
      return analysisServices.analyze(resumeId, {
        job_source: jobSource,
        job_document_id: jobSource === 'catalog' ? (selectedJobId ?? undefined) : undefined,
        job_text: jobSource === 'pasted' ? pastedText : undefined,
      })
    },
  })

  const canSubmit =
    mode === 'ats' ||
    (jobInputMode === 'catalog' && selectedJobId !== null) ||
    (jobInputMode === 'pasted' && pastedText.trim().length > 0)

  return {
    mode,
    setMode,
    jobInputMode,
    setJobInputMode,
    selectedJobId,
    setSelectedJobId,
    pastedText,
    setPastedText,
    jobs: Array.isArray(jobs.data) ? jobs.data : [],
    jobsLoading: jobs.isLoading,
    canSubmit,
    run: () => analyze.mutate(),
    isAnalyzing: analyze.isPending,
    result: analyze.data ?? null,
    error: analyze.isError ? getApiErrorMessage(analyze.error) : null,
  }
}
