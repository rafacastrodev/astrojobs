import type { ReactNode } from 'react'

import { Logo } from '@/components/Logo'
import { ProfileLink } from '@/components/ProfileLink'

type AppHeaderProps = {
  title: string
  name: string
  photoUrl?: string | null
  children?: ReactNode
}

export const AppHeader = ({
  title,
  name,
  photoUrl,
  children,
}: AppHeaderProps) => (
  <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
    <div className="flex items-center gap-4">
      <Logo />
      <div>
        <p className="text-sm text-muted-foreground">AstroJobs</p>
        <h1 className="text-2xl font-semibold">{title}</h1>
      </div>
    </div>
    <div className="flex items-center gap-4">
      {children}
      <ProfileLink name={name} photoUrl={photoUrl} />
    </div>
  </header>
)
