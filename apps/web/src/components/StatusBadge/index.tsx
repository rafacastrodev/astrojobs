type StatusBadgeProps = {
  status: 'draft' | 'synced' | 'failed'
}

const styles: Record<StatusBadgeProps['status'], string> = {
  draft: 'border-border bg-muted text-muted-foreground',
  synced: 'border-border bg-card text-foreground',
  failed: 'border-destructive/40 bg-destructive/10 text-destructive',
}

export const StatusBadge = ({ status }: StatusBadgeProps) => {
  return (
    <span className={`inline-flex rounded-md border px-2 py-0.5 text-xs capitalize ${styles[status]}`}>
      {status}
    </span>
  )
}
