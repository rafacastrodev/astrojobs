import { ChevronIcon } from '@/components/icons'
import { groupExperiences } from '@/utils/groupExperiences'

import type { AnalysisResult } from '../types'
import { TechStackView } from './TechStackView'

type Props = {
  payload: Record<string, unknown>
  analysis?: AnalysisResult | null
}

const TECH_SECTION_TITLES = new Set([
  'skills',
  'technical skills',
  'tech skills',
  'techskills',
  'technologies',
  'tech stack',
  'competencies',
])

const text = (value: unknown) => (typeof value === 'string' ? value : '')
const items = (value: unknown) => (Array.isArray(value) ? value : [])

const isTechSection = (item: unknown) => {
  if (!item || typeof item !== 'object') return false
  const title = text((item as Record<string, unknown>).title).toLocaleLowerCase()
  return TECH_SECTION_TITLES.has(title)
}

const experienceHeading = (value: Record<string, unknown>) =>
  [
    text(value.job_title),
    text(value.company),
    text(value.name),
    text(value.institution),
  ]
    .filter(Boolean)
    .join(' · ')

const experiencePeriod = (value: Record<string, unknown>) =>
  [text(value.start_date), text(value.end_date)].filter(Boolean).join(' — ')

const ExperienceItem = ({ item, index }: { item: unknown; index: number }) => {
  if (typeof item === 'string') {
    return (
      <li className="rounded-lg border border-border p-3 text-muted-foreground">
        {item}
      </li>
    )
  }
  if (!item || typeof item !== 'object') return null
  const value = item as Record<string, unknown>
  const heading = experienceHeading(value)
  const period = experiencePeriod(value)
  const description = text(value.description)
  const highlights = items(value.highlights)
  const hasBody = Boolean(description) || highlights.length > 0
  const label = heading || `Experience ${index + 1}`

  if (!hasBody) {
    return (
      <li className="rounded-lg border border-border p-3">
        <p className="font-medium text-card-foreground">{label}</p>
        {period ? (
          <p className="text-xs text-muted-foreground">{period}</p>
        ) : null}
      </li>
    )
  }

  return (
    <li>
      <details className="group rounded-lg border border-border p-3">
        <summary className="flex cursor-pointer list-none items-start justify-between gap-3 [&::-webkit-details-marker]:hidden">
          <span>
            <span className="font-medium text-card-foreground">{label}</span>
            {period ? (
              <span className="mt-0.5 block text-xs text-muted-foreground">
                {period}
              </span>
            ) : null}
          </span>
          <ChevronIcon className="mt-1 shrink-0 text-muted-foreground transition group-open:rotate-180" />
        </summary>
        {description ? (
          <p className="mt-3 whitespace-pre-wrap text-muted-foreground">
            {description}
          </p>
        ) : null}
        {highlights.length ? (
          <ul className="mt-2 list-disc space-y-1 pl-5 text-muted-foreground">
            {highlights.map((highlight, highlightIndex) => (
              <li key={highlightIndex}>{String(highlight)}</li>
            ))}
          </ul>
        ) : null}
      </details>
    </li>
  )
}

const otherItem = (item: unknown, index: number) => {
  if (typeof item === 'string') return <li key={index}>{item}</li>
  if (!item || typeof item !== 'object') return null
  const value = item as Record<string, unknown>
  const heading =
    experienceHeading(value) ||
    [text(value.title), text(value.degree), text(value.field)]
      .filter(Boolean)
      .join(' · ')
  const period = experiencePeriod(value)
  const body =
    text(value.description) ||
    text(value.content) ||
    text(value.proficiency)
  return (
    <li key={index} className="rounded-lg border border-border p-3">
      {heading ? (
        <p className="font-medium text-card-foreground">{heading}</p>
      ) : null}
      {period ? (
        <p className="text-xs text-muted-foreground">{period}</p>
      ) : null}
      {body ? (
        <p className="mt-1 whitespace-pre-wrap text-muted-foreground">{body}</p>
      ) : null}
    </li>
  )
}

export const ResumeProfileView = ({ payload, analysis }: Props) => {
  const summary = text(payload.summary) || text(payload.about)
  const experiences = groupExperiences(items(payload.experiences))
  const extraSections = items(payload.additional_sections).filter(
    (item) => !isTechSection(item),
  )
  const atsCategory = analysis
    ? { low: 'Low ATS fit', medium: 'Medium ATS fit', high: 'High ATS fit' }[
        analysis.ats_category
      ]
    : null

  return (
    <div className="space-y-6 text-sm text-card-foreground">
      {summary ? (
        <section>
          <h4 className="font-semibold">Summary</h4>
          <p className="mt-1 whitespace-pre-wrap text-muted-foreground">
            {summary}
          </p>
        </section>
      ) : null}

      {analysis ? (
        <section>
          <h4 className="font-semibold">Dados</h4>
          <dl className="mt-2 flex flex-col gap-1 text-muted-foreground">
            <div>
              <dt className="inline font-medium text-card-foreground">ATS: </dt>
              <dd className="inline">
                {analysis.score}/100
                {atsCategory ? ` · ${atsCategory}` : ''}
              </dd>
            </div>
            {analysis.years_of_experience != null ? (
              <div>
                <dt className="inline font-medium text-card-foreground">
                  Experiência:{' '}
                </dt>
                <dd className="inline">{analysis.years_of_experience} anos</dd>
              </div>
            ) : null}
          </dl>
        </section>
      ) : null}

      {experiences.length ? (
        <section>
          <h4 className="font-semibold">Experience</h4>
          <ul className="mt-2 space-y-2">
            {experiences.map((item, index) => (
              <ExperienceItem key={index} item={item} index={index} />
            ))}
          </ul>
        </section>
      ) : null}

      {items(payload.education).length ? (
        <section>
          <h4 className="font-semibold">Education</h4>
          <ul className="mt-2 space-y-2 text-muted-foreground">
            {items(payload.education).map(otherItem)}
          </ul>
        </section>
      ) : null}

      {items(payload.projects).length ? (
        <section>
          <h4 className="font-semibold">Projects</h4>
          <ul className="mt-2 space-y-2 text-muted-foreground">
            {items(payload.projects).map(otherItem)}
          </ul>
        </section>
      ) : null}

      {items(payload.certifications).length ? (
        <section>
          <h4 className="font-semibold">Certifications</h4>
          <ul className="mt-2 space-y-2 text-muted-foreground">
            {items(payload.certifications).map(otherItem)}
          </ul>
        </section>
      ) : null}

      {items(payload.languages).length ? (
        <section>
          <h4 className="font-semibold">Languages</h4>
          <ul className="mt-2 space-y-2 text-muted-foreground">
            {items(payload.languages).map(otherItem)}
          </ul>
        </section>
      ) : null}

      {extraSections.length ? (
        <section>
          <h4 className="font-semibold">Additional sections</h4>
          <ul className="mt-2 space-y-2 text-muted-foreground">
            {extraSections.map(otherItem)}
          </ul>
        </section>
      ) : null}

      <TechStackView
        payload={payload}
        renderChip={(label) => (
          <span className="rounded-full bg-muted px-2 py-1 text-xs">{label}</span>
        )}
      />
    </div>
  )
}
