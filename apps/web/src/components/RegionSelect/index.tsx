import type { InputHTMLAttributes } from 'react'

import { Input } from '@/components/Input'
import { useRegionCatalog } from '@/hooks/useRegionCatalog'

type RegionSelectProps = InputHTMLAttributes<HTMLInputElement> & {
  id: string
}

export const RegionSelect = ({ id, className, ...props }: RegionSelectProps) => {
  const catalog = useRegionCatalog()
  const regions = catalog.data ?? []

  return (
    <div className="grid gap-1">
      <Input
        id={id}
        list={`${id}-catalog`}
        autoComplete="off"
        maxLength={120}
        className={className}
        {...props}
      />
      <datalist id={`${id}-catalog`}>
        {regions.map((region) => (
          <option key={region} value={region} />
        ))}
      </datalist>
      {catalog.isError ? (
        <span role="alert" className="text-sm text-destructive">
          Could not load the region catalog.
        </span>
      ) : null}
    </div>
  )
}
