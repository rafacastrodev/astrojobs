import { useQuery } from '@tanstack/react-query'

import { catalogServices } from '@/services/catalogServices'

export const regionCatalogKey = ['region-catalog'] as const

export const useRegionCatalog = () =>
  useQuery({
    queryKey: regionCatalogKey,
    queryFn: catalogServices.listRegions,
    staleTime: Infinity,
  })
