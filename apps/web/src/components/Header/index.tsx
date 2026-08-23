import { Link } from '@tanstack/react-router'

import { Logo } from '@/components/Logo'
import { useCurrentUser } from '@/hooks/useCurrentUser'

export const Header = () => {
  const { data: user } = useCurrentUser()

  return (
    <header className="border-b border-border">
      <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-4 py-4 sm:px-6">
        <Link to="/" className="flex items-center gap-2 text-foreground">
          <Logo />
          <span className="font-display text-sm tracking-[0.15em]">
            ASTROJOBS
          </span>
        </Link>

        {user ? (
          <Link
            to="/dashboard"
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90"
          >
            Dashboard
          </Link>
        ) : (
          <nav className="flex items-center gap-3">
            <Link
              to="/login"
              className="px-2 py-2 text-sm text-muted-foreground transition hover:text-foreground"
            >
              Log in
            </Link>
            <Link
              to="/login"
              search={{ mode: 'signup' }}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90"
            >
              Sign up
            </Link>
          </nav>
        )}
      </div>
    </header>
  )
}
