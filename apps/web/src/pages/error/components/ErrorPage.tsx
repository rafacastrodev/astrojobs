import { Link, type ErrorComponentProps } from '@tanstack/react-router'

import { Button } from '@/components/Button'
import { RouteStatus } from '@/components/RouteStatus'

export const ErrorPage = ({ reset }: ErrorComponentProps) => {
  return (
    <RouteStatus
      code="Error"
      title="Something went wrong"
      description="An unexpected error stopped this page from loading."
    >
      <Button type="button" onClick={reset}>
        Try again
      </Button>
      <Link
        to="/login"
        className="text-sm text-muted-foreground underline underline-offset-2 hover:text-foreground"
      >
        Back to login
      </Link>
    </RouteStatus>
  )
}
