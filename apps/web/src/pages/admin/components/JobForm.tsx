import { useState } from 'react'

import { Button } from '@/components/Button'
import { CloseIcon } from '@/components/icons'
import { RegionSelect } from '@/components/RegionSelect'
import { getApiErrorMessage } from '@/utils'

import { useCreateJob, useTechnologyCatalog } from '../hooks/useAdminDocuments'
import type { JobEmploymentType, JobSeniority, JobWorkMode } from '../types'

const selectClassName = 'rounded-lg border border-border bg-input p-3'

const addTechnology = (current: string[], raw: string, catalog: string[]) => {
  const value = raw.trim()
  if (!value) return current
  const canonical = catalog.find(
    (technology) => technology.toLowerCase() === value.toLowerCase(),
  )
  if (!canonical) return null
  if (current.some((item) => item.toLowerCase() === canonical.toLowerCase())) {
    return current
  }
  return [...current, canonical]
}

type JobFormProps = {
  onCreated?: () => void
}

export const JobForm = ({ onCreated }: JobFormProps) => {
  const create = useCreateJob()
  const technologyCatalog = useTechnologyCatalog()
  const catalog = technologyCatalog.data ?? []
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [technologies, setTechnologies] = useState<string[]>([])
  const [draftTech, setDraftTech] = useState('')
  const [technologyError, setTechnologyError] = useState<string | null>(null)
  const [seniority, setSeniority] = useState<JobSeniority>('mid')
  const [workMode, setWorkMode] = useState<JobWorkMode>('remote')
  const [region, setRegion] = useState('')
  const [employmentType, setEmploymentType] =
    useState<JobEmploymentType>('full-time')
  const [salaryMin, setSalaryMin] = useState('')
  const [salaryMax, setSalaryMax] = useState('')
  const [hideSalary, setHideSalary] = useState(false)

  const parseUsd = (value: string) => {
    const trimmed = value.trim()
    if (!trimmed) return null
    return /^\d+$/.test(trimmed) ? Number(trimmed) : null
  }

  const salaryMinUsd = parseUsd(salaryMin)
  const salaryMaxUsd = parseUsd(salaryMax)
  const salaryInvalid =
    (salaryMin.trim() !== '' && salaryMinUsd == null) ||
    (salaryMax.trim() !== '' && salaryMaxUsd == null) ||
    (salaryMinUsd != null && salaryMaxUsd != null && salaryMinUsd > salaryMaxUsd)

  const commitDraft = () => {
    const next = addTechnology(technologies, draftTech, catalog)
    if (next === null) {
      setTechnologyError('Choose a technology from the catalog.')
      return false
    }
    setTechnologies(next)
    setDraftTech('')
    setTechnologyError(null)
    return true
  }

  return (
    <form
      className="grid gap-4 rounded-2xl border border-border bg-card p-6"
      onSubmit={(event) => {
        event.preventDefault()
        const nextTechnologies = addTechnology(technologies, draftTech, catalog)
        if (nextTechnologies === null) {
          setTechnologyError('Choose a technology from the catalog.')
          return
        }
        if (!title.trim() || nextTechnologies.length === 0 || !region.trim()) {
          return
        }
        if (salaryInvalid) return
        create.mutate(
          {
            title: title.trim(),
            technologies: nextTechnologies,
            description: description.trim(),
            seniority,
            work_mode: workMode,
            region: region.trim(),
            employment_type: employmentType,
            salary_min_usd: salaryMinUsd,
            salary_max_usd: salaryMaxUsd,
            hide_salary: hideSalary,
          },
          {
            onSuccess: () => {
              setTitle('')
              setDescription('')
              setTechnologies([])
              setDraftTech('')
              setTechnologyError(null)
              setSeniority('mid')
              setWorkMode('remote')
              setRegion('')
              setEmploymentType('full-time')
              setSalaryMin('')
              setSalaryMax('')
              setHideSalary(false)
              onCreated?.()
            },
          },
        )
      }}
    >
      <label className="grid gap-1 text-sm" htmlFor="job-title">
        <span className="font-medium">Title</span>
        <input
          id="job-title"
          name="title"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          maxLength={200}
          className="rounded-lg border border-border bg-input p-3"
        />
      </label>
      <label className="grid gap-1 text-sm" htmlFor="job-technologies">
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
            id="job-technologies"
            name="technologies"
            list="technology-catalog"
            value={draftTech}
            onChange={(event) => {
              setDraftTech(event.target.value)
              setTechnologyError(null)
            }}
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
              technologies.length === 0
                ? 'Python, FastAPI, React'
                : 'Add another'
            }
            className="min-w-40 flex-1 bg-transparent p-2 outline-none placeholder-muted-foreground"
          />
          <datalist id="technology-catalog">
            {catalog.map((technology) => (
              <option key={technology} value={technology} />
            ))}
          </datalist>
        </div>
        {technologyError ? (
          <span role="alert" className="text-destructive">
            {technologyError}
          </span>
        ) : null}
        {technologyCatalog.isError ? (
          <span role="alert" className="text-destructive">
            Could not load the technology catalog.
          </span>
        ) : null}
      </label>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="grid gap-1 text-sm" htmlFor="job-seniority">
          <span className="font-medium">Seniority</span>
          <select
            id="job-seniority"
            name="seniority"
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
        <label className="grid gap-1 text-sm" htmlFor="job-work-mode">
          <span className="font-medium">Work mode</span>
          <select
            id="job-work-mode"
            name="work_mode"
            value={workMode}
            onChange={(event) => setWorkMode(event.target.value as JobWorkMode)}
            className={selectClassName}
          >
            <option value="remote">Remote</option>
            <option value="hybrid">Hybrid</option>
            <option value="on-site">On-site</option>
          </select>
        </label>
        <label className="grid gap-1 text-sm" htmlFor="job-region">
          <span className="font-medium">Region</span>
          <RegionSelect
            id="job-region"
            name="region"
            value={region}
            onChange={(event) => setRegion(event.target.value)}
            maxLength={120}
            placeholder="Sao Paulo"
            className="rounded-lg border border-border bg-input p-3"
          />
        </label>
        <label className="grid gap-1 text-sm" htmlFor="job-employment-type">
          <span className="font-medium">Contract type</span>
          <select
            id="job-employment-type"
            name="employment_type"
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
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="grid gap-1 text-sm" htmlFor="job-salary-min">
          <span className="font-medium">Salary min (USD)</span>
          <input
            id="job-salary-min"
            name="salary_min_usd"
            type="text"
            inputMode="numeric"
            value={salaryMin}
            onChange={(event) => setSalaryMin(event.target.value)}
            placeholder="Optional"
            className="rounded-lg border border-border bg-input p-3"
          />
        </label>
        <label className="grid gap-1 text-sm" htmlFor="job-salary-max">
          <span className="font-medium">Salary max (USD)</span>
          <input
            id="job-salary-max"
            name="salary_max_usd"
            type="text"
            inputMode="numeric"
            value={salaryMax}
            onChange={(event) => setSalaryMax(event.target.value)}
            placeholder="Optional"
            className="rounded-lg border border-border bg-input p-3"
          />
        </label>
      </div>
      <label className="flex items-center gap-2 text-sm" htmlFor="job-hide-salary">
        <input
          id="job-hide-salary"
          name="hide_salary"
          type="checkbox"
          checked={hideSalary}
          onChange={(event) => setHideSalary(event.target.checked)}
        />
        <span>Hide salary from candidates</span>
      </label>
      {salaryInvalid ? (
        <p role="alert" className="text-sm text-destructive">
          Enter a valid USD range. Maximum must be at least the minimum.
        </p>
      ) : null}
      <label className="grid gap-1 text-sm" htmlFor="job-description">
        <span className="font-medium">Description</span>
        <textarea
          id="job-description"
          name="description"
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
            salaryInvalid ||
            (technologies.length === 0 && !draftTech.trim()) ||
            technologyCatalog.isLoading
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
