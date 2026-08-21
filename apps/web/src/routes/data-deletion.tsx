import { createFileRoute } from '@tanstack/react-router'

import { DataDeletion } from '@/pages/legal/components/DataDeletion'

export const Route = createFileRoute('/data-deletion')({
  component: DataDeletion,
})
