import { useState } from 'react'

import { UserIcon } from '@/components/icons'

type UserAvatarProps = {
  name: string
  photoUrl?: string | null
  size?: 'sm' | 'md'
}

const sizes = {
  sm: 'h-8 w-8',
  md: 'h-12 w-12',
}

export const UserAvatar = ({
  name,
  photoUrl,
  size = 'sm',
}: UserAvatarProps) => {
  const [brokenUrl, setBrokenUrl] = useState<string | null>(null)
  const showPhoto = Boolean(photoUrl) && brokenUrl !== photoUrl

  return (
    <span
      title={name}
      className={`flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-input text-card-foreground ${sizes[size]}`}
    >
      {showPhoto ? (
        <img
          src={photoUrl ?? ''}
          alt=""
          className="h-full w-full object-cover"
          onError={() => setBrokenUrl(photoUrl ?? null)}
        />
      ) : (
        <UserIcon className="h-4 w-4" aria-hidden="true" />
      )}
    </span>
  )
}
