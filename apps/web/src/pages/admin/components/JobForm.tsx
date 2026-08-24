import { useState } from 'react'

import { Button } from '@/components/Button'
import { getApiErrorMessage } from '@/utils'

import { useCreateJob } from '../hooks/useAdminDocuments'
import type { JobCreatePayload } from '../types'

const lines = (value: string) =>
  value
    .split('\n')
    .map((item) => item.trim())
    .filter(Boolean)

export const JobForm = () => {
  const create = useCreateJob()
  const [title, setTitle] = useState('')
  const [requirements, setRequirements] = useState('')
  const [responsibilities, setResponsibilities] = useState('')
  const [seniority, setSeniority] =
    useState<JobCreatePayload['seniority']>('unspecified')
  const [employmentType, setEmploymentType] =
    useState<JobCreatePayload['employment_type']>('unspecified')

  const canSubmit =
    title.trim().length > 0 &&
    (lines(requirements).length > 0 || lines(responsibilities).length > 0)

  return (
    <form
      className="grid gap-4 rounded-2xl border border-border bg-card p-6"
      onSubmit={(event) => {
        event.preventDefault()
        if (!canSubmit) return
        create.mutate(
          {
            title: title.trim(),
            requirements: lines(requirements),
            responsibilities: lines(responsibilities),
            seniority,
            employment_type: employmentType,
          },
          {
            onSuccess: () => {
              setTitle('')
              setRequirements('')
              setResponsibilities('')
              setSeniority('unspecified')
              setEmploymentType('unspecified')
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
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="grid gap-1 text-sm">
          <span className="font-medium">Seniority</span>
          <select
            value={seniority}
            onChange={(event) =>
              setSeniority(event.target.value as JobCreatePayload['seniority'])
            }
            className="rounded-lg border border-border bg-input p-3"
          >
            <option value="unspecified">Not specified</option>
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
          <span className="font-medium">Employment type</span>
          <select
            value={employmentType}
            onChange={(event) =>
              setEmploymentType(
                event.target.value as JobCreatePayload['employment_type'],
              )
            }
            className="rounded-lg border border-border bg-input p-3"
          >
            <option value="unspecified">Not specified</option>
            <option value="full-time">Full-time</option>
            <option value="part-time">Part-time</option>
            <option value="contract">Contrato</option>
            <option value="internship">Internship</option>
            <option value="temporary">Temporary</option>
          </select>
        </label>
      </div>
      <label className="grid gap-1 text-sm">
        <span className="font-medium">Requirements — one per line</span>
        <textarea
          value={requirements}
          onChange={(event) => setRequirements(event.target.value)}
          rows={5}
          className="rounded-lg border border-border bg-input p-3"
        />
      </label>
      <label className="grid gap-1 text-sm">
        <span className="font-medium">Responsibilities — one per line</span>
        <textarea
          value={responsibilities}
          onChange={(event) => setResponsibilities(event.target.value)}
          rows={5}
          className="rounded-lg border border-border bg-input p-3"
        />
      </label>
      <div className="w-48">
        <Button
          type="submit"
          disabled={!canSubmit}
          isLoading={create.isPending}
        >
          Create and index job
        </Button>
      </div>
      {create.isError ? (
        <p role="alert" className="text-sm text-destructive">
          {getApiErrorMessage(create.error, 'Could not create the job')}
        </p>
      ) : null}
      {create.isSuccess ? (
        <p className="text-sm text-muted-foreground">
          Job created. Its indexing status appears below.
        </p>
      ) : null}
    </form>
  )
}
