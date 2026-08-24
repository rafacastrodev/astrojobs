import { api } from '@/utils/api/client'

async function listRegions() {
  const response = await api.get<string[]>('/regions')
  return response.data
}

export const catalogServices = {
  listRegions,
}
