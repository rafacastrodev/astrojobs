import { Link } from '@tanstack/react-router'
import type { ReactNode } from 'react'

import { Logo } from '@/components/Logo'

type LegalLayoutProps = {
  title: string
  updatedAt: string
  intro: ReactNode
  children: ReactNode
}

export const LegalLayout = ({
  title,
  updatedAt,
  intro,
  children,
}: LegalLayoutProps) => {
  return (
    <div className="flex-1 bg-background px-4 py-12 text-foreground">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-8">
        <header className="flex flex-col gap-6">
          <Link to="/" className="flex w-fit items-center gap-3">
            <Logo />
            <span className="text-sm text-muted-foreground">AstroJobs</span>
          </Link>
          <div>
            <h1 className="text-3xl font-semibold">{title}</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Last updated: {updatedAt}
            </p>
          </div>
          <div className="text-sm leading-relaxed text-muted-foreground">
            {intro}
          </div>
        </header>

        <main className="flex flex-col gap-8">{children}</main>
      </div>
    </div>
  )
}

type SectionProps = {
  title: string
  children: ReactNode
}

export const LegalSection = ({ title, children }: SectionProps) => (
  <section className="flex flex-col gap-3">
    <h2 className="text-lg font-semibold text-card-foreground">{title}</h2>
    <div className="flex flex-col gap-3 text-sm leading-relaxed text-muted-foreground">
      {children}
    </div>
  </section>
)

export const LegalList = ({ items }: { items: Array<ReactNode> }) => (
  <ul className="flex list-disc flex-col gap-2 pl-5">
    {items.map((item, index) => (
      <li key={index}>{item}</li>
    ))}
  </ul>
)
