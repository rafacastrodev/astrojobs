import { useEffect, useState } from 'react'

import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion'

const CYCLE_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
const STEP_MS = 65

type FlapCellProps = {
  char: string
  play: boolean
  delayMs?: number
  tone?: 'default' | 'critical'
}

export const FlapCell = ({
  char,
  play,
  delayMs = 0,
  tone = 'default',
}: FlapCellProps) => {
  const target = char === ' ' ? ' ' : char.toUpperCase()
  const [display, setDisplay] = useState(target)
  const prefersReducedMotion = usePrefersReducedMotion()

  useEffect(() => {
    if (!play || prefersReducedMotion || target === ' ') {
      setDisplay(target)
      return
    }

    let cancelled = false
    const steps = 3 + Math.floor(Math.random() * 3)
    let step = 0

    const runStep = () => {
      if (cancelled) return
      if (step < steps) {
        setDisplay(CYCLE_CHARS[Math.floor(Math.random() * CYCLE_CHARS.length)])
        step += 1
        setTimeout(runStep, STEP_MS)
      } else {
        setDisplay(target)
      }
    }

    const start = setTimeout(runStep, delayMs)
    return () => {
      cancelled = true
      clearTimeout(start)
    }
  }, [play, target, delayMs, prefersReducedMotion])

  const toneClassName =
    tone === 'critical'
      ? 'border-destructive/40 bg-destructive/10 text-destructive'
      : 'border-border bg-card text-foreground'

  return (
    <span
      key={display}
      aria-hidden="true"
      className={`relative inline-flex h-[1.6em] w-[1.05em] items-center justify-center overflow-hidden rounded-[3px] border text-center [animation:flap-turn_110ms_ease-out] ${toneClassName}`}
    >
      <span
        className="pointer-events-none absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-transparent to-background/25"
      />
      <span className="pointer-events-none absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-background/70" />
      <span className="relative z-10">{display}</span>
    </span>
  )
}
