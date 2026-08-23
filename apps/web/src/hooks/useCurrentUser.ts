import { useQuery } from '@tanstack/react-query'

import { userServices } from '@/services/userServices'

export const currentUserKey = ['currentUser'] as const

export const useCurrentUser = () =>
  useQuery({
    queryKey: currentUserKey,
    queryFn: userServices.getCurrentUser,
  })
