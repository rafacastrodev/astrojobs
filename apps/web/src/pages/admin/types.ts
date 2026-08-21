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
  results: Array<{ id: number; status: string; error?: string; pinecone_id?: string }>
}
