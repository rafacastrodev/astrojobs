import { TechStackView } from '@/pages/dashboard/components/TechStackView'

type Props = {
  payload: Record<string, unknown>
  displayName: string
  highlightTerms: string[]
  matchedTechnologies?: string[]
}

const text = (value: unknown) => (typeof value === 'string' ? value : '')
const items = (value: unknown) => (Array.isArray(value) ? value : [])

const unique = (values: string[]) =>
  values.filter((value, index, all) => value && all.indexOf(value) === index)

const escapeRegExp = (value: string) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

const isExactTerm = (value: string, terms: string[]) =>
  terms.some(
    (term) =>
      value.localeCompare(term, undefined, { sensitivity: 'accent' }) === 0,
  )

const skillMatchesRole = (skill: string, terms: string[]) =>
  terms.some((term) => {
    const skillValue = skill.toLocaleLowerCase()
    const termValue = term.toLocaleLowerCase()
    return skillValue === termValue || skillValue.includes(termValue)
  })

const HighlightedText = ({
  value,
  terms,
}: {
  value: string
  terms: string[]
}) => {
  const sorted = [...terms]
    .map((term) => term.trim())
    .filter((term) => term.length > 1)
    .sort((left, right) => right.length - left.length)
  if (!value || sorted.length === 0) return <>{value}</>
  const pattern = new RegExp(`(${sorted.map(escapeRegExp).join('|')})`, 'gi')
  const parts = value.split(pattern)
  return (
    <>
      {parts.map((part, index) =>
        isExactTerm(part, sorted) ? (
          <mark
            key={`${part}-${index}`}
            className="rounded-sm bg-primary px-0.5 text-primary-foreground"
          >
            {part}
          </mark>
        ) : (
          part
        ),
      )}
    </>
  )
}

const SkillChip = ({
  label,
  matched,
}: {
  label: string
  matched: boolean
}) => (
  <span
    className={
      matched
        ? 'rounded-full bg-primary px-2 py-1 text-xs text-primary-foreground'
        : 'rounded-full bg-muted px-2 py-1 text-xs text-muted-foreground'
    }
  >
    {label}
  </span>
)

const ExperienceItem = ({
  item,
  terms,
}: {
  item: unknown
  terms: string[]
}) => {
  if (typeof item === 'string') {
    return (
      <li>
        <HighlightedText value={item} terms={terms} />
      </li>
    )
  }
  if (!item || typeof item !== 'object') return null
  const value = item as Record<string, unknown>
  const heading = [
    text(value.job_title),
    text(value.company),
    text(value.name),
    text(value.institution),
  ]
    .filter(Boolean)
    .join(' · ')
  const period = [text(value.start_date), text(value.end_date)]
    .filter(Boolean)
    .join(' — ')
  const description = text(value.description)
  const highlights = items(value.highlights)
  return (
    <li className="rounded-lg border border-border p-3">
      {heading ? (
        <p className="font-medium text-card-foreground">
          <HighlightedText value={heading} terms={terms} />
        </p>
      ) : null}
      {period ? (
        <p className="text-xs text-muted-foreground">{period}</p>
      ) : null}
      {description ? (
        <p className="mt-1 whitespace-pre-wrap text-muted-foreground">
          <HighlightedText value={description} terms={terms} />
        </p>
      ) : null}
      {highlights.length ? (
        <ul className="mt-2 list-disc space-y-1 pl-5 text-muted-foreground">
          {highlights.map((highlight, highlightIndex) => (
            <li key={highlightIndex}>
              <HighlightedText value={String(highlight)} terms={terms} />
            </li>
          ))}
        </ul>
      ) : null}
    </li>
  )
}

export const ApplicantProfileView = ({
  payload,
  displayName,
  highlightTerms,
  matchedTechnologies = [],
}: Props) => {
  const contact =
    payload.contact && typeof payload.contact === 'object'
      ? (payload.contact as Record<string, unknown>)
      : null
  const emails = unique(items(contact?.emails).map(String))
  const phones = unique(items(contact?.phones).map(String))
  const links = unique(items(contact?.links).map(String))
  const contactValues = [...emails, ...phones, ...links]
  const summary = text(payload.summary) || text(payload.about)
  const experiences = items(payload.experiences)
  const extraSections = [
    ['Education', payload.education],
    ['Projects', payload.projects],
    ['Certifications', payload.certifications],
    ['Languages', payload.languages],
    [
      'Additional sections',
      items(payload.additional_sections).filter((item) => {
        if (!item || typeof item !== 'object') return true
        const title = text((item as Record<string, unknown>).title).toLocaleLowerCase()
        return ![
          'skills',
          'technical skills',
          'tech skills',
          'techskills',
          'technologies',
          'tech stack',
          'competencies',
        ].includes(title)
      }),
    ],
  ] as const

  return (
    <div className="space-y-5 text-sm text-card-foreground">
      <section>
        <h4 className="text-base font-medium text-card-foreground">
          {displayName}
        </h4>
        {contactValues.length ? (
          <p className="mt-1 break-words text-muted-foreground">
            {contactValues.join(' · ')}
          </p>
        ) : null}
        {matchedTechnologies.length ? (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {matchedTechnologies.map((tech) => (
              <SkillChip key={tech} label={tech} matched />
            ))}
          </div>
        ) : null}
      </section>

      {experiences.length ? (
        <section>
          <h4 className="font-semibold">Experience</h4>
          <ul className="mt-2 space-y-2">
            {experiences.map((item, index) => (
              <ExperienceItem
                key={index}
                item={item}
                terms={highlightTerms}
              />
            ))}
          </ul>
        </section>
      ) : summary ? (
        <section>
          <h4 className="font-semibold">Experience</h4>
          <p className="mt-1 whitespace-pre-wrap text-muted-foreground">
            <HighlightedText value={summary} terms={highlightTerms} />
          </p>
        </section>
      ) : null}

      {extraSections.map(([title, value]) =>
        items(value).length ? (
          <section key={title}>
            <h4 className="font-semibold">{title}</h4>
            <ul className="mt-2 space-y-2 text-muted-foreground">
              {items(value).map((item, index) => (
                <ExperienceItem
                  key={index}
                  item={item}
                  terms={highlightTerms}
                />
              ))}
            </ul>
          </section>
        ) : null,
      )}

      <TechStackView
        payload={payload}
        renderChip={(label) => (
          <SkillChip
            label={label}
            matched={skillMatchesRole(label, highlightTerms)}
          />
        )}
      />
    </div>
  )
}
