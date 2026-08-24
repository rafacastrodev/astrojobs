import type {
  AdminDocument,
  JobCreatePayload,
  CreateOfferPayload,
  RecruiterApplication,
  RecruiterMatch,
  ApplicationStatus,
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

async function closeJob(id: number) {
  const response = await api.post<AdminDocument>(`/recruiter/jobs/${id}/close`)
  return response.data
}

async function listMatches() {
  const response = await api.get<RecruiterMatch[]>('/recruiter/matches')
  return response.data
}

async function createOffer({
  jobId,
  resumeDocumentId,
  message,
}: CreateOfferPayload) {
  const response = await api.post(`/recruiter/jobs/${jobId}/offers`, {
    resume_document_id: resumeDocumentId,
    message,
  })
  return response.data
}

async function listTechnologies() {
  const response = await api.get<string[]>('/recruiter/technologies')
  return response.data
}

async function listApplications(jobId?: number) {
  const response = await api.get<RecruiterApplication[]>(
    '/recruiter/applications',
    { params: jobId == null ? undefined : { job_id: jobId } },
  )
  return response.data
}

async function updateApplicationStatus(
  applicationId: number,
  status: ApplicationStatus,
) {
  const response = await api.patch<RecruiterApplication>(
    `/recruiter/applications/${applicationId}`,
    { status },
  )
  return response.data
}

async function removeCandidate(applicationId: number) {
  const response = await api.delete<RecruiterApplication>(
    `/recruiter/applications/${applicationId}`,
  )
  return response.data
}

export const adminDocumentServices = {
  listJobs,
  createJob,
  removeJob,
  closeJob,
  listMatches,
  createOffer,
  listTechnologies,
  listApplications,
  updateApplicationStatus,
  removeCandidate,
}
