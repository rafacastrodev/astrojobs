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
}

export type JobSummary = {
  id: number
  title: string
  source_filename: string
}
