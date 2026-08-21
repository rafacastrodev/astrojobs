import type { ReactNode } from 'react'

type SocialIconButtonProps = {
  label: string
  icon: ReactNode
  onClick?: () => void
}

export const SocialIconButton = ({
  label,
  icon,
  onClick,
}: SocialIconButtonProps) => {
  const isEnabled = Boolean(onClick)

  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      disabled={!isEnabled}
      title={isEnabled ? label : `${label} (coming soon)`}
      className={`flex h-11 w-11 items-center justify-center rounded-lg border border-border text-muted-foreground transition ${
        isEnabled
          ? 'cursor-pointer hover:border-ring hover:text-foreground'
          : 'opacity-60'
      }`}
    >
      {icon}
    </button>
  )
}
