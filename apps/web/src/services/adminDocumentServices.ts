import type {
  AdminDocument,
  DocumentStatus,
  DocumentType,
  JobCreatePayload,
  SyncDocumentsResponse,
} from '@/pages/admin/types'
import { api } from '@/utils/api/client'

async function list(type: DocumentType, status?: DocumentStatus) {
  const params = new URLSearchParams({ type })
  if (status) params.set('status', status)

  const response = await api.get<AdminDocument[]>(
    `/admin/documents?${params.toString()}`,
  )
  return response.data
}

async function upload(type: DocumentType, file: File) {
  const body = new FormData()
  body.append('file', file)
  body.append('type', type)
  const response = await api.post<AdminDocument>('/admin/documents', body)
  return response.data
}

async function sync(ids?: number[]) {
  const response = await api.post<SyncDocumentsResponse>(
    '/admin/documents/sync',
    { ids: ids?.length ? ids : null },
  )
  return response.data
}

async function remove(id: number) {
  await api.delete(`/admin/documents/${id}`)
}

async function createJob(payload: JobCreatePayload) {
  const response = await api.post<AdminDocument>('/admin/jobs', payload)
  return response.data
}

export const adminDocumentServices = {
  list,
  upload,
  sync,
  remove,
  createJob,
}
