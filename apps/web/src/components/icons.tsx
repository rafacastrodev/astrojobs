import type { SVGProps } from 'react'

const baseProps = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.75,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
}

export const UserIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg {...baseProps} className="h-4 w-4" {...props}>
    <circle cx="12" cy="8" r="4" />
    <path d="M4 21c0-4 3.6-7 8-7s8 3 8 7" />
  </svg>
)

export const MailIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg {...baseProps} className="h-4 w-4" {...props}>
    <rect x="3" y="5" width="18" height="14" rx="2" />
    <path d="m3 7 9 6 9-6" />
  </svg>
)

export const LockIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg {...baseProps} className="h-4 w-4" {...props}>
    <rect x="5" y="11" width="14" height="9" rx="2" />
    <path d="M8 11V8a4 4 0 0 1 8 0v3" />
  </svg>
)

export const EyeIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg {...baseProps} className="h-4 w-4" {...props}>
    <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
)

export const ThumbUpIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg {...baseProps} className="h-4 w-4" {...props}>
    <path d="M7 10v10H4a1 1 0 0 1-1-1v-8a1 1 0 0 1 1-1h3Z" />
    <path d="M7 10 12 3a2 2 0 0 1 2 2v4h4.5a2 2 0 0 1 2 2.4l-1.3 6.4a2 2 0 0 1-2 1.6H7" />
  </svg>
)

export const ThumbDownIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg {...baseProps} className="h-4 w-4" {...props}>
    <path d="M7 14V4H4a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h3Z" />
    <path d="M7 14l5 7a2 2 0 0 0 2-2v-4h4.5a2 2 0 0 0 2-2.4l-1.3-6.4a2 2 0 0 0-2-1.6H7" />
  </svg>
)

export const EyeOffIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg {...baseProps} className="h-4 w-4" {...props}>
    <path d="M3 3l18 18" />
    <path d="M10.6 5.1A10.7 10.7 0 0 1 12 5c6.5 0 10 7 10 7a13.2 13.2 0 0 1-3.1 3.9M6.5 6.7C4 8.3 2 12 2 12s3.5 7 10 7c1.3 0 2.5-.2 3.6-.6" />
    <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
  </svg>
)

export const CloseIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg {...baseProps} className="h-4 w-4" {...props}>
    <path d="M6 6l12 12M18 6 6 18" />
  </svg>
)

export const TrashIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg {...baseProps} className="h-4 w-4" {...props}>
    <path d="M4 7h16" />
    <path d="M10 7V5a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v2" />
    <path d="M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12" />
    <path d="M10 11v6M14 11v6" />
  </svg>
)

export const ChevronIcon = ({ className = '', ...props }: SVGProps<SVGSVGElement>) => (
  <svg {...baseProps} className={`h-4 w-4 shrink-0 ${className}`} {...props}>
    <path d="M6 9l6 6 6-6" />
  </svg>
)

export const PencilIcon = ({ className = '', ...props }: SVGProps<SVGSVGElement>) => (
  <svg {...baseProps} className={`h-4 w-4 shrink-0 ${className}`} {...props}>
    <path d="M12 20h9" />
    <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
  </svg>
)
