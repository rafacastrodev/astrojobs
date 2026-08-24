import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'

import { resumeServices } from '@/services/resumeServices'
import { getApiErrorMessage } from '@/utils'

import type { Resume } from '../types'

// Kept in sync with CompositeFileTextLoader and MAX_UPLOAD_BYTES on the API.
export const ACCEPTED_EXTENSIONS = ['.pdf', '.docx', '.txt', '.md']
export const MAX_FILE_BYTES = 5 * 1024 * 1024

const resumesKey = ['resumes'] as const

function validateFile(file: File) {
  const extension = file.name.slice(file.name.lastIndexOf('.')).toLowerCase()
  if (!ACCEPTED_EXTENSIONS.includes(extension)) {
    return `Unsupported file type. Use ${ACCEPTED_EXTENSIONS.join(', ')}.`
  }
  if (file.size > MAX_FILE_BYTES) {
    return 'File is larger than the 5MB limit.'
  }
  if (file.size === 0) {
    return 'That file is empty.'
  }
  return null
}

function storedFileSize(resume: Resume) {
  const file = resume.payload.file
  if (!file || typeof file !== 'object' || !('size' in file)) return null
  return typeof file.size === 'number' ? file.size : null
}

function isDuplicateFile(file: File, resumes: Resume[]) {
  const name = file.name.toLowerCase()
  return resumes.some((resume) => {
    if (resume.source_filename.toLowerCase() !== name) return false
    const size = storedFileSize(resume)
    return size === null || size === file.size
  })
}

export const useResumes = () => {
  const queryClient = useQueryClient()
  const [validationError, setValidationError] = useState<string | null>(null)

  const resumes = useQuery({
    queryKey: resumesKey,
    queryFn: resumeServices.list,
  })

  const upload = useMutation({
    mutationFn: resumeServices.upload,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: resumesKey })
      void queryClient.invalidateQueries({ queryKey: ['catalog-jobs'] })
    },
  })

  const remove = useMutation({
    mutationFn: resumeServices.remove,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: resumesKey })
      void queryClient.invalidateQueries({ queryKey: ['catalog-jobs'] })
    },
  })

  const process = useMutation({
    mutationFn: (id: number) => resumeServices.process(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: resumesKey })
      void queryClient.invalidateQueries({ queryKey: ['catalog-jobs'] })
    },
  })

  const rename = useMutation({
    mutationFn: ({ id, name }: { id: number; name: string }) =>
      resumeServices.rename(id, name),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: resumesKey })
    },
  })

  const resumeList = Array.isArray(resumes.data) ? resumes.data : []

  const handleUpload = (file: File) => {
    upload.reset()
    const error = validateFile(file)
    if (error) {
      setValidationError(error)
      return
    }
    if (isDuplicateFile(file, resumeList)) {
      setValidationError('This resume was already uploaded')
      return
    }
    setValidationError(null)
    upload.mutate(file)
  }

  return {
    resumes: resumeList,
    isLoading: resumes.isLoading,
    listError: resumes.isError ? getApiErrorMessage(resumes.error) : null,
    handleUpload,
    isUploading: upload.isPending,
    uploadError:
      validationError ??
      (upload.isError ? getApiErrorMessage(upload.error) : null),
    handleDelete: (id: number) => remove.mutate(id),
    deletingId: remove.isPending ? remove.variables : null,
    deleteError: remove.isError ? getApiErrorMessage(remove.error) : null,
    handleProcess: (id: number) => process.mutate(id),
    processingId: process.isPending ? process.variables : null,
    processError: process.isError ? getApiErrorMessage(process.error) : null,
    handleRename: (id: number, name: string) => rename.mutate({ id, name }),
    renamingId: rename.isPending ? rename.variables.id : null,
    renameError: rename.isError ? getApiErrorMessage(rename.error) : null,
  }
}
