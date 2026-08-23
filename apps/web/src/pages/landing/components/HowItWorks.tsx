import { useInView } from '../hooks/useInView'

const STEPS = [
  {
    index: '01',
    title: 'Upload',
    description: 'Upload your resume — PDF, DOCX, TXT, or MD, up to 5MB.',
  },
  {
    index: '02',
    title: 'Analyze',
    description:
      'Run a general ATS check, or compare it against a job from the catalog, or one you paste in.',
  },
  {
    index: '03',
    title: 'Improve',
    description:
      'Get a score, a summary, and itemized findings you can act on immediately.',
  },
]

export const HowItWorks = () => {
  const { ref, inView } = useInView<HTMLDivElement>(0.3)

  return (
    <section
      ref={ref}
      className="mx-auto w-full max-w-5xl px-4 py-16 sm:px-6 sm:py-24"
    >
      <h2 className="max-w-md text-2xl font-semibold text-foreground sm:text-3xl">
        How it works
      </h2>

      <div className="mt-8 border-t border-border">
        {STEPS.map((step, i) => (
          <div
            key={step.index}
            className="flex flex-col gap-2 border-b border-border py-6 opacity-0 [animation-fill-mode:forwards] sm:flex-row sm:items-baseline sm:gap-8"
            style={
              inView
                ? {
                    animation: 'row-in 400ms ease-out forwards',
                    animationDelay: `${i * 120}ms`,
                  }
                : undefined
            }
          >
            <span className="font-display text-sm text-muted-foreground sm:w-12">
              {step.index}
            </span>
            <div>
              <h3 className="text-lg font-medium text-foreground">
                {step.title}
              </h3>
              <p className="mt-1 max-w-lg text-sm text-muted-foreground">
                {step.description}
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
