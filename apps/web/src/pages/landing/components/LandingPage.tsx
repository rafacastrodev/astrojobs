// Direction contract: .impeccable/surfaces/src-routes-index-tsx.md
// (impeccable seed 8bfa6270, direction: split-flap departures board)
import { Header } from '@/components/Header'

import { Hero } from './Hero'
import { HowItWorks } from './HowItWorks'
import { LandingFooter } from './LandingFooter'

export const LandingPage = () => {
  return (
    <div className="flex-1 bg-background text-foreground">
      <Header />
      <Hero />
      <HowItWorks />
      <LandingFooter />
    </div>
  )
}
