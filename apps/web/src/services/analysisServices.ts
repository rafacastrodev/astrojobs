import type {
  AnalysisFeedback,
  AnalysisResult,
  FeedbackRating,
  JobSource,
  JobSummary,
} from '@/pages/dashboard/types'
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

async function listAnalyses(resumeId: number) {
  const response = await api.get<AnalysisResult[]>(`/analysis/resumes/${resumeId}`)
  return response.data
}

async function listJobs() {
  const response = await api.get<JobSummary[]>('/documents/jobs')
  return response.data
}

type FeedbackPayload = {
  rating: FeedbackRating
  expected_score?: number
  comment?: string
}

async function submitFeedback(analysisId: number, payload: FeedbackPayload) {
  const response = await api.put<AnalysisFeedback>(
    `/analysis/${analysisId}/feedback`,
    payload,
  )
  return response.data
}

export const analysisServices = {
  analyze,
  listAnalyses,
  listJobs,
  submitFeedback,
}
