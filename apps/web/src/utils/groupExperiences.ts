const DATE_RANGE =
  /(?:\b(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+\d{4}|\b\d{4}\b)\s*(?:-|–|—|to)\s*(?:present|current|now|\b(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+\d{4}|\b\d{4}\b)/i
const BULLET_PREFIX = /^\s*([•●○\-*]|\d+[.)])\s+/
const TECH_STACK_PREFIX = /^\s*tech\s*stack\b/i

type Experience = Record<string, unknown> & {
  job_title: string
  company: string
  location: string
  start_date: string
  end_date: string
  current: boolean
  description: string
  highlights: string[]
}

const text = (value: unknown) => (typeof value === 'string' ? value.trim() : '')

const looksLikeJobHeaderText = (value: string) => {
  const stripped = value.trim()
  if (
    !stripped ||
    BULLET_PREFIX.test(stripped) ||
    TECH_STACK_PREFIX.test(stripped)
  ) {
    return false
  }
  return DATE_RANGE.test(stripped)
}

const asExperience = (raw: unknown): Experience | null => {
  if (typeof raw === 'string') {
    const jobTitle = raw.trim()
    return jobTitle
      ? {
          job_title: jobTitle,
          company: '',
          location: '',
          start_date: '',
          end_date: '',
          current: false,
          description: '',
          highlights: [],
        }
      : null
  }
  if (!raw || typeof raw !== 'object') return null
  const value = raw as Record<string, unknown>
  const highlights = Array.isArray(value.highlights)
    ? value.highlights.map(String).map((item) => item.trim()).filter(Boolean)
    : []
  const item = {
    ...value,
    job_title: text(value.job_title),
    company: text(value.company),
    location: text(value.location),
    start_date: text(value.start_date),
    end_date: text(value.end_date),
    current: Boolean(value.current),
    description: text(value.description),
    highlights,
  }
  if (
    !item.job_title &&
    !item.company &&
    !item.description &&
    item.highlights.length === 0
  ) {
    return null
  }
  return item
}

const isJobHeader = (item: Experience) => {
  const title = item.job_title
  if (BULLET_PREFIX.test(title) || TECH_STACK_PREFIX.test(title)) return false
  const heading = [title, item.company, item.location, item.start_date, item.end_date]
    .filter(Boolean)
    .join(' ')
  if (looksLikeJobHeaderText(title) || looksLikeJobHeaderText(heading)) return true
  if (item.start_date && title) return true
  return Boolean(title && item.company)
}

const stripBullet = (value: string) => value.replace(BULLET_PREFIX, '').trim()

const fragmentTexts = (item: Experience) => {
  const texts: string[] = []
  const heading = [item.job_title, item.company].filter(Boolean).join(' · ')
  if (heading) texts.push(heading)
  if (item.description && !texts.includes(item.description)) texts.push(item.description)
  for (const highlight of item.highlights) {
    if (!texts.includes(highlight)) texts.push(highlight)
  }
  return texts
}

const alreadyInJob = (job: Experience, value: string) => {
  const needle = stripBullet(value).toLocaleLowerCase()
  return [job.job_title, job.description, ...job.highlights].some(
    (haystack) => needle && stripBullet(haystack).toLocaleLowerCase().includes(needle),
  )
}

const mergeFragment = (job: Experience, fragment: Experience) => {
  for (const value of fragmentTexts(fragment)) {
    if (alreadyInJob(job, value)) continue
    if (
      BULLET_PREFIX.test(value) ||
      TECH_STACK_PREFIX.test(value) ||
      !value.endsWith('.')
    ) {
      job.highlights.push(stripBullet(value))
    } else if (job.description) {
      job.description = `${job.description}\n${value}`
    } else {
      job.description = value
    }
  }
}

export const groupExperiences = (items: unknown[]) => {
  const grouped: Experience[] = []
  for (const raw of items) {
    const item = asExperience(raw)
    if (!item) continue
    if (isJobHeader(item) || grouped.length === 0) {
      grouped.push(item)
      continue
    }
    mergeFragment(grouped[grouped.length - 1], item)
  }
  return grouped
}
