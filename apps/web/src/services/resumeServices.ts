import type { Resume } from '@/pages/dashboard/types'
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

export const resumeServices = {
  list,
  upload,
  remove,
}
