import { api } from '@/utils/api/client'

export type CurrentUser = {
  id: number
  name: string
  email: string
  role: 'user' | 'admin'
  created_at: string
}

export const getCurrentUser = async (): Promise<CurrentUser | null> => {
  try {
    const response = await api.get<CurrentUser>('/auth/me')
    return response.data
  } catch {
    return null
  }
}
