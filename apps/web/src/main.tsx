import { QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider } from '@tanstack/react-router'
import { StrictMode } from 'react'
import type { ReactNode } from 'react'
import { createRoot } from 'react-dom/client'
import { AuthProvider } from 'react-oidc-context'

import { queryClient, router } from './router'
import { cognitoAuthConfig } from './utils/auth/cognito'
import './styles.css'

const root = document.getElementById('root')

if (!root) {
  throw new Error('Root element not found')
}

// Mounted only when a pool is configured, so the app still runs on
// email/password alone when the VITE_COGNITO_* values are absent.
const WithCognito = ({ children }: { children: ReactNode }) =>
  cognitoAuthConfig ? (
    <AuthProvider {...cognitoAuthConfig}>{children}</AuthProvider>
  ) : (
    children
  )

createRoot(root).render(
  <StrictMode>
    <WithCognito>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </WithCognito>
  </StrictMode>,
)
