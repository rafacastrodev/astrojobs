import type { JobSource, JobSummary, AnalysisResult } from '@/pages/dashboard/types'
import { api } from '@/utils/api/client'

type AnalyzeResumePayload = {
  job_source: JobSource
  job_document_id?: number
  job_text?: string
}

async function analyze(resumeId: number, payload: AnalyzeResumePayload) {
  const response = await api.post<AnalysisResult>(`/analysis/resumes/${resumeId}`, payload)
  return response.data
}

async function listJobs() {
  const response = await api.get<JobSummary[]>('/documents/jobs')
  return response.data
}

export const analysisServices = {
  analyze,
  listJobs,
}
