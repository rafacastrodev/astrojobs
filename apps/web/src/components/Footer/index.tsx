import { Link } from '@tanstack/react-router'

export const Footer = () => {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
        <p className="text-xs text-muted-foreground">AstroJobs</p>
        <nav className="flex gap-4 text-xs text-muted-foreground">
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
