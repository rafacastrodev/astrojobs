import type { ReactNode } from 'react'

type SocialIconButtonProps = {
  label: string
  icon: ReactNode
}

export const SocialIconButton = ({ label, icon }: SocialIconButtonProps) => {
  return (
    <button
      type="button"
      aria-label={label}
      disabled
      title={`${label} (coming soon)`}
      className="flex h-11 w-11 items-center justify-center rounded-lg border border-border text-muted-foreground opacity-60"
    >
      {icon}
    </button>
  )
}
