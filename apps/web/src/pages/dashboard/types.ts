export type Resume = {
  id: number
  payload: Record<string, unknown>
  source_filename: string
  status: 'draft' | 'synced' | 'failed'
  error_message: string | null
  analysis_status: 'pending' | 'completed' | 'failed'
  analysis_error_message: string | null
  created_at: string
  updated_at: string
  latest_analysis: AnalysisResult | null
}

export type JobMatch = {
  id: number
  title: string
  source_filename: string
  score: number
  matched_technologies?: string[]
  applied?: boolean
  payload: {
    technologies?: string[]
    description?: string
    requirements?: string[]
    responsibilities?: string[]
    seniority?: string
    work_mode?: string
    region?: string
    employment_type?: string
  }
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
  ats_category: 'low' | 'medium' | 'high'
  summary: string
  findings: string[]
  years_of_experience: number | null
  technologies: string[]
  companies: string[]
  created_at: string
  feedback: AnalysisFeedback | null
}

export type JobSummary = {
  id: number
  title: string
  source_filename: string
}
