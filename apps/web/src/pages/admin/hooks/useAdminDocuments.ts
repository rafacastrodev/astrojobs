import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { QueryClient } from '@tanstack/react-query'

import { adminDocumentServices } from '@/services/adminDocumentServices'

import type { ApplicationStatus } from '../types'

const recruiterJobsKey = ['recruiter-jobs'] as const
const recruiterApplicationsKey = ['recruiter-applications'] as const
const technologiesKey = ['technology-catalog'] as const
const recruiterMatchesKey = ['recruiter-matches'] as const

export const useTechnologyCatalog = () =>
  useQuery({
    queryKey: technologiesKey,
    queryFn: adminDocumentServices.listTechnologies,
    staleTime: Infinity,
  })

export const useRecruiterJobs = () => {
  return useQuery({
    queryKey: recruiterJobsKey,
    queryFn: adminDocumentServices.listJobs,
  })
}

export const useRecruiterApplications = () => {
  return useQuery({
    queryKey: recruiterApplicationsKey,
    queryFn: () => adminDocumentServices.listApplications(),
  })
}

export const useRecruiterMatches = () =>
  useQuery({
    queryKey: recruiterMatchesKey,
    queryFn: adminDocumentServices.listMatches,
  })

export const useCreateJob = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: adminDocumentServices.createJob,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: recruiterJobsKey })
      void queryClient.invalidateQueries({ queryKey: ['catalog-jobs'] })
    },
  })
}

export const useDeleteJob = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: adminDocumentServices.removeJob,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: recruiterJobsKey })
      void queryClient.invalidateQueries({ queryKey: recruiterApplicationsKey })
      void queryClient.invalidateQueries({ queryKey: ['catalog-jobs'] })
    },
  })
}

export const useCloseJob = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: adminDocumentServices.closeJob,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: recruiterJobsKey })
      void queryClient.invalidateQueries({ queryKey: recruiterMatchesKey })
      void queryClient.invalidateQueries({ queryKey: ['catalog-jobs'] })
    },
  })
}

export const useCreateOffer = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: adminDocumentServices.createOffer,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: recruiterMatchesKey })
    },
  })
}

const invalidateApplicationViews = (queryClient: QueryClient) => {
  void queryClient.invalidateQueries({ queryKey: recruiterApplicationsKey })
  void queryClient.invalidateQueries({ queryKey: recruiterMatchesKey })
  void queryClient.invalidateQueries({ queryKey: ['catalog-jobs'] })
}

export const useUpdateApplicationStatus = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      applicationId,
      status,
    }: {
      applicationId: number
      status: ApplicationStatus
    }) => adminDocumentServices.updateApplicationStatus(applicationId, status),
    onSuccess: () => invalidateApplicationViews(queryClient),
  })
}

export const useRemoveCandidate = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: adminDocumentServices.removeCandidate,
    onSuccess: () => invalidateApplicationViews(queryClient),
  })
}
