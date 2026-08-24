import { MailIcon, UserIcon } from '@/components/icons'
import { UserAvatar } from '@/components/UserAvatar'

type ProfileSectionProps = {
  name: string
  email: string
  role: 'professional' | 'recruiter'
  createdAt: string
  photoUrl?: string | null
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
}: ProfileSectionProps) => (
  <aside className="h-fit rounded-2xl border border-border bg-card p-6">
    <div className="flex items-center gap-4">
      <UserAvatar name={name} photoUrl={photoUrl} size="md" />
      <div className="min-w-0">
        <p className="text-sm text-muted-foreground">Your profile</p>
        <h2 className="truncate text-lg font-semibold text-card-foreground">
          {name}
        </h2>
      </div>
    </div>

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
