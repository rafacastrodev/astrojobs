import type { QueryClient } from '@tanstack/react-query'
import { Outlet, createRootRouteWithContext } from '@tanstack/react-router'

import { ErrorPage } from '@/pages/error/components/ErrorPage'
import { NotFoundPage } from '@/pages/not-found/components/NotFoundPage'

export const Route = createRootRouteWithContext<{
  queryClient: QueryClient
}>()({
  component: RootComponent,
  notFoundComponent: NotFoundPage,
  errorComponent: ErrorPage,
})

function RootComponent() {
  return (
    <>
      <Outlet />
    </>
  )
}
