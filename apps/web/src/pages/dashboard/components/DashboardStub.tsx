import { Button } from '#/components/Button'
import { useLogout } from '../hooks/useLogout'

export const DashboardStub = ({ name }: { name: string }) => {
  const logout = useLogout()

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background text-foreground">
      <p className="text-xl">Welcome, {name}</p>
      <div className="w-48">
        <Button onClick={() => logout.mutate()} isLoading={logout.isPending}>
          Log out
        </Button>
      </div>
    </div>
  )
}
