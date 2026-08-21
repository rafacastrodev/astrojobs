import { Link } from '@tanstack/react-router'

import { RouteStatus } from '@/components/RouteStatus'

export const NotFoundPage = () => {
  return (
    <RouteStatus
      code="404"
      title="Page not found"
      description="This URL doesn’t match any route in AstroJobs."
    >
      <Link
        to="/login"
        className="w-full rounded-lg bg-primary px-4 py-2.5 text-center font-medium text-primary-foreground transition hover:opacity-90"
      >
        Back to login
      </Link>
    </RouteStatus>
  )
}
