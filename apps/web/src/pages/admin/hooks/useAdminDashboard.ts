import { useState } from 'react'

import { getApiErrorMessage } from '@/utils'
import type { AdminDocument, DocumentType } from '../types'
import {
  useAdminDocuments,
  useDeleteDocument,
  useSyncDocuments,
  useUploadDocument,
} from './useAdminDocuments'

export const useAdminDashboard = () => {
  const [tab, setTab] = useState<DocumentType>('resume')
  const [selectedIds, setSelectedIds] = useState<number[]>([])
  const [selectedDocument, setSelectedDocument] =
    useState<AdminDocument | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [syncMessage, setSyncMessage] = useState<string | null>(null)

  const documentsQuery = useAdminDocuments(tab)
  const upload = useUploadDocument(tab)
  const sync = useSyncDocuments(tab)
  const remove = useDeleteDocument(tab)

  const documents = documentsQuery.data ?? []
  const draftCount = documents.filter(
    (document) => document.status === 'draft' || document.status === 'failed',
  ).length

  const handleUpload = (file: File) => {
    setUploadError(null)
    setSyncMessage(null)
    upload.mutate(file, {
      onSuccess: () => setUploadError(null),
      onError: (error) => {
        setUploadError(getApiErrorMessage(error, 'Upload failed'))
      },
    })
  }

  const handleSync = () => {
    setSyncMessage(null)
    const ids =
      selectedIds.length > 0
        ? selectedIds
        : documents
            .filter(
              (document) =>
                document.status === 'draft' || document.status === 'failed',
            )
            .map((document) => document.id)

    if (ids.length === 0) {
      setSyncMessage('Nothing to sync on this tab')
      return
    }

    sync.mutate(ids, {
      onSuccess: (result) => {
        setSyncMessage(`Synced ${result.synced}, failed ${result.failed}`)
        setSelectedIds([])
      },
      onError: (error) => {
        setSyncMessage(getApiErrorMessage(error, 'Sync failed'))
      },
    })
  }

  const toggle = (id: number) => {
    setSelectedIds((current) =>
      current.includes(id)
        ? current.filter((value) => value !== id)
        : [...current, id],
    )
  }

  const handleDelete = (id: number) => {
    remove.mutate(id, {
      onSuccess: () => {
        setSelectedIds((current) => current.filter((value) => value !== id))
        if (selectedDocument?.id === id) setSelectedDocument(null)
      },
      onError: (error) => {
        setUploadError(getApiErrorMessage(error, 'Delete failed'))
      },
    })
  }

  return {
    tab,
    setTab,
    selectedIds,
    setSelectedIds,
    selectedDocument,
    setSelectedDocument,
    uploadError,
    setUploadError,
    syncMessage,
    setSyncMessage,
    documents,
    draftCount,
    handleUpload,
    handleSync,
    toggle,
    isUploading: upload.isPending,
    isSyncing: sync.isPending,
    isRemoving: remove.isPending,
    isLoadingDocuments: documentsQuery.isLoading,
    errorMessageDocuments: documentsQuery.error
      ? getApiErrorMessage(documentsQuery.error, 'Failed to load documents')
      : null,
    handleDelete,
  }
}
