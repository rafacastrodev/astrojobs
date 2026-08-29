import type { QueryClient } from '@tanstack/react-query'
import { Outlet, createRootRouteWithContext } from '@tanstack/react-router'
import type { ErrorComponentProps } from '@tanstack/react-router'
import type { ReactNode } from 'react'

import { Footer } from '@/components/Footer'
import { ErrorPage } from '@/pages/error/components/ErrorPage'
import { NotFoundPage } from '@/pages/not-found/components/NotFoundPage'

export const Route = createRootRouteWithContext<{
  queryClient: QueryClient
}>()({
  component: RootComponent,
  notFoundComponent: RootNotFound,
  errorComponent: RootError,
})

function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <div className="flex flex-1 flex-col">{children}</div>
      <Footer />
    </div>
  )
}

function RootComponent() {
  return (
    <AppShell>
      <Outlet />
    </AppShell>
  )
}

function RootNotFound() {
  return <NotFoundPage />
}

function RootError(props: ErrorComponentProps) {
  return <ErrorPage {...props} />
}
