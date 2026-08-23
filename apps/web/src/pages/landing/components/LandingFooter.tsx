import { Link } from '@tanstack/react-router'

export const LandingFooter = () => {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto flex w-full max-w-5xl flex-col items-start gap-6 px-4 py-16 sm:px-6 sm:py-20">
        <h2 className="max-w-md text-2xl font-semibold text-foreground sm:text-3xl">
          Know before you apply.
        </h2>
        <Link
          to="/login"
          search={{ mode: 'signup' }}
          className="rounded-lg bg-primary px-5 py-2.5 font-medium text-primary-foreground transition hover:opacity-90"
        >
          Sign up free
        </Link>

        <nav className="mt-8 flex gap-4 text-xs text-muted-foreground">
          <Link to="/privacy" className="hover:text-foreground">
            Privacy Policy
          </Link>
          <Link to="/data-deletion" className="hover:text-foreground">
            Delete your data
          </Link>
        </nav>
      </div>
    </footer>
  )
}
