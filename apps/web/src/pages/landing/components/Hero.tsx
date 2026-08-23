import { Link } from '@tanstack/react-router'

import { useInView } from '../hooks/useInView'
import { FlapText } from './FlapText'
import { SampleBoard } from './SampleBoard'

export const Hero = () => {
  const { ref, inView } = useInView<HTMLDivElement>(0.3)

  return (
    <section
      ref={ref}
      className="mx-auto flex w-full max-w-5xl flex-col items-center gap-10 px-4 py-16 text-center sm:px-6 sm:py-24 lg:py-32"
    >
      <div className="flex max-w-2xl flex-col items-center gap-6">
        <h1 className="text-balance leading-tight">
          <FlapText
            text="PASS THE ATS SCAN"
            play={inView}
            className="justify-center text-xl sm:text-2xl md:text-4xl"
          />
        </h1>

        <p className="max-w-md text-base text-muted-foreground sm:text-lg">
          Upload your resume and run an AI-scored analysis — a general ATS
          check, or a fit check against a specific job — with the exact
          findings to fix, not vague advice.
        </p>
      </div>

      <SampleBoard />

      <div className="flex items-center gap-4">
        <Link
          to="/login"
          search={{ mode: 'signup' }}
          className="rounded-lg bg-primary px-5 py-2.5 font-medium text-primary-foreground transition hover:opacity-90"
        >
          Sign up free
        </Link>
        <Link
          to="/login"
          className="text-sm text-muted-foreground transition hover:text-foreground"
        >
          Log in
        </Link>
      </div>
    </section>
  )
}
