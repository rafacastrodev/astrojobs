import type { ReactNode } from 'react'

import { Logo } from '@/components/Logo'

type RouteStatusProps = {
  code: string
  title: string
  description: string
  children: ReactNode
}

export const RouteStatus = ({
  code,
  title,
  description,
  children,
}: RouteStatusProps) => {
  return (
    <div className="flex flex-1 items-center justify-center bg-background px-4 py-12 text-foreground">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-8 text-center sm:max-w-md sm:p-10 lg:max-w-lg lg:p-12">
        <div className="flex justify-center">
          <Logo />
        </div>
        <p className="mt-6 font-mono text-sm tracking-[0.2em] text-muted-foreground">
          {code}
        </p>
        <h1 className="mt-2 text-2xl font-semibold text-card-foreground lg:text-3xl">
          {title}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">{description}</p>
        <div className="mt-8 flex flex-col gap-3">{children}</div>
      </div>
    </div>
  )
}
