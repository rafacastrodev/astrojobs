import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { readTechStack } from '../dashboard/components/TechStackView'
import { rankMatchesForJob } from './utils/recruiterMatches'

const source = (relative: string) =>
  readFileSync(join(__dirname, relative), 'utf8')

describe('audit UI contracts', () => {
  it('FUN-03 exposes application status transitions on the candidate card', () => {
    const jobList = source('./components/JobList.tsx')
    expect(jobList).toContain('Application status')
    expect(jobList).toContain('onStatusChange')
    expect(jobList).toContain("'reviewing'")
    expect(jobList).toContain("'rejected'")
  })

  it('FUN-04 labels the score as stack match', () => {
    expect(source('../dashboard/components/JobsSection.tsx')).toContain(
      '% stack match',
    )
    expect(source('./components/MatchingProfessionals.tsx')).toContain(
      '% stack match',
    )
  })

  it('FUN-05 binds send offer to the selected role, not the first job in the catalog', () => {
    const ranked = rankMatchesForJob(
      [
        {
          id: 1,
          created_at: '2026-08-20T12:00:00Z',
          professional_name: 'QA',
          professional_email: 'qa@example.com',
          source_filename: 'qa.pdf',
          score: 1,
          matched_technologies: ['Python'],
          matched_jobs: [{ id: 20, title: 'QA XSS Probe', score: 1 }],
          payload: {},
          summary: null,
          applied_job_ids: [],
          offered_job_ids: [],
        },
        {
          id: 2,
          created_at: '2026-08-21T12:00:00Z',
          professional_name: 'Backend',
          professional_email: 'be@example.com',
          source_filename: 'be.pdf',
          score: 1,
          matched_technologies: ['Python'],
          matched_jobs: [{ id: 10, title: 'Backend Engineer', score: 0.6 }],
          payload: {},
          summary: null,
          applied_job_ids: [],
          offered_job_ids: [],
        },
      ],
      10,
    )
    expect(ranked.map((item) => item.id)).toEqual([2])
    expect(ranked[0].matched_jobs[0].title).toBe('Backend Engineer')

    const modal = source('./components/MatchingProfessionals.tsx')
    expect(modal).toContain('jobId: selectedJob.id')
    expect(modal).toContain('Send offer for {target.jobTitle}')
  })

  it('UX-01 keeps resume copy in English', () => {
    expect(source('../dashboard/components/ResumeProfileView.tsx')).toContain(
      'years',
    )
    expect(source('../dashboard/components/ResumeProfileView.tsx')).not.toContain(
      'anos',
    )
    expect(source('../dashboard/components/ResumeSection.tsx')).not.toContain(
      'anos',
    )
  })

  it('UX-02 associates create-job fields with labels', () => {
    const form = source('./components/JobForm.tsx')
    for (const id of [
      'job-title',
      'job-technologies',
      'job-seniority',
      'job-work-mode',
      'job-region',
      'job-employment-type',
      'job-salary-min',
      'job-salary-max',
      'job-hide-salary',
      'job-description',
    ]) {
      expect(form).toContain(`htmlFor="${id}"`)
      expect(form).toContain(`id="${id}"`)
    }
  })

  it('FUN-02 strips section prefixes from stored skill chips', () => {
    const groups = readTechStack({
      skills: ['Languages: Python', 'Testing: Playwright'],
    })
    expect(groups.flatMap((group) => group.values)).toEqual([
      'Python',
      'Playwright',
    ])
  })
})
