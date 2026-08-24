import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { adminDocumentServices } from '@/services/adminDocumentServices'

const recruiterJobsKey = ['recruiter-jobs'] as const
const recruiterApplicationsKey = ['recruiter-applications'] as const
const technologiesKey = ['technology-catalog'] as const

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
    queryFn: adminDocumentServices.listApplications,
  })
}

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
