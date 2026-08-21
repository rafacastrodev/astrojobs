import { createServerFn } from '@tanstack/react-start'
import { getCookie } from '@tanstack/react-start/server'

const API_URL = import.meta.env.VITE_API_URL as string

export type CurrentUser = {
  id: number
  name: string
  email: string
  role: 'user' | 'admin'
  created_at: string
}

export const getCurrentUser = createServerFn({ method: 'GET' }).handler(
  async (): Promise<CurrentUser | null> => {
    const token = getCookie('jwt')
    if (!token) return null

    try {
      const response = await fetch(`${API_URL}/auth/me`, {
        headers: { cookie: `jwt=${token}` },
      })
      if (!response.ok) return null
      return (await response.json()) as CurrentUser
    } catch {
      return null
    }
  },
)
