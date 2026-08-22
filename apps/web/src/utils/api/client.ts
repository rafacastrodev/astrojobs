import axios from 'axios'

import { env } from '@/utils/env/config'

export const api = axios.create({
  baseURL: env.API_URL,
  withCredentials: true,
})
