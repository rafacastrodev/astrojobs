import { useMutation } from '@tanstack/react-query'
import { useRouter } from '@tanstack/react-router'
import { useState } from 'react'

import { AppHeader } from '@/components/AppHeader'
import { Button } from '@/components/Button'
import { ProfileSection } from '@/pages/dashboard/components/ProfileSection'
import { useDashboard } from '@/pages/dashboard/hooks/useDashboard'
import { userServices } from '@/services/userServices'
import { getApiErrorMessage } from '@/utils'

import { ProfessionalProfileForm } from './ProfessionalProfileForm'

type ProfilePageProps = {
  name: string
  email: string
  role: 'professional' | 'recruiter'
  createdAt: string
  photoUrl?: string | null
  jobTitle?: string | null
  region?: string | null
  salaryMinUsd?: number | null
  salaryMaxUsd?: number | null
}

const MAX_PHOTO_BYTES = 2 * 1024 * 1024

export const ProfilePage = ({
  name,
  email,
  role,
  createdAt,
  photoUrl,
  jobTitle,
  region,
  salaryMinUsd,
  salaryMaxUsd,
}: ProfilePageProps) => {
  const { handleLogout, isLoggingOut } = useDashboard()
  const router = useRouter()
  const [validationError, setValidationError] = useState<string | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  const upload = useMutation({
    mutationFn: userServices.uploadPhoto,
    onSuccess: async () => {
      setPreviewUrl(null)
      await router.invalidate()
    },
    onError: () => {
      setPreviewUrl(null)
    },
  })

  const handleChangePhoto = (file: File) => {
    upload.reset()
    if (!file.type.startsWith('image/') || file.type === 'image/svg+xml') {
      setValidationError('Use a JPEG, PNG, or WebP image')
      return
    }
    if (file.size > MAX_PHOTO_BYTES) {
      setValidationError('Photo is larger than the 2MB limit')
      return
    }
    setValidationError(null)
    setPreviewUrl(URL.createObjectURL(file))
    upload.mutate(file)
  }

  return (
    <div className="flex-1 bg-background px-4 py-10 text-foreground [animation:auth-fade-in_280ms_ease-out]">
      <div className="mx-auto flex w-full max-w-xl flex-col gap-8">
        <AppHeader
          title="Profile"
          name={name}
          photoUrl={previewUrl ?? photoUrl}
        >
          <div className="w-28">
            <Button
              onClick={handleLogout}
              isLoading={isLoggingOut}
              className="!py-2 text-sm"
            >
              Log out
            </Button>
          </div>
        </AppHeader>
        <ProfileSection
          name={name}
          email={email}
          role={role}
          createdAt={createdAt}
          photoUrl={previewUrl ?? photoUrl}
          onChangePhoto={handleChangePhoto}
          isUploadingPhoto={upload.isPending}
          photoError={
            validationError ??
            (upload.isError ? getApiErrorMessage(upload.error) : null)
          }
        />
        {role === 'professional' ? (
          <ProfessionalProfileForm
            jobTitle={jobTitle}
            region={region}
            salaryMinUsd={salaryMinUsd}
            salaryMaxUsd={salaryMaxUsd}
          />
        ) : null}
      </div>
    </div>
  )
}
