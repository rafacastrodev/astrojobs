import type { ButtonHTMLAttributes } from 'react'

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  isLoading?: boolean
}

const Spinner = () => (
  <span className="size-5 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
)

export const Button = ({
  isLoading,
  disabled,
  children,
  className = '',
  ...props
}: ButtonProps) => {
  const stateClassName = isLoading
    ? 'cursor-default bg-transparent text-primary'
    : 'cursor-pointer bg-primary text-primary-foreground hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60'

  return (
    <button
      disabled={disabled || isLoading}
      aria-busy={isLoading}
      className={`flex w-full items-center justify-center rounded-lg px-4 py-2.5 font-medium transition ${stateClassName} ${className}`}
      {...props}
    >
      {isLoading ? <Spinner /> : children}
    </button>
  )
}
