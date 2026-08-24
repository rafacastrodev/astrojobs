import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'

import { analysisServices } from '@/services/analysisServices'
import { getApiErrorMessage } from '@/utils'

import type { JobSource } from '../types'

type Mode = 'ats' | 'job'
export const useResumeAnalysis = (
  resumeId: number,
  initialJobId?: number | null,
) => {
  const queryClient = useQueryClient()
  const [mode, setMode] = useState<Mode>('ats')
  const [selectedJobId, setSelectedJobId] = useState<number | null>(
    initialJobId ?? null,
  )

  useEffect(() => {
    if (initialJobId) {
      setMode('job')
      setSelectedJobId(initialJobId)
    }
  }, [initialJobId])

  const analysesQueryKey = ['resume-analyses', resumeId]

  const analyses = useQuery({
    queryKey: analysesQueryKey,
    queryFn: () => analysisServices.listAnalyses(resumeId),
  })

  const jobs = useQuery({
    queryKey: ['catalog-jobs'],
    queryFn: analysisServices.listJobs,
    enabled: mode === 'job',
  })

  const analyze = useMutation({
    mutationFn: () => {
      const jobSource: Exclude<JobSource, 'pasted'> =
        mode === 'ats' ? 'none' : 'catalog'
      return analysisServices.analyze(resumeId, {
        job_source: jobSource,
        job_document_id:
          jobSource === 'catalog' ? (selectedJobId ?? undefined) : undefined,
      })
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: analysesQueryKey }),
  })

  const canSubmit = mode === 'ats' || selectedJobId !== null

  return {
    mode,
    setMode,
    selectedJobId,
    setSelectedJobId,
    jobs: Array.isArray(jobs.data) ? jobs.data : [],
    jobsLoading: jobs.isLoading,
    canSubmit,
    run: () => analyze.mutate(),
    isAnalyzing: analyze.isPending,
    analyses: Array.isArray(analyses.data) ? analyses.data : [],
    analysesLoading: analyses.isLoading,
    error: analyze.isError ? getApiErrorMessage(analyze.error) : null,
  }
}
