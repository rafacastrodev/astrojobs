import { z } from 'zod'

const envSchema = z.object({
  apiUrl: z.string(),
})

export const env = envSchema.parse({
  apiUrl: import.meta.env.VITE_API_URL,
})
