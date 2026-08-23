import { FlapCell } from './FlapCell'

type FlapTextProps = {
  text: string
  play: boolean
  tone?: 'default' | 'critical'
  staggerMs?: number
  startDelayMs?: number
  className?: string
}

export const FlapText = ({
  text,
  play,
  tone = 'default',
  staggerMs = 45,
  startDelayMs = 0,
  className = '',
}: FlapTextProps) => {
  const words = text.split(' ')
  let charIndex = 0

  return (
    <span
      className={`inline-flex flex-wrap gap-x-[0.5em] gap-y-[3px] font-display ${className}`}
      role="text"
      aria-label={text}
    >
      {words.map((word, wordIndex) => {
        const cells = word.split('').map((char) => {
          const cell = (
            <FlapCell
              key={`${charIndex}-${char}`}
              char={char}
              play={play}
              tone={tone}
              delayMs={startDelayMs + charIndex * staggerMs}
            />
          )
          charIndex += 1
          return cell
        })

        return (
          <span
            key={`word-${wordIndex}`}
            className="inline-flex shrink-0 gap-[3px]"
          >
            {cells}
          </span>
        )
      })}
    </span>
  )
}
