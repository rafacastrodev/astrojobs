import { AppHeader } from '@/components/AppHeader'
import { Button } from '@/components/Button'
import { ProfileSection } from '@/pages/dashboard/components/ProfileSection'
import { useDashboard } from '@/pages/dashboard/hooks/useDashboard'

type ProfilePageProps = {
  name: string
  email: string
  role: 'professional' | 'recruiter'
  createdAt: string
  photoUrl?: string | null
}

export const ProfilePage = ({
  name,
  email,
  role,
  createdAt,
  photoUrl,
}: ProfilePageProps) => {
  const { handleLogout, isLoggingOut } = useDashboard()

  return (
    <div className="flex-1 bg-background px-4 py-10 text-foreground [animation:auth-fade-in_280ms_ease-out]">
      <div className="mx-auto flex w-full max-w-xl flex-col gap-8">
        <AppHeader title="Profile" name={name} photoUrl={photoUrl}>
          <div className="w-28">
            <Button
              onClick={handleLogout}
              isLoading={isLoggingOut}
              className="!py-2 text-sm"
            >
              Log out
            </Button>
          </div>
        </AppHeader>
        <ProfileSection
          name={name}
          email={email}
          role={role}
          createdAt={createdAt}
          photoUrl={photoUrl}
        />
      </div>
    </div>
  )
}
