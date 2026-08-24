import type { ReactNode } from 'react'

import { Logo } from '@/components/Logo'

type AuthLayoutProps = {
  title: string
  subtitle?: string
  children: ReactNode
}

export const AuthLayout = ({ title, subtitle, children }: AuthLayoutProps) => {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-8 sm:max-w-md sm:p-10 lg:max-w-lg lg:p-12">
        <div className="flex justify-center">
          <Logo />
        </div>
        <h1 className="mt-6 text-center text-2xl font-semibold text-card-foreground lg:text-3xl">
          {title}
        </h1>
        {subtitle ? (
          <p className="mt-1 text-center text-sm text-muted-foreground lg:text-base">
            {subtitle}
          </p>
        ) : null}
        <div className="mt-8">{children}</div>
      </div>
    </div>
  )
}
