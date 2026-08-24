import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { adminDocumentServices } from '@/services/adminDocumentServices'
import type { DocumentStatus, DocumentType } from '../types'

const documentsKey = (type: DocumentType, status?: DocumentStatus) =>
  ['admin-documents', type, status ?? 'all'] as const

export const useAdminDocuments = (
  type: DocumentType,
  status?: DocumentStatus,
) => {
  return useQuery({
    queryKey: documentsKey(type, status),
    queryFn: () => adminDocumentServices.list(type, status),
  })
}

export const useUploadDocument = (type: DocumentType) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (file: File) => adminDocumentServices.upload(type, file),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ['admin-documents', type],
      })
    },
  })
}

export const useSyncDocuments = (type: DocumentType) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: adminDocumentServices.sync,
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ['admin-documents', type],
      })
    },
  })
}

export const useDeleteDocument = (type: DocumentType) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: adminDocumentServices.remove,
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ['admin-documents', type],
      })
    },
  })
}

export const useCreateJob = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: adminDocumentServices.createJob,
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ['admin-documents', 'job'],
      })
      void queryClient.invalidateQueries({ queryKey: ['catalog-jobs'] })
    },
  })
}
