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

export type SyncDocumentsResponse = {
  synced: number
  failed: number
  skipped: number
  results: Array<{
    id: number
    status: string
    error?: string
    pinecone_id?: string
  }>
}

export type JobCreatePayload = {
  title: string
  requirements: string[]
  responsibilities: string[]
  seniority:
    | 'intern'
    | 'junior'
    | 'mid'
    | 'senior'
    | 'lead'
    | 'principal'
    | 'staff'
    | 'unspecified'
  employment_type:
    | 'full-time'
    | 'part-time'
    | 'contract'
    | 'internship'
    | 'temporary'
    | 'unspecified'
}
