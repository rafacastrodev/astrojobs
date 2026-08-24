import type { Resume } from '../types'

type Props = { resume: Resume }

const text = (value: unknown) => (typeof value === 'string' ? value : '')
const items = (value: unknown) => (Array.isArray(value) ? value : [])

const renderItem = (item: unknown, index: number) => {
  if (typeof item === 'string') return <li key={index}>{item}</li>
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
  return (
    <li key={index} className="rounded-lg border border-border p-3">
      {heading ? (
        <p className="font-medium text-card-foreground">{heading}</p>
      ) : null}
      {period ? (
        <p className="text-xs text-muted-foreground">{period}</p>
      ) : null}
      {text(value.description) ? (
        <p className="mt-1 whitespace-pre-wrap">{text(value.description)}</p>
      ) : null}
      {items(value.highlights).length ? (
        <ul className="mt-2 list-disc space-y-1 pl-5">
          {items(value.highlights).map((highlight, highlightIndex) => (
            <li key={highlightIndex}>{String(highlight)}</li>
          ))}
        </ul>
      ) : null}
    </li>
  )
}

export const ResumeProfileView = ({ resume }: Props) => {
  const payload = resume.payload
  const summary = text(payload.summary) || text(payload.about)
  const sections = [
    ['Experience', payload.experiences],
    ['Education', payload.education],
    ['Projects', payload.projects],
    ['Certifications', payload.certifications],
    ['Languages', payload.languages],
    ['Additional sections', payload.additional_sections],
  ] as const
  const contact =
    payload.contact && typeof payload.contact === 'object'
      ? (payload.contact as Record<string, unknown>)
      : null

  return (
    <div className="space-y-5 text-sm text-card-foreground">
      {contact ? (
        <section>
          <h4 className="font-semibold">Contact</h4>
          <p className="mt-1 text-muted-foreground">
            {[...items(contact.emails), ...items(contact.phones)]
              .map(String)
              .join(' · ')}
          </p>
        </section>
      ) : null}
      {summary ? (
        <section>
          <h4 className="font-semibold">Summary</h4>
          <p className="mt-1 whitespace-pre-wrap text-muted-foreground">
            {summary}
          </p>
        </section>
      ) : null}
      {items(payload.skills).length ? (
        <section>
          <h4 className="font-semibold">Skills</h4>
          <div className="mt-2 flex flex-wrap gap-2">
            {items(payload.skills).map((skill, index) => (
              <span
                key={index}
                className="rounded-full bg-muted px-2 py-1 text-xs"
              >
                {String(skill)}
              </span>
            ))}
          </div>
        </section>
      ) : null}
      {sections.map(([title, value]) =>
        items(value).length ? (
          <section key={title}>
            <h4 className="font-semibold">{title}</h4>
            <ul className="mt-2 space-y-2 text-muted-foreground">
              {items(value).map(renderItem)}
            </ul>
          </section>
        ) : null,
      )}
      {text(payload.full_text) ? (
        <details className="rounded-lg border border-border p-3">
          <summary className="cursor-pointer font-medium">
            Full extracted text
          </summary>
          <pre className="mt-3 whitespace-pre-wrap font-sans text-xs text-muted-foreground">
            {text(payload.full_text)}
          </pre>
        </details>
      ) : null}
    </div>
  )
}
