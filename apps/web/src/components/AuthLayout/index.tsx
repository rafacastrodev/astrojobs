import { Link } from '@tanstack/react-router'
import type { ReactNode } from 'react'

import { Logo } from '@/components/Logo'

type AuthLayoutProps = {
  title: string
  subtitle?: string
  children: ReactNode
}

export const AuthLayout = ({ title, subtitle, children }: AuthLayoutProps) => {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-12 text-foreground">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-8">
        <div className="flex justify-center">
          <Logo />
        </div>
        <h1 className="mt-6 text-center text-2xl font-semibold text-card-foreground">{title}</h1>
        {subtitle ? <p className="mt-1 text-center text-sm text-muted-foreground">{subtitle}</p> : null}
        <div className="mt-8">{children}</div>
      </div>
      <nav className="mt-6 flex gap-4 text-xs text-muted-foreground">
        <Link to="/privacy" className="hover:text-foreground">
          Privacy Policy
        </Link>
        <Link to="/data-deletion" className="hover:text-foreground">
          Delete your data
        </Link>
      </nav>
    </div>
  )
}
