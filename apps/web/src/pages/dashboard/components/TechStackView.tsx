import type { ReactNode } from 'react'

const TECH_STACK_ORDER = [
  'languages',
  'frameworks',
  'databases',
  'cloud',
  'tools',
  'other',
] as const

const TECH_STACK_LABELS: Record<(typeof TECH_STACK_ORDER)[number], string> = {
  languages: 'Languages',
  frameworks: 'Frameworks',
  databases: 'Databases',
  cloud: 'Cloud',
  tools: 'Tools',
  other: 'Other',
}

const items = (value: unknown) => (Array.isArray(value) ? value : [])

const uniqueStrings = (values: string[]) => {
  const seen = new Set<string>()
  const result: string[] = []
  for (const value of values) {
    const trimmed = value.replace(
      /^(languages?|frameworks?|databases?|cloud|tools?|other|testing|skills?|tech(?:nical)?\s*skills?|tech\s*stack)\s*:\s*/i,
      '',
    ).trim()
    if (!trimmed) continue
    const key = trimmed.toLocaleLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    result.push(trimmed)
  }
  return result
}

export const readTechStack = (payload: Record<string, unknown>) => {
  const raw = payload.tech_stack
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    const stack = raw as Record<string, unknown>
    const grouped = TECH_STACK_ORDER.map((key) => ({
      key,
      label: TECH_STACK_LABELS[key],
      values: uniqueStrings(items(stack[key]).map(String)),
    })).filter((group) => group.values.length > 0)
    if (grouped.length) return grouped
  }
  const fallback = uniqueStrings([
    ...items(payload.skills).map(String),
    ...items(payload.technologies).map(String),
  ])
  return fallback.length
    ? [{ key: 'other', label: TECH_STACK_LABELS.other, values: fallback }]
    : []
}

export const TechStackView = ({
  payload,
  renderChip,
}: {
  payload: Record<string, unknown>
  renderChip: (label: string) => ReactNode
}) => {
  const groups = readTechStack(payload)
  if (!groups.length) return null
  return (
    <section>
      <h4 className="font-semibold">Tech Stack</h4>
      <dl className="mt-3 space-y-3">
        {groups.map((group) => (
          <div key={group.key}>
            <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {group.label}
            </dt>
            <dd className="mt-1.5 flex flex-wrap gap-2">
              {group.values.map((value) => (
                <span key={value}>{renderChip(value)}</span>
              ))}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  )
}
