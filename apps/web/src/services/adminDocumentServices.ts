import type {
  AdminDocument,
  JobCreatePayload,
  RecruiterApplication,
} from '@/pages/admin/types'
import { api } from '@/utils/api/client'

async function listJobs() {
  const response = await api.get<AdminDocument[]>(
    '/recruiter/documents?type=job',
  )
  return response.data
}

async function createJob(payload: JobCreatePayload) {
  const response = await api.post<AdminDocument>('/recruiter/jobs', payload)
  return response.data
}

async function removeJob(id: number) {
  await api.delete(`/recruiter/documents/${id}`)
}

async function listTechnologies() {
  const response = await api.get<string[]>('/recruiter/technologies')
  return response.data
}

async function listApplications() {
  const response = await api.get<RecruiterApplication[]>(
    '/recruiter/applications',
  )
  return response.data
}

export const adminDocumentServices = {
  listJobs,
  createJob,
  removeJob,
  listTechnologies,
  listApplications,
}
