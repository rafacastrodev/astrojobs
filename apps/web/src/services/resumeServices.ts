import type { JobMatch, Resume } from '@/pages/dashboard/types'
import { api } from '@/utils/api/client'

async function list() {
  const response = await api.get<Resume[]>('/documents/resumes')
  return response.data
}

async function upload(file: File) {
  const body = new FormData()
  body.append('file', file)
  const response = await api.post<Resume>('/documents/resumes', body)
  return response.data
}

async function remove(id: number) {
  await api.delete(`/documents/resumes/${id}`)
}

async function get(id: number) {
  const response = await api.get<Resume>(`/documents/resumes/${id}`)
  return response.data
}

async function matches(id: number) {
  const response = await api.get<JobMatch[]>(
    `/documents/resumes/${id}/matches?top_k=5`,
  )
  return response.data
}

async function process(id: number, forceAnalysis = false) {
  const response = await api.post<Resume>(`/documents/resumes/${id}/process`, {
    force_analysis: forceAnalysis,
  })
  return response.data
}

export const resumeServices = {
  list,
  get,
  matches,
  upload,
  remove,
  process,
}
