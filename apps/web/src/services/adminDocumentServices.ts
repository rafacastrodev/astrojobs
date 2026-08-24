import type {
  AdminDocument,
  DocumentStatus,
  DocumentType,
  JobCreatePayload,
  ResumeMatch,
} from '@/pages/admin/types'
import { api } from '@/utils/api/client'

async function list(type: DocumentType, status?: DocumentStatus) {
  const params = new URLSearchParams({ type })
  if (status) params.set('status', status)

  const response = await api.get<AdminDocument[]>(
    `/recruiter/documents?${params.toString()}`,
  )
  return response.data
}

async function upload(type: DocumentType, file: File) {
  const body = new FormData()
  body.append('file', file)
  body.append('type', type)
  const response = await api.post<AdminDocument>('/recruiter/documents', body)
  return response.data
}

async function remove(id: number) {
  await api.delete(`/recruiter/documents/${id}`)
}

async function createJob(payload: JobCreatePayload) {
  const response = await api.post<AdminDocument>('/recruiter/jobs', payload)
  return response.data
}

async function listMatches() {
  const response = await api.get<ResumeMatch[]>('/recruiter/matches')
  return response.data
}

export const adminDocumentServices = {
  list,
  upload,
  remove,
  createJob,
  listMatches,
}
