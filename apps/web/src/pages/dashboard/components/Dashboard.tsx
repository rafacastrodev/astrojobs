import { Link } from '@tanstack/react-router'

import { Button } from '@/components/Button'
import { Logo } from '@/components/Logo'

import { useDashboard } from '../hooks/useDashboard'
import { ResumeSection } from './ResumeSection'

type DashboardProps = {
  name: string
  role: 'user' | 'admin'
}

export const Dashboard = ({ name, role }: DashboardProps) => {
  const { handleLogout, isLoggingOut } = useDashboard()

  return (
    <div className="min-h-screen bg-background px-4 py-10 text-foreground [animation:auth-fade-in_280ms_ease-out]">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-8">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <Logo />
            <div>
              <p className="text-sm text-muted-foreground">AstroJobs</p>
              <h1 className="text-2xl font-semibold">Dashboard</h1>
              <p className="text-sm text-muted-foreground">Signed in as {name}</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {role === 'admin' ? (
              <Link
                to="/admin"
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                Open admin
              </Link>
            ) : null}
            <div className="w-28">
              <Button onClick={handleLogout} isLoading={isLoggingOut} className="!py-2 text-sm">
                Log out
              </Button>
            </div>
          </div>
        </header>

        <ResumeSection />
      </div>
    </div>
  )
}
