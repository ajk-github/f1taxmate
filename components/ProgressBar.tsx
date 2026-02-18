import React from 'react'

interface ProgressBarProps {
  currentStep: number
  totalSteps: number
  stepLabels?: string[]
}

const DEFAULT_LABELS = ['Personal', 'University', 'Residency', 'Income', 'Review']

const SECTION_ICONS: Record<number, React.ReactNode> = {
  1: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 8zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  ),
  2: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
    </svg>
  ),
  3: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0h.5a2.5 2.5 0 002.5-2.5V3.935M12 12a2 2 0 104 0 2 2 0 00-4 0z" />
    </svg>
  ),
  4: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  5: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
    </svg>
  ),
}

export default function ProgressBar({ currentStep, totalSteps, stepLabels = DEFAULT_LABELS }: ProgressBarProps) {
  const labels = stepLabels.slice(0, totalSteps)
  const percent = totalSteps > 0 ? Math.round((currentStep / totalSteps) * 100) : 0

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 w-64">
      {/* Progress block: Progress left, percentage + step right, bar below */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <span className="text-base font-semibold text-brand-dark">Progress</span>
          <div className="text-right">
            <div className="text-2xl font-bold text-brand-dark tabular-nums leading-tight">{percent}%</div>
            <div className="text-sm font-medium text-brand-dark/90 tabular-nums">Step {currentStep} of {totalSteps}</div>
          </div>
        </div>
        <div className="h-3 rounded-full bg-slate-200 overflow-hidden">
          <div
            className="h-full bg-brand-dark rounded-full transition-all duration-300 ease-out"
            style={{ width: `${percent}%` }}
            role="progressbar"
            aria-valuenow={percent}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`Form progress: ${percent}%`}
          />
        </div>
      </div>

      {/* Sections */}
      <div>
        <span className="text-sm font-semibold text-brand-dark uppercase tracking-wider">Sections</span>
        <nav className="mt-4 space-y-1" aria-label="Form sections">
          {Array.from({ length: totalSteps }, (_, i) => i + 1).map((step) => {
            const isActive = step === currentStep
            const isCompleted = step < currentStep
            const label = labels[step - 1] ?? `Step ${step}`
            const icon = SECTION_ICONS[step as keyof typeof SECTION_ICONS] ?? null
            return (
              <div
                key={step}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 transition-colors ${
                  isActive ? 'bg-brand-accent/15' : ''
                }`}
              >
                <span
                  className={`shrink-0 flex items-center justify-center w-8 h-8 rounded-full transition-colors ${
                    isActive
                      ? 'bg-brand-accent text-brand-dark'
                      : isCompleted
                      ? 'bg-slate-200 text-slate-600'
                      : 'text-slate-400'
                  }`}
                >
                  {isCompleted ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    icon
                  )}
                </span>
                <span
                  className={`text-sm font-medium ${
                    isActive ? 'text-brand-dark' : isCompleted ? 'text-slate-700' : 'text-slate-500'
                  }`}
                >
                  {label}
                </span>
              </div>
            )
          })}
        </nav>
      </div>
    </div>
  )
}
