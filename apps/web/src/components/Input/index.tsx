import type { InputHTMLAttributes, ReactNode, Ref } from 'react'

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  ref?: Ref<HTMLInputElement>
  icon?: ReactNode
}

export const Input = ({ ref, icon, className = '', ...props }: InputProps) => {
  return (
    <div className="relative">
      {icon ? (
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
          {icon}
        </span>
      ) : null}
      <input
        ref={ref}
        className={`w-full rounded-lg border border-border bg-input px-3 py-2.5 text-foreground placeholder-muted-foreground outline-none focus:border-ring aria-[invalid=true]:border-destructive ${icon ? 'pl-10' : ''} ${className}`}
        {...props}
      />
    </div>
  )
}
