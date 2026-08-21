import { passwordRequirements } from '@/utils/validation/authSchemas'

type PasswordRequirementsProps = {
  password: string
  confirmPassword: string
  id?: string
}

const StatusIcon = ({ met }: { met: boolean }) => (
  <svg viewBox="0 0 16 16" className="h-4 w-4 shrink-0" aria-hidden>
    <circle
      cx="8"
      cy="8"
      r="8"
      className={met ? 'fill-emerald-500' : 'fill-red-700'}
    />
    {met ? (
      <path
        d="M4.6 8.2 7 10.5l4.5-5.2"
        fill="none"
        stroke="white"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    ) : (
      <path
        d="M5.4 5.4l5.2 5.2M10.6 5.4l-5.2 5.2"
        fill="none"
        stroke="white"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    )}
  </svg>
)

export const PasswordRequirements = ({
  password,
  confirmPassword,
  id = 'password-requirements',
}: PasswordRequirementsProps) => {
  return (
    <div id={id} className="mt-3" aria-live="polite">
      <p className="mb-2 text-sm text-foreground">Password must:</p>
      <ul className="space-y-1.5">
        {passwordRequirements.map((requirement) => {
          const met = requirement.test({ password, confirmPassword })

          return (
            <li
              key={requirement.id}
              className={`flex items-center gap-2 text-sm transition-colors ${
                met ? 'text-zinc-200' : 'text-zinc-500'
              }`}
            >
              <StatusIcon met={met} />
              {requirement.label}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
