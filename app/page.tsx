'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

const TAX_DEADLINE = new Date('2026-04-15T23:59:59')

function getTimeLeft() {
  const now = new Date()
  const diff = Math.max(0, TAX_DEADLINE.getTime() - now.getTime())
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
  const seconds = Math.floor((diff % (1000 * 60)) / 1000)
  return { days, hours, minutes, seconds }
}

function LogoIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M8 24 Q16 8 24 24" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" fill="none" />
      <path d="M8 20 Q16 12 24 20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none" opacity="0.8" />
      <path d="M8 16 Q16 16 24 16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" fill="none" opacity="0.6" />
    </svg>
  )
}

/** Single digit for flip countdown: flips when value changes */
function FlipDigit({ value, id }: { value: string; id: string }) {
  const [displayValue, setDisplayValue] = useState(value)
  const [isFlipping, setIsFlipping] = useState(false)

  useEffect(() => {
    if (value === displayValue) return
    setIsFlipping(true)
  }, [value, displayValue])

  const handleTransitionEnd = () => {
    if (isFlipping) {
      setDisplayValue(value)
      setIsFlipping(false)
    }
  }

  return (
    <div className="flip-card h-full w-full min-w-[2ch] overflow-hidden">
      <div
        className={`flip-card-inner h-full w-full ${isFlipping ? 'flip-card-flip' : ''}`}
        onTransitionEnd={handleTransitionEnd}
      >
        <div className="flip-card-face flip-card-front">
          <span className="relative z-10 text-2xl sm:text-3xl md:text-4xl font-bold text-slate-100 tabular-nums leading-none">
            {displayValue}
          </span>
          <span className="absolute left-0 right-0 top-1/2 h-px bg-slate-600/80 pointer-events-none" aria-hidden />
        </div>
        <div className="flip-card-face flip-card-back">
          <span className="relative z-10 text-2xl sm:text-3xl md:text-4xl font-bold text-slate-100 tabular-nums leading-none">{value}</span>
          <span className="absolute left-0 right-0 top-1/2 h-px bg-slate-600/80 pointer-events-none" aria-hidden />
        </div>
      </div>
    </div>
  )
}

/** State abbreviations (supported states) */
const COVER_STATES = ['IL', 'AK', 'TN', 'WY', 'FL', 'NH', 'SD', 'TX', 'WA', 'NV']

/** What we Cover: 3 cards for dark section (icon key, title, description) */
const WHAT_WE_COVER_CARDS: { title: string; description: string; icon: 'forms' | 'fica' | 'states' }[] = [
  {
    title: 'Forms & Schedules',
    description: 'We handle W-2, 1099-DIV, 1099-MISC, Form 8843, and all required schedules. Every form you need for your 1040-NR and state return, filled automatically.',
    icon: 'forms',
  },
  {
    title: 'Get Your FICA Taxes Back',
    description: 'F-1 students with less than 5 years in the U.S. are exempt from FICA taxes. If your employer withheld them by mistake, we file the special forms for erroneous FICA tax deductions—so you can get it all back, with our help.',
    icon: 'fica',
  },
  {
    title: 'State Filing Supported',
    description: `We support ${COVER_STATES.length} states including Illinois, Florida, Texas, and more—with additional states coming soon. State returns are prepared and filled using the same simple process.`,
    icon: 'states',
  },
]

const FAQ_ITEMS: { q: string; a: string }[] = [
  {
    q: 'Do I need to file taxes if I had no income?',
    a: "Yes! Form 8843 is required for ALL F-1 and J-1 students regardless of income. This form establishes your nonresident alien status and exempts you from certain days counting toward the Substantial Presence Test. We prepare Form 8843 for free - it's included automatically.",
  },
  {
    q: 'Can I use TurboTax instead?',
    a: "TurboTax isn't designed for nonresident aliens. F-1 students must file Form 1040-NR and Form 8843, which TurboTax doesn't support. Using the wrong form can cause IRS issues. We're built specifically for F-1/J-1 students.",
  },
  {
    q: 'How long does it take?',
    a: "Most students finish in about 15 minutes. You answer simple questions about your income and status; we generate and fill all the forms. You download, sign, and mail. No accounting degree required.",
  },
  {
    q: 'What states do you support?',
    a: "We support state filing for 12 states: Illinois, New York, California, Alaska, Tennessee, Wyoming, Florida, New Hampshire, South Dakota, Texas, Washington, and Nevada. More states are coming soon.",
  },
  {
    q: 'When is the deadline to file?',
    a: "The federal deadline is typically April 15. If you need more time, you can file for an extension. We'll guide you through the dates that apply to your situation.",
  },
  {
    q: 'What if I had a scholarship or fellowship?',
    a: "Scholarships and fellowships can be taxable depending on use. We ask about your funding and handle the correct reporting on the right forms so you stay compliant.",
  },
]

/** Step content for How it works scroll section */
const HOW_STEPS = [
  { badge: '~5 min', title: 'Answer Simple Questions', body: 'No tax jargon. We ask things like "Did you work on campus?" not "Enter your FICA-exempt wages from box 14." Just answer honestly — we handle the complexity.' },
  { badge: 'Automated', title: 'We Generate Your Forms', body: '1040-NR, Form 8843, state forms — all auto-filled with 100% accuracy. We determine which forms you need and fill them out. You don\'t touch a single form field.' },
  { badge: 'Easy', title: 'Download, Sign, Mail', body: 'Print-ready PDFs with exact mailing addresses. We even tell you which envelope to use. Sign, stamp, mail — done. Your tax filing is complete.' },
]

function progressToPhase(p: number): number {
  if (p < 0.15) return 0
  if (p < 0.35) return 1
  if (p < 0.55) return 2
  if (p < 0.72) return 3
  if (p < 0.85) return 4
  return 5
}

function progressToStepIndex(p: number): number {
  if (p < 0.28) return 0
  if (p < 0.56) return 1
  if (p < 0.85) return 2
  return 3
}

/** Mockup screen + form/list/print/sign/mail animation driven by scroll */
function HowItWorksMockup({ progress }: { progress: number }) {
  const phase = progressToPhase(progress)
  const fillProgress = progress < 0.35 ? Math.max(0, (progress - 0.15) / 0.2) : 1

  return (
    <div className="relative rounded-xl border-2 border-slate-600 bg-slate-800 overflow-hidden shadow-2xl">
      {/* Browser-style top bar (dots only) */}
      <div className="flex items-center gap-2 px-3 py-2 bg-slate-700/80 border-b border-slate-600">
        <span className="w-2.5 h-2.5 rounded-full bg-[#ff5f57]" />
        <span className="w-2.5 h-2.5 rounded-full bg-[#febc2e]" />
        <span className="w-2.5 h-2.5 rounded-full bg-[#28c840]" />
      </div>

      <div className="aspect-[4/3] min-h-[240px] flex flex-col bg-slate-900/50">
        {/* URL bar inside the screen, padded from edges */}
        <div className="mx-3 mt-2 mb-1 shrink-0">
          <div className="flex items-center gap-1.5 px-3 py-2 w-full rounded-md bg-slate-800/90 border border-slate-600 text-slate-400 text-xs font-mono">
            <span className="text-slate-500 shrink-0 flex items-center" aria-hidden>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
            </span>
            <span className="truncate">f1taxmate.com/file</span>
          </div>
        </div>
        <div className="flex-1 min-h-0 relative">
        {/* Phase 0–1: Form (blank then filling) */}
        {(phase === 0 || phase === 1) && (
          <div className="absolute inset-0 p-4 flex flex-col gap-3">
            <div className="text-slate-400 text-xs font-medium uppercase tracking-wider">Tax info</div>
            <div className="space-y-2">
              <div className="h-8 rounded bg-slate-700/80 flex items-center px-2">
                <span className={fillProgress > 0 ? 'text-slate-200' : 'text-slate-500'}>
                  {fillProgress > 0 ? 'Jane Doe' : 'Full name'}
                </span>
              </div>
              <div className="h-8 rounded bg-slate-700/80 flex items-center px-2">
                <span className={fillProgress > 0.33 ? 'text-slate-200' : 'text-slate-500'}>
                  {fillProgress > 0.33 ? '1995-03-15' : 'Date of birth'}
                </span>
              </div>
              <div className="h-8 rounded bg-slate-700/80 flex items-center px-2">
                <span className={fillProgress > 0.66 ? 'text-slate-200' : 'text-slate-500'}>
                  {fillProgress > 0.66 ? '123-45-6789' : 'SSN'}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Phase 2: Forms list */}
        {phase === 2 && (
          <div className="absolute inset-0 p-4 flex flex-col gap-2">
            <div className="text-slate-400 text-xs font-medium uppercase tracking-wider">Your forms</div>
            <div className="flex-1 rounded bg-slate-700/60 p-2 space-y-1.5">
              {['1040-NR', 'Form 8843', 'IL-1040'].map((name, i) => (
                <div key={name} className="flex items-center gap-2 py-1.5 px-2 rounded bg-slate-700/80">
                  <svg className="w-4 h-4 text-brand-accent shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                  <span className="text-slate-200 text-sm">{name}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Phase 3: Printing – papers coming out of screen */}
        {phase === 3 && (
          <div className="absolute inset-0 flex items-end justify-center pb-4">
            <div className="relative w-3/4 flex flex-col items-center">
              <div className="flex flex-col items-center gap-1">
                <div className="w-20 h-24 rounded border-2 border-slate-600 bg-slate-700 shadow-lg -rotate-6" />
                <div className="w-20 h-24 rounded border-2 border-slate-600 bg-slate-700 shadow-lg rotate-3" />
                <div className="w-20 h-24 rounded border-2 border-slate-600 bg-slate-700 shadow-lg" />
              </div>
              <div className="text-center text-slate-400 text-xs mt-2">Printing...</div>
            </div>
          </div>
        )}

        {/* Phase 4: Signing */}
        {phase === 4 && (
          <div className="absolute inset-0 flex items-center justify-center p-4">
            <div className="relative">
              <div className="w-24 h-32 rounded border-2 border-slate-600 bg-slate-700 shadow-lg" />
              <div className="absolute -right-2 top-1/2 -translate-y-1/2 text-slate-400">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
              </div>
              <div className="text-center text-slate-400 text-xs mt-2">Sign here</div>
            </div>
          </div>
        )}

        {/* Phase 5: Mailing */}
        {phase === 5 && (
          <div className="absolute inset-0 flex items-center justify-center p-4">
            <div className="relative">
              <div className="w-28 h-20 rounded border-2 border-slate-600 bg-slate-700 flex items-center justify-center">
                <span className="text-slate-500 text-xs">Envelope</span>
              </div>
              <div className="absolute -top-2 -right-2 w-16 h-20 rounded border border-slate-600 bg-slate-700/80 -rotate-12" />
              <div className="text-center text-slate-400 text-xs mt-2">Mail it — done</div>
            </div>
          </div>
        )}
        </div>
      </div>
    </div>
  )
}

/** Step text that switches with scroll progress */
function HowItWorksStepContent({ progress, steps }: { progress: number; steps: typeof HOW_STEPS }) {
  const stepIndex = progressToStepIndex(progress)
  const showDone = stepIndex >= 3

  return (
    <div className="relative min-h-[200px]">
      {!showDone && steps.map((step, i) => (
        <div
          key={i}
          className={`transition-opacity duration-300 ${stepIndex === i ? 'opacity-100' : 'opacity-0 absolute inset-0 pointer-events-none'}`}
        >
          <div className="flex gap-4">
            <div className="shrink-0 w-8 h-8 rounded-full bg-brand-accent text-slate-900 flex items-center justify-center text-sm font-bold">
              {i + 1}
            </div>
            <div className="rounded-xl border border-slate-700 bg-slate-800/80 p-5">
              <span className="px-2 py-0.5 rounded bg-brand-accent/20 text-brand-accent text-xs font-medium">
                {step.badge}
              </span>
              <h3 className="text-base font-bold text-white mt-3 mb-1.5">{step.title}</h3>
              <p className="text-slate-400 text-sm leading-relaxed">{step.body}</p>
            </div>
          </div>
        </div>
      ))}
      {showDone && (
        <div className="flex items-center justify-center gap-2 px-5 py-4 rounded-full bg-brand-accent/20 text-brand-accent text-sm font-medium border border-brand-accent/30 inline-flex">
          <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
          That&apos;s it. Really. Your taxes are done.
        </div>
      )}
    </div>
  )
}

const INITIAL_TIME = { days: 0, hours: 0, minutes: 0, seconds: 0 }

export default function Home() {
  const [faqOpen, setFaqOpen] = useState<number | null>(0)
  const [faqShowMore, setFaqShowMore] = useState(false)
  const [countdownMounted, setCountdownMounted] = useState(false)
  const [timeLeft, setTimeLeft] = useState(INITIAL_TIME)
  const [howScrollProgress, setHowScrollProgress] = useState(0)
  const visibleFaqs = faqShowMore ? FAQ_ITEMS : FAQ_ITEMS.slice(0, 5)

  useEffect(() => {
    setCountdownMounted(true)
    setTimeLeft(getTimeLeft())
    const t = setInterval(() => setTimeLeft(getTimeLeft()), 1000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    const section = document.getElementById('how-it-works')
    if (!section) return
    const onScroll = () => {
      const rect = section.getBoundingClientRect()
      const vh = window.innerHeight
      const total = section.getBoundingClientRect().height - vh
      if (total <= 0) {
        setHowScrollProgress(1)
        return
      }
      const scrolled = -rect.top
      const progress = Math.max(0, Math.min(1, scrolled / total))
      setHowScrollProgress(progress)
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <div className="min-h-screen bg-slate-50/80 text-slate-900 antialiased">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-white/5 bg-brand-dark/95 backdrop-blur-md text-white">
        <div className="max-w-6xl mx-auto px-6 py-3.5 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <LogoIcon className="w-8 h-8 text-brand-accent" />
            <span className="text-lg font-bold text-white tracking-tight">F1Taxmate</span>
          </Link>
          <nav className="hidden md:flex items-center gap-7 text-white/80 text-[13px] font-medium tracking-wide">
            <Link href="#how-it-works" className="hover:text-brand-accent transition-colors">How It Works</Link>
            <Link href="#pricing" className="hover:text-brand-accent transition-colors">Pricing</Link>
            <Link href="#faq" className="hover:text-brand-accent transition-colors">FAQ</Link>
          </nav>
          <div className="flex items-center gap-5">
            
            <Link
              href="/disclaimer"
              className="inline-flex items-center gap-2 bg-brand-accent text-brand-dark px-4 py-2 rounded-full text-sm font-semibold hover:bg-sky-300 transition-colors"
            >
              Start Filing
              <span aria-hidden>→</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Top section: full-screen hero */}
      <section className="relative min-h-screen w-full overflow-hidden bg-gradient-to-b from-white to-slate-50/50 flex flex-col justify-center">
        <div
          className="absolute inset-0 opacity-[0.5]"
          style={{
            backgroundImage: `radial-gradient(circle at 50% 0%, rgba(56,189,248,0.08) 0%, transparent 50%)`,
          }}
        />

        <div className="relative w-full max-w-5xl mx-auto px-6 py-16 sm:px-8">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/80 backdrop-blur-sm px-4 py-2 text-slate-600 text-xs font-medium tracking-wide mb-10 shadow-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-brand-accent" />
            Tax software built exclusively for F-1 students
          </div>

          {/* Hero */}
          <div className="mb-16">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-slate-900 tracking-tight max-w-2xl leading-[1.1]">
              File Your Taxes{' '}
              <span className="relative inline-block text-brand-dark">
                for as low as $4.99
                <span className="absolute bottom-0.5 left-0 right-0 h-1 bg-brand-accent/40 rounded-full" />
              </span>
            </h1>
            <p className="mt-5 inline-flex flex-wrap items-center gap-x-1.5 gap-y-1 text-sm text-slate-500 max-w-xl">
              <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1.5 text-slate-600">
                <svg className="w-4 h-4 text-slate-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                <span>No login · No data leaves your device · 100% local processing</span>
              </span>
            </p>
            <div className="mt-7 block w-full">
              <Link
                href="/disclaimer"
                className="inline-flex items-center gap-2 bg-brand-dark text-white px-6 py-3 rounded-full text-sm font-semibold hover:bg-brand-darker transition-all shadow-md hover:shadow-lg"
              >
                Continue Filing
                <span aria-hidden>→</span>
              </Link>
            </div>
          </div>

          {/* Trust bar */}
          <div className="flex flex-wrap justify-center gap-x-10 gap-y-3 pt-14 text-slate-500 text-xs font-medium">
            <span className="inline-flex items-center gap-2">
              <span className="w-4 h-4 rounded-full bg-emerald-500/20 flex items-center justify-center">
                <svg className="w-2.5 h-2.5 text-emerald-600" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
              </span>
              Trusted by 100+ universities
            </span>
            <span className="inline-flex items-center gap-2">
              <span className="w-4 h-4 rounded-full bg-sky-500/20 flex items-center justify-center">
                <svg className="w-2.5 h-2.5 text-sky-600" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
              </span>
              Easily use Credit card / Debit card 
            </span>
            <span className="inline-flex items-center gap-2">
              <span className="w-4 h-4 rounded-full bg-sky-500/20 flex items-center justify-center">
                <svg className="w-2.5 h-2.5 text-sky-600" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
              </span>
              100% IRS compliant
            </span>
          </div>
        </div>
      </section>

      {/* Comparison section */}
      <section id="pricing" className="relative bg-slate-900 text-white py-20 px-6">
        <div className="absolute inset-0 bg-[linear-gradient(180deg, rgba(56,189,248,0.03)_0%, transparent_50%)] pointer-events-none" />
        <div className="relative max-w-6xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold text-center mb-2 tracking-tight">
            The Tax Prep Industry Has Been{' '}
            <span className="text-brand-accent">Overcharging You</span>
          </h2>
          <p className="text-slate-400 text-center text-sm max-w-xl mx-auto mb-14">
            Here&apos;s what other services charge international students for the exact same forms.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {/* SPRINTAX */}
            <div className="flex flex-col min-h-[340px] bg-slate-800/80 rounded-2xl p-6 backdrop-blur-sm border border-slate-700/50">
              <p className="text-slate-300 text-xs font-semibold uppercase tracking-widest mb-5">Sprintax</p>
              <div className="mb-5 pb-4 border-b border-slate-600/50">
                <p className="text-2xl font-bold">
                  <span className="line-through text-red-400/90">$104.95</span>
                </p>
                <p className="text-slate-500 text-xs mt-0.5">Federal Filing</p>
              </div>
              <div className="mb-5 px-3 py-2 rounded-lg bg-slate-700/50 text-slate-400 text-xs font-medium">
                2+ hours to complete
              </div>
              <ul className="flex-1 space-y-2 text-xs text-slate-400">
                <li className="flex items-center gap-2">
                  <span className="text-red-400 shrink-0" aria-hidden>✕</span>
                  Confusing interface
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-red-400 shrink-0" aria-hidden>✕</span>
                  Overpriced for basics
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-red-400 shrink-0" aria-hidden>✕</span>
                  Hidden fees add up
                </li>
              </ul>
            </div>

            {/* GLACIER TAX */}
            <div className="flex flex-col min-h-[340px] bg-slate-800/80 rounded-2xl p-6 backdrop-blur-sm border border-slate-700/50">
              <p className="text-slate-300 text-xs font-semibold uppercase tracking-widest mb-5">Glacier Tax</p>
              <div className="mb-5 pb-4 border-b border-slate-600/50">
                <p className="text-2xl font-bold">
                  <span className="line-through text-red-400/90">$49+</span>
                </p>
                <p className="text-slate-500 text-xs mt-0.5">Federal Filing</p>
              </div>
              <div className="mb-5 px-3 py-2 rounded-lg bg-slate-700/50 text-slate-400 text-xs font-medium">
                1+ hour to complete
              </div>
              <ul className="flex-1 space-y-2 text-xs text-slate-400">
                <li className="flex items-center gap-2">
                  <span className="text-red-400 shrink-0" aria-hidden>✕</span>
                  Outdated UI
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-red-400 shrink-0" aria-hidden>✕</span>
                  No state filing support
                </li>
              </ul>
            </div>

            {/* TURBOTAX */}
            <div className="flex flex-col min-h-[340px] bg-slate-800/80 rounded-2xl p-6 backdrop-blur-sm border border-slate-700/50 relative">
              <span className="absolute top-4 right-4 px-2 py-0.5 rounded bg-red-500/90 text-white text-[10px] font-bold uppercase tracking-wider">
                Can&apos;t use
              </span>
              <p className="text-slate-300 text-xs font-semibold uppercase tracking-widest mb-5">TurboTax</p>
              <div className="mb-5 pb-4 border-b border-slate-600/50">
                <p className="text-2xl font-bold">
                  <span className="line-through text-red-400/90">$208+</span>
                </p>
                <p className="text-slate-500 text-xs mt-0.5">Federal Filing</p>
              </div>
              <div className="mb-5 px-3 py-2 rounded-lg bg-slate-700/50 text-slate-400 text-xs font-medium">
                N/A doesn&apos;t work
              </div>
              <ul className="flex-1 space-y-2 text-xs text-slate-400">
                <li className="flex items-center gap-2">
                  <span className="text-red-400 shrink-0" aria-hidden>✕</span>
                  Can&apos;t file 1040-NR
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-red-400 shrink-0" aria-hidden>✕</span>
                  Wrong form for F-1s
                </li>
              </ul>
            </div>

            {/* F1Taxmate - Best Value */}
            <div className="flex flex-col min-h-[340px] bg-white rounded-2xl p-6 border border-slate-200 shadow-lg relative text-slate-900">
              <span className="absolute -top-px left-6 px-2.5 py-1 rounded-b-md bg-brand-accent text-slate-900 text-[10px] font-bold uppercase tracking-wider">
                Best value
              </span>
              <p className="text-slate-800 text-xs font-semibold uppercase tracking-widest mb-5 mt-1">F1Taxmate</p>
              <div className="mb-5 pb-4 border-b border-slate-200">
                <p className="text-2xl font-bold text-slate-900">$9.99</p>
                <p className="text-slate-500 text-xs mt-0.5">Federal Filing</p>
              </div>
              <div className="mb-5 px-3 py-2 rounded-lg bg-sky-50 text-brand-dark text-xs font-medium">
                15 min average
              </div>
              <ul className="flex-1 space-y-2 text-xs text-slate-600">
                <li className="flex items-center gap-2">
                  <span className="text-emerald-500 shrink-0" aria-hidden>✓</span>
                  Same IRS forms
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-emerald-500 shrink-0" aria-hidden>✓</span>
                  15 min average
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-emerald-500 shrink-0" aria-hidden>✓</span>
                  Supports 11 states
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-emerald-500 shrink-0" aria-hidden>✓</span>
                  Just $30 for state filing
                </li>
              </ul>
              <Link
                href="/filing"
                className="mt-5 block w-full py-3 px-4 rounded-full bg-slate-900 text-white text-center text-sm font-semibold hover:bg-slate-800 transition-colors"
              >
                Start Free →
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* What we Cover - light section, 3 cards */}
      <section id="what-we-cover" className="relative py-24 px-6 bg-slate-50 text-slate-900">
        <div className="relative max-w-6xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight mb-16 max-w-2xl">
            What we Cover
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            {WHAT_WE_COVER_CARDS.map((card, i) => (
              <div key={i} className="flex flex-col">
                <div className="w-11 h-11 rounded-xl bg-brand-accent/15 flex items-center justify-center text-brand-dark shrink-0 mb-5">
                  {card.icon === 'forms' && (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                  {card.icon === 'fica' && (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  )}
                  {card.icon === 'states' && (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" />
                    </svg>
                  )}
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-3">{card.title}</h3>
                <p className="text-slate-600 text-sm leading-relaxed">{card.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works - scroll-driven animation */}
      <section id="how-it-works" className="relative bg-slate-900 text-white" style={{ minHeight: '400vh' }}>
        <div className="sticky top-0 min-h-screen flex flex-col justify-center py-16 px-4 sm:px-6">
          <p className="text-brand-accent text-xs font-semibold uppercase tracking-[0.2em] text-center mb-2">
            How it works
          </p>
          <h2 className="text-2xl sm:text-3xl font-bold text-center text-white mb-3 tracking-tight">
            15 Minutes. That&apos;s It.
          </h2>
          <p className="text-slate-400 text-center text-sm max-w-lg mx-auto mb-10">
            Our guided process makes tax filing simple. No accounting degree required. No 3-hour marathons like other services.
          </p>

          <div className="max-w-5xl mx-auto w-full flex flex-col lg:flex-row items-center gap-10 lg:gap-14">
            {/* Mockup: stays in place, content changes by scroll phase */}
            <div className="w-full max-w-sm shrink-0">
              <HowItWorksMockup progress={howScrollProgress} />
            </div>

            {/* Step text: changes with scroll */}
            <div className="flex-1 min-w-0 max-w-xl">
              <HowItWorksStepContent progress={howScrollProgress} steps={HOW_STEPS} />
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="relative py-20 px-6 bg-white">
        <div className="relative max-w-6xl mx-auto flex flex-col lg:flex-row gap-14 lg:gap-20">
          <div className="lg:max-w-[280px]">
            <h2 className="text-4xl sm:text-5xl font-bold text-slate-900 mb-3 tracking-tight">FAQ</h2>
            <p className="text-slate-700 text-lg mb-1">
              We&apos;ve got <span className="text-brand-accent font-semibold">answers.</span>
            </p>
            <p className="text-slate-500 text-sm mb-6">
              Everything you need to know about filing taxes as an F-1 student.
            </p>
            <p className="flex items-center gap-2 text-slate-500 text-sm">
              <span className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                <svg className="w-4 h-4 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.864 9.864 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </span>
              Still have questions?
            </p>
          </div>
          <div className="flex-1 space-y-1">
            {visibleFaqs.map((item, i) => {
              const isOpen = faqOpen === i
              return (
                <div key={i} className="border-b border-slate-200 last:border-0">
                  <button
                    type="button"
                    onClick={() => setFaqOpen(isOpen ? null : i)}
                    className="w-full flex items-center justify-between gap-4 py-4 text-left font-medium text-slate-900 hover:text-slate-700 transition-colors"
                    aria-expanded={isOpen}
                  >
                    <span className="text-sm">{item.q}</span>
                    <span className="shrink-0 text-slate-400" aria-hidden>
                      <svg className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </span>
                  </button>
                  {isOpen && (
                    <div className="pb-4">
                      <p className="text-slate-500 text-sm leading-relaxed pr-8">{item.a}</p>
                    </div>
                  )}
                </div>
              )
            })}
            {!faqShowMore && FAQ_ITEMS.length > 5 && (
              <button
                type="button"
                onClick={() => setFaqShowMore(true)}
                className="flex items-center gap-2 text-brand-accent text-sm font-medium hover:underline pt-2"
              >
                Show more
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            )}
          </div>
        </div>
      </section>

      {/* CTA: flip countdown + Get Started */}
      <section className="relative bg-slate-900 text-white py-24 px-6">
        <div className="absolute inset-0 bg-[linear-gradient(160deg, rgba(56,189,248,0.06)_0%, transparent_60%)] pointer-events-none" />
        <div className="relative max-w-4xl mx-auto text-center">
          {/* Tax deadline on top */}
          <div className="flex items-center justify-center gap-2 text-slate-400 text-sm font-medium mb-10">
            <svg className="w-5 h-5 text-brand-accent shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            Tax Deadline: April 15, 2026
          </div>

          {/* Flip countdown: 2 digits per unit, each digit flips. Use placeholder until mounted to avoid hydration mismatch. */}
          <div className="flex flex-wrap items-end justify-center gap-2 sm:gap-4 mb-14">
            {[
              { digits: countdownMounted ? String(timeLeft.days).padStart(2, '0') : '00', label: 'Days' },
              { digits: countdownMounted ? String(timeLeft.hours).padStart(2, '0') : '00', label: 'Hours' },
              { digits: countdownMounted ? String(timeLeft.minutes).padStart(2, '0') : '00', label: 'Minutes' },
              { digits: countdownMounted ? String(timeLeft.seconds).padStart(2, '0') : '00', label: 'Seconds' },
            ].map((unit, i) => (
              <div key={unit.label} className="flex items-center gap-1 sm:gap-2">
                <div className="flex flex-col items-center">
                  <div className="flex rounded-lg bg-slate-800 border border-slate-700 overflow-hidden h-24 sm:h-28 md:h-32">
                    <div className="relative flex items-center justify-center px-2 sm:px-3 min-w-[2.5ch] h-full">
                      <FlipDigit id={`${unit.label}-0`} value={unit.digits[0]} />
                    </div>
                    <div className="relative flex items-center justify-center px-2 sm:px-3 min-w-[2.5ch] h-full border-l border-slate-700">
                      <FlipDigit id={`${unit.label}-1`} value={unit.digits[1]} />
                    </div>
                  </div>
                  <span className="mt-2 text-slate-500 text-xs font-medium uppercase tracking-wider">
                    {unit.label}
                  </span>
                </div>
                {i < 3 && (
                  <div className="flex flex-col gap-1 -mb-12 sm:-mb-14">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-500" aria-hidden />
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-500" aria-hidden />
                  </div>
                )}
              </div>
            ))}
          </div>

          <Link
            href="/filing"
            className="inline-flex items-center gap-2 px-8 py-4 rounded-full bg-brand-accent text-slate-900 text-base font-semibold hover:bg-sky-300 transition-colors"
          >
            Get Started
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </Link>
        </div>
      </section>
    </div>
  )
}
