import { useState } from 'react'

import { getApiErrorMessage } from '@/utils'

import type { AdminDocument, DocumentType, ResumeMatch } from '../types'
import {
  useAdminDocuments,
  useDeleteDocument,
  useMatchingResumes,
} from './useAdminDocuments'

export const useAdminDashboard = () => {
  const [tab, setTab] = useState<DocumentType>('job')
  const [selectedDocument, setSelectedDocument] =
    useState<AdminDocument | null>(null)
  const [selectedMatch, setSelectedMatch] = useState<ResumeMatch | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  const documentsQuery = useAdminDocuments('job')
  const matchesQuery = useMatchingResumes(tab === 'resume')
  const remove = useDeleteDocument('job')

  const documents = documentsQuery.data ?? []
  const matches = matchesQuery.data ?? []

  const handleDelete = (id: number) => {
    remove.mutate(id, {
      onSuccess: () => {
        if (selectedDocument?.id === id) setSelectedDocument(null)
      },
      onError: (error) => {
        setActionError(getApiErrorMessage(error, 'Delete failed'))
      },
    })
  }

  return {
    tab,
    setTab: (value: DocumentType) => {
      setTab(value)
      setSelectedDocument(null)
      setSelectedMatch(null)
      setActionError(null)
    },
    selectedDocument,
    setSelectedDocument,
    selectedMatch,
    setSelectedMatch,
    actionError,
    documents,
    matches,
    isRemoving: remove.isPending,
    isLoadingDocuments: documentsQuery.isLoading,
    errorMessageDocuments: documentsQuery.error
      ? getApiErrorMessage(documentsQuery.error, 'Failed to load jobs')
      : null,
    isLoadingMatches: matchesQuery.isLoading,
    errorMessageMatches: matchesQuery.error
      ? getApiErrorMessage(matchesQuery.error, 'Failed to load matching resumes')
      : null,
    handleDelete,
  }
}