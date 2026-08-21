import { createFileRoute } from '@tanstack/react-router'

import { PrivacyPolicy } from '@/pages/legal/components/PrivacyPolicy'

// Public on purpose: Google's OAuth verification fetches this URL without a
// session, and the LGPD expects the policy to be reachable by anyone.
export const Route = createFileRoute('/privacy')({
  component: PrivacyPolicy,
})
