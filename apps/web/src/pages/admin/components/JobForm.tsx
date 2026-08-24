import { useState } from 'react'

import { Button } from '@/components/Button'
import { CloseIcon } from '@/components/icons'
import { getApiErrorMessage } from '@/utils'

import { useCreateJob } from '../hooks/useAdminDocuments'
import type {
  JobEmploymentType,
  JobSeniority,
  JobWorkMode,
} from '../types'

const selectClassName = 'rounded-lg border border-border bg-input p-3'

const addTechnology = (current: string[], raw: string) => {
  const value = raw.trim()
  if (!value) return current
  if (current.some((item) => item.toLowerCase() === value.toLowerCase())) {
    return current
  }
  return [...current, value]
}

export const JobForm = () => {
  const create = useCreateJob()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [technologies, setTechnologies] = useState<string[]>([])
  const [draftTech, setDraftTech] = useState('')
  const [seniority, setSeniority] = useState<JobSeniority>('mid')
  const [workMode, setWorkMode] = useState<JobWorkMode>('remote')
  const [region, setRegion] = useState('')
  const [employmentType, setEmploymentType] =
    useState<JobEmploymentType>('full-time')

  const commitDraft = () => {
    setTechnologies((current) => addTechnology(current, draftTech))
    setDraftTech('')
  }

  return (
    <form
      className="grid gap-4 rounded-2xl border border-border bg-card p-6"
      onSubmit={(event) => {
        event.preventDefault()
        const nextTechnologies = addTechnology(technologies, draftTech)
        if (!title.trim() || nextTechnologies.length === 0 || !region.trim()) {
          return
        }
        create.mutate(
          {
            title: title.trim(),
            technologies: nextTechnologies,
            description: description.trim(),
            seniority,
            work_mode: workMode,
            region: region.trim(),
            employment_type: employmentType,
          },
          {
            onSuccess: () => {
              setTitle('')
              setDescription('')
              setTechnologies([])
              setDraftTech('')
              setSeniority('mid')
              setWorkMode('remote')
              setRegion('')
              setEmploymentType('full-time')
            },
          },
        )
      }}
    >
      <label className="grid gap-1 text-sm">
        <span className="font-medium">Title</span>
        <input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          maxLength={200}
          className="rounded-lg border border-border bg-input p-3"
        />
      </label>
      <label className="grid gap-1 text-sm">
        <span className="font-medium">Technologies</span>
        <p className="text-muted-foreground">
          Add the stack you need. These are used to find matching resumes.
        </p>
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-input p-2">
          {technologies.map((tech) => (
            <span
              key={tech}
              className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-card-foreground"
            >
              {tech}
              <button
                type="button"
                aria-label={`Remove ${tech}`}
                onClick={() =>
                  setTechnologies((current) =>
                    current.filter((item) => item !== tech),
                  )
                }
                className="cursor-pointer rounded-full p-0.5 text-muted-foreground transition hover:text-destructive"
              >
                <CloseIcon className="h-3 w-3" />
              </button>
            </span>
          ))}
          <input
            value={draftTech}
            onChange={(event) => setDraftTech(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ',') {
                event.preventDefault()
                commitDraft()
              }
              if (
                event.key === 'Backspace' &&
                draftTech === '' &&
                technologies.length > 0
              ) {
                setTechnologies((current) => current.slice(0, -1))
              }
            }}
            onBlur={commitDraft}
            placeholder={
              technologies.length === 0 ? 'Python, FastAPI, React' : 'Add another'
            }
            className="min-w-40 flex-1 bg-transparent p-2 outline-none placeholder-muted-foreground"
          />
        </div>
      </label>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="grid gap-1 text-sm">
          <span className="font-medium">Seniority</span>
          <select
            value={seniority}
            onChange={(event) =>
              setSeniority(event.target.value as JobSeniority)
            }
            className={selectClassName}
          >
            <option value="intern">Intern</option>
            <option value="junior">Junior</option>
            <option value="mid">Mid-level</option>
            <option value="senior">Senior</option>
            <option value="lead">Lead</option>
            <option value="principal">Principal</option>
            <option value="staff">Staff</option>
          </select>
        </label>
        <label className="grid gap-1 text-sm">
          <span className="font-medium">Work mode</span>
          <select
            value={workMode}
            onChange={(event) =>
              setWorkMode(event.target.value as JobWorkMode)
            }
            className={selectClassName}
          >
            <option value="remote">Remote</option>
            <option value="hybrid">Hybrid</option>
            <option value="on-site">On-site</option>
          </select>
        </label>
        <label className="grid gap-1 text-sm">
          <span className="font-medium">Region</span>
          <input
            value={region}
            onChange={(event) => setRegion(event.target.value)}
            maxLength={120}
            placeholder="São Paulo, Brazil"
            className="rounded-lg border border-border bg-input p-3"
          />
        </label>
        <label className="grid gap-1 text-sm">
          <span className="font-medium">Contract type</span>
          <select
            value={employmentType}
            onChange={(event) =>
              setEmploymentType(event.target.value as JobEmploymentType)
            }
            className={selectClassName}
          >
            <option value="full-time">Full-time</option>
            <option value="part-time">Part-time</option>
            <option value="contract">Contract</option>
            <option value="internship">Internship</option>
            <option value="temporary">Temporary</option>
          </select>
        </label>
      </div>
      <label className="grid gap-1 text-sm">
        <span className="font-medium">Description</span>
        <textarea
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          rows={5}
          maxLength={8000}
          className="rounded-lg border border-border bg-input p-3"
        />
      </label>
      <div className="w-48">
        <Button
          type="submit"
          disabled={
            !title.trim() ||
            !region.trim() ||
            (technologies.length === 0 && !draftTech.trim())
          }
          isLoading={create.isPending}
        >
          Create job
        </Button>
      </div>
      {create.isError ? (
        <p role="alert" className="text-sm text-destructive">
          {getApiErrorMessage(create.error, 'Could not create the job')}
        </p>
      ) : null}
      {create.isSuccess ? (
        <p className="text-sm text-muted-foreground">Job created.</p>
      ) : null}
    </form>
  )
}