import { useRef } from 'react'

import { MailIcon, UserIcon } from '@/components/icons'
import { UserAvatar } from '@/components/UserAvatar'

type ProfileSectionProps = {
  name: string
  email: string
  role: 'professional' | 'recruiter'
  createdAt: string
  photoUrl?: string | null
  onChangePhoto?: (file: File) => void
  isUploadingPhoto?: boolean
  photoError?: string | null
}

const formatMemberSince = (createdAt: string) =>
  new Intl.DateTimeFormat(undefined, {
    month: 'long',
    year: 'numeric',
  }).format(new Date(createdAt))

export const ProfileSection = ({
  name,
  email,
  role,
  createdAt,
  photoUrl,
  onChangePhoto,
  isUploadingPhoto = false,
  photoError,
}: ProfileSectionProps) => {
  const inputRef = useRef<HTMLInputElement>(null)

  const pickPhoto = () => {
    if (!onChangePhoto || isUploadingPhoto) return
    inputRef.current?.click()
  }

  return (
    <aside className="h-fit rounded-2xl border border-border bg-card p-6">
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={pickPhoto}
          disabled={!onChangePhoto || isUploadingPhoto}
          aria-label={onChangePhoto ? 'Change profile photo' : undefined}
          className={`shrink-0 ${onChangePhoto ? 'cursor-pointer' : ''} disabled:cursor-default`}
        >
          <UserAvatar name={name} photoUrl={photoUrl} size="md" />
        </button>
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground">Your profile</p>
          <h2 className="truncate text-lg font-semibold text-card-foreground">
            {name}
          </h2>
          {onChangePhoto ? (
            <button
              type="button"
              onClick={pickPhoto}
              disabled={isUploadingPhoto}
              className="mt-1 cursor-pointer text-sm font-medium text-primary transition hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isUploadingPhoto ? 'Uploading…' : 'Change photo'}
            </button>
          ) : null}
        </div>
        {onChangePhoto ? (
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0]
              if (file) onChangePhoto(file)
              event.target.value = ''
            }}
          />
        ) : null}
      </div>
      {photoError ? (
        <p role="alert" className="mt-4 text-sm text-destructive">
          {photoError}
        </p>
      ) : null}

      <dl className="mt-6 divide-y divide-border border-y border-border">
        <div className="py-4">
          <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            Username
          </dt>
          <dd className="mt-1 flex items-center gap-2 text-sm text-card-foreground">
            <UserIcon aria-hidden="true" />
            <span className="truncate">{name}</span>
          </dd>
        </div>
        <div className="py-4">
          <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            Email
          </dt>
          <dd className="mt-1 flex items-center gap-2 text-sm text-card-foreground">
            <MailIcon aria-hidden="true" />
            <span className="truncate" title={email}>
              {email}
            </span>
          </dd>
        </div>
        <div className="grid grid-cols-2 gap-4 py-4">
          <div>
            <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
              Account
            </dt>
            <dd className="mt-1 text-sm text-card-foreground capitalize">
              {role}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
              Member since
            </dt>
            <dd className="mt-1 text-sm text-card-foreground">
              {formatMemberSince(createdAt)}
            </dd>
          </div>
        </div>
      </dl>
    </aside>
  )
}
