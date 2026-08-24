import { LiveblocksProvider as Provider } from '@liveblocks/react'
import type { ReactNode } from 'react'

import { api } from '@/utils/api/client'

import '@/liveblocks.config'

export const LiveblocksProvider = ({ children }: { children: ReactNode }) => (
  <Provider
    authEndpoint={async () => {
      const response = await api.post<{ token: string }>('/auth/liveblocks')
      return response.data
    }}
  >
    {children}
  </Provider>
)
