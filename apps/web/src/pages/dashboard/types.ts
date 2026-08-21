export type Resume = {
  id: number
  payload: Record<string, unknown>
  source_filename: string
  status: 'draft' | 'synced' | 'failed'
  error_message: string | null
  created_at: string
  updated_at: string
}
