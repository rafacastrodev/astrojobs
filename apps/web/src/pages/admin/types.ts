export type DocumentType = 'resume' | 'job'
export type DocumentStatus = 'draft' | 'synced' | 'failed'

export type AdminDocument = {
  id: number
  type: DocumentType
  payload: Record<string, unknown>
  source_filename: string
  status: DocumentStatus
  pinecone_id: string | null
  error_message: string | null
  created_at: string
  updated_at: string
}

export type JobSeniority =
  | 'intern'
  | 'junior'
  | 'mid'
  | 'senior'
  | 'lead'
  | 'principal'
  | 'staff'

export type JobWorkMode = 'remote' | 'hybrid' | 'on-site'

export type JobEmploymentType =
  | 'full-time'
  | 'part-time'
  | 'contract'
  | 'internship'
  | 'temporary'

export type JobCreatePayload = {
  title: string
  technologies: string[]
  description: string
  seniority: JobSeniority
  work_mode: JobWorkMode
  region: string
  employment_type: JobEmploymentType
}

export type RecruiterApplication = {
  id: number
  created_at: string
  job_document_id: number
  job_title: string
  applicant_name: string
  applicant_email: string
  resume_document_id: number
  resume_filename: string
  resume_summary: string | null
  resume_technologies: string[]
  matched_technologies: string[]
  resume_payload: Record<string, unknown>
}
