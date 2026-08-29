import type {
  AnalysisFeedback,
  AnalysisResult,
  FeedbackRating,
  JobMatch,
  JobSource,
} from '@/pages/dashboard/types'
import { api } from '@/utils/api/client'

type AnalyzeResumePayload = {
  job_source: Exclude<JobSource, 'pasted'>
  job_document_id?: number
}

async function analyze(resumeId: number, payload: AnalyzeResumePayload) {
  const response = await api.post<AnalysisResult>(
    `/analysis/resumes/${resumeId}`,
    payload,
  )
  return response.data
}

async function listAnalyses(resumeId: number) {
  const response = await api.get<AnalysisResult[]>(
    `/analysis/resumes/${resumeId}`,
  )
  return response.data
}

async function listJobs(resumeId?: number) {
  const response = await api.get<JobMatch[]>('/documents/jobs', {
    params: resumeId == null ? undefined : { resume_id: resumeId },
  })
  return response.data
}

async function applyToJob(jobId: number, resumeDocumentId: number) {
  const response = await api.post(`/documents/jobs/${jobId}/apply`, {
    resume_document_id: resumeDocumentId,
  })
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
  applyToJob,
  submitFeedback,
}
