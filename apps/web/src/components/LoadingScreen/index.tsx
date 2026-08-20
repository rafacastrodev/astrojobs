export const LoadingScreen = () => {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background text-foreground">
      <div
        role="status"
        aria-label="Loading"
        className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-primary"
      />
    </div>
  )
}
