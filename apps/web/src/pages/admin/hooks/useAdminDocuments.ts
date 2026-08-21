import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { api } from '@/utils'
import type {
  AdminDocument,
  DocumentStatus,
  DocumentType,
  SyncDocumentsResponse,
} from '../types'

const documentsKey = (type: DocumentType, status?: DocumentStatus) =>
  ['admin-documents', type, status ?? 'all'] as const

export const useAdminDocuments = (
  type: DocumentType,
  status?: DocumentStatus,
) => {
  const params = new URLSearchParams({ type })
  if (status) params.set('status', status)

  return useQuery({
    queryKey: documentsKey(type, status),
    queryFn: async () => {
      const response = await api.get<AdminDocument[]>(
        `/admin/documents?${params.toString()}`,
      )
      return response.data
    },
  })
}

export const useUploadDocument = (type: DocumentType) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (file: File) => {
      const body = new FormData()
      body.append('file', file)
      body.append('type', type)
      const response = await api.post<AdminDocument>('/admin/documents', body)
      return response.data
    },
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
    mutationFn: async (ids?: number[]) => {
      const response = await api.post<SyncDocumentsResponse>(
        '/admin/documents/sync',
        { ids: ids?.length ? ids : null },
      )
      return response.data
    },
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
    mutationFn: async (id: number) => {
      await api.delete(`/admin/documents/${id}`)
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ['admin-documents', type],
      })
    },
  })
}
