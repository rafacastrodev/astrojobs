export type Resume = {
  id: number
  payload: Record<string, unknown>
  source_filename: string
  status: 'draft' | 'synced' | 'failed'
  error_message: string | null
  created_at: string
  updated_at: string
}

export type JobSource = 'none' | 'catalog' | 'pasted'

export type FeedbackRating = 'up' | 'down'

export type AnalysisFeedback = {
  rating: FeedbackRating
  expected_score: number | null
  comment: string | null
  updated_at: string
}

export type AnalysisResult = {
  id: number
  resume_document_id: number
  job_source: JobSource
  job_document_id: number | null
  job_title: string | null
  score: number
  summary: string
  findings: string[]
  created_at: string
  feedback: AnalysisFeedback | null
}

export type JobSummary = {
  id: number
  title: string
  source_filename: string
}
