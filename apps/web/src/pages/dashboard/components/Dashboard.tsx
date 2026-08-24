import { AppHeader } from '@/components/AppHeader'
import { Button } from '@/components/Button'

import { useDashboard } from '../hooks/useDashboard'
import { JobsSection } from './JobsSection'
import { ResumeSection } from './ResumeSection'

type DashboardProps = {
  name: string
  photoUrl?: string | null
}

export const Dashboard = ({ name, photoUrl }: DashboardProps) => {
  const { handleLogout, isLoggingOut } = useDashboard()

  return (
    <div className="flex-1 bg-background px-4 py-10 text-foreground [animation:auth-fade-in_280ms_ease-out]">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-8">
        <AppHeader title="Dashboard" name={name} photoUrl={photoUrl}>
          <div className="w-28">
            <Button
              onClick={handleLogout}
              isLoading={isLoggingOut}
              className="!py-2 text-sm"
            >
              Log out
            </Button>
          </div>
        </AppHeader>

        <main className="flex flex-col gap-8">
          <ResumeSection />
          <JobsSection />
        </main>
      </div>
    </div>
  )
}
