import { useInView } from '../hooks/useInView'
import { FlapText } from './FlapText'

type Finding = {
  tag: string
  text: string
  critical?: boolean
}

const FINDINGS: Finding[] = [
  { tag: 'OK', text: 'Resume format is ATS-compatible' },
  {
    tag: 'FIX',
    text: 'Missing keyword "Python" from the job requirements',
    critical: true,
  },
  { tag: 'OK', text: 'Summary is concise and scannable' },
]

export const SampleBoard = () => {
  const { ref, inView } = useInView<HTMLDivElement>(0.5)

  return (
    <div
      ref={ref}
      className="w-full max-w-md rounded-2xl border border-border bg-card/60 p-5 text-left sm:p-6"
    >
      <p className="font-mono text-[11px] tracking-[0.2em] text-muted-foreground">
        SAMPLE ANALYSIS — ILLUSTRATIVE
      </p>

      <div className="mt-4 flex items-end justify-between border-b border-border pb-4">
        <div>
          <p className="text-xs text-muted-foreground">Score</p>
          <FlapText
            text="87"
            play={inView}
            className="mt-1 text-2xl font-semibold"
          />
        </div>
        <FlapText
          text="STRONG FIT"
          play={inView}
          startDelayMs={150}
          className="text-xs font-medium"
        />
      </div>

      <ul className="mt-4 flex flex-col gap-3">
        {FINDINGS.map((finding, index) => (
          <li
            key={finding.text}
            className="flex items-start gap-3 opacity-0 [animation-fill-mode:forwards]"
            style={
              inView
                ? {
                    animation: 'row-in 260ms ease-out forwards',
                    animationDelay: `${500 + index * 220}ms`,
                  }
                : undefined
            }
          >
            <FlapText
              text={finding.tag}
              play={inView}
              tone={finding.critical ? 'critical' : 'default'}
              startDelayMs={450 + index * 220}
              staggerMs={35}
              className="shrink-0 text-[10px]"
            />
            <span className="pt-1 text-sm text-muted-foreground">
              {finding.text}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
