import { Link } from '@tanstack/react-router'

import { UserAvatar } from '@/components/UserAvatar'

type ProfileLinkProps = {
  name: string
  photoUrl?: string | null
}

export const ProfileLink = ({ name, photoUrl }: ProfileLinkProps) => (
  <Link
    to="/profile"
    aria-label={`Open profile, ${name}`}
    className="flex items-center gap-2 rounded-full text-sm text-muted-foreground transition hover:text-foreground"
  >
    <UserAvatar name={name} photoUrl={photoUrl} />
    <span className="max-w-40 truncate">{name}</span>
  </Link>
)
