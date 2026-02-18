'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { useRouter } from 'next/navigation'
import ProgressBar from '@/components/ProgressBar'
import Step1PersonalInfo from '@/components/forms/Step1PersonalInfo'
import Step2UniversityInfo from '@/components/forms/Step2UniversityInfo'
import Step3ResidencyInfo from '@/components/forms/Step3ResidencyInfo'
import Step4IncomeInfo from '@/components/forms/Step4IncomeInfo'
import { FormData } from '@/types/form'

function formatPhone(phone: string) {
  const d = phone.replace(/\D/g, '')
  if (d.length === 10) return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`
  return phone
}

function formatAddress(addr: { address?: string; addressLine2?: string; city?: string; state?: string; zipCode?: string } | undefined) {
  if (!addr) return ''
  const line1 = [addr.address, addr.addressLine2].filter(Boolean).join(', ')
  const line2 = [addr.city, addr.state, addr.zipCode].filter(Boolean).join(', ')
  return [line1, line2].filter(Boolean).join(' — ')
}

function formatCurrency(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n)
}

function formatReviewDate(dateStr: string) {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return dateStr
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

const CARD_ICONS = {
  person: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 8zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  ),
  document: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  ),
  location: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
  academic: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
    </svg>
  ),
  calendar: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  ),
  currency: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
}

function ReviewCard({
  title,
  icon,
  onEdit,
  rows,
}: {
  title: string
  icon: keyof typeof CARD_ICONS
  onEdit: () => void
  rows: { label: string; value: string }[]
}) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-2 text-brand-dark font-semibold">
          <span className="text-brand-dark">{CARD_ICONS[icon]}</span>
          <span>{title}</span>
        </div>
        <button
          type="button"
          onClick={onEdit}
          className="p-1.5 rounded-lg text-brand-dark hover:bg-slate-100 transition-colors"
          aria-label={`Edit ${title}`}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
          </svg>
        </button>
      </div>
      <div className="px-5 py-4 space-y-3">
        {rows.map(({ label, value }, idx) => (
          <div key={`${label}-${idx}`} className="flex justify-between items-baseline gap-4">
            <span className="text-brand-dark text-sm font-medium shrink-0">{label}</span>
            <span className="text-brand-dark text-sm text-right font-medium min-w-0 break-words max-w-[60%]">{value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function FormPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [currentStep, setCurrentStep] = useState(1)
  const [formData, setFormData] = useState<Partial<FormData>>({})

  const totalSteps = 5

  // When opening the form: if returning from success (review=1), restore from sessionStorage.
  // Otherwise start with a clean slate — clear any previous form/tax data so the form is empty.
  useEffect(() => {
    const isReviewReturn = searchParams.get('review') === '1'
    if (isReviewReturn) {
      try {
        const stored = sessionStorage.getItem('formData')
        if (!stored) return
        const parsed = JSON.parse(stored) as Partial<FormData>
        setFormData(parsed)
        setCurrentStep(5)
      } catch {
        // If anything goes wrong, keep the default blank form
      }
    } else {
      sessionStorage.removeItem('formData')
      sessionStorage.removeItem('taxResult')
      setFormData({})
      setCurrentStep(1)
    }
  }, [searchParams])

  const updateFormData = (step: number, data: any) => {
    setFormData((prev) => ({
      ...prev,
      [getStepKey(step)]: data,
    }))
  }

  const getStepKey = (step: number): string => {
    const keys = ['personalInfo', 'universityInfo', 'residencyInfo', 'incomeInfo']
    return keys[step - 1] || ''
  }

  const handleNext = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1)
    } else {
      // Validate that financial information is provided
      if (!formData.incomeInfo || !formData.incomeInfo.hadUSIncome) {
        // If no US income, still allow to proceed (for Form 8843)
        // Store form data in sessionStorage to pass to success page
        sessionStorage.setItem('formData', JSON.stringify(formData))
        router.push('/success')
        return
      }

      // Check if at least one W2 form exists with wages
      const hasW2Income = formData.incomeInfo.w2Forms?.some(
        (w2) => w2 && (w2.wages || 0) > 0
      )
      const has1099Income =
        formData.incomeInfo.form1099INT?.some(
          (form) => form && (form.interestIncome || 0) > 0
        ) ||
        formData.incomeInfo.form1099MISC?.some(
          (form) => form && (form.otherIncome || 0) > 0
        )

      if (!hasW2Income && !has1099Income) {
        alert(
          'Please provide at least one W-2 form or 1099 form with income information to calculate taxes.'
        )
        return
      }

      // Store form data in sessionStorage to pass to success page
      sessionStorage.setItem('formData', JSON.stringify(formData))
      router.push('/success')
    }
  }

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    } else {
      router.push('/disclaimer')
    }
  }

  return (
    <div className="min-h-screen bg-cream py-4 sm:py-8 px-3 sm:px-4">
      <div className="max-w-5xl mx-auto flex flex-col md:flex-row gap-6 md:gap-8">
        {/* On mobile: form first (order-1), then progress below. On md+: sidebar left. */}
        <main className="order-1 md:order-2 flex-1 min-w-0 w-full">
        <div className="form-theme-light bg-white rounded-xl border border-slate-200 shadow-lg p-4 sm:p-6 md:p-8">
          {currentStep === 1 && (
            <Step1PersonalInfo
              data={formData.personalInfo}
              onUpdate={(data) => updateFormData(1, data)}
              onNext={handleNext}
              onPrevious={handlePrevious}
            />
          )}
          {currentStep === 2 && (
            <Step2UniversityInfo
              data={formData.universityInfo}
              onUpdate={(data) => updateFormData(2, data)}
              onNext={handleNext}
              onPrevious={handlePrevious}
            />
          )}
          {currentStep === 3 && (
            <Step3ResidencyInfo
              data={formData.residencyInfo}
              onUpdate={(data) => updateFormData(3, data)}
              onNext={handleNext}
              onPrevious={handlePrevious}
            />
          )}
          {currentStep === 4 && (
            <Step4IncomeInfo
              data={formData.incomeInfo}
              onUpdate={(data) => updateFormData(4, data)}
              onNext={handleNext}
              onPrevious={handlePrevious}
            />
          )}
          {currentStep === 5 && (
            <div>
              <h1 className="text-3xl font-bold text-slate-900 mb-2">
                Review Your Information
              </h1>
              <p className="text-slate-600 mb-8">
                Please review your information below. Use Edit to change any section.
              </p>

              <div className="space-y-6">
                {/* Your Info */}
                <ReviewCard
                  title="Your Info"
                  icon="person"
                  onEdit={() => setCurrentStep(1)}
                  rows={[
                    { label: 'Name', value: [formData.personalInfo?.firstName, formData.personalInfo?.lastName].filter(Boolean).join(' ') || '—' },
                    { label: 'Date of Birth', value: formData.personalInfo?.dateOfBirth || '—' },
                    { label: 'Email', value: formData.personalInfo?.email || '—' },
                    { label: 'Phone', value: formData.personalInfo?.phone ? formatPhone(formData.personalInfo.phone) : '—' },
                  ]}
                />

                {/* Immigration */}
                <ReviewCard
                  title="Immigration"
                  icon="document"
                  onEdit={() => setCurrentStep(1)}
                  rows={[
                    { label: 'Passport', value: formData.personalInfo?.passportNumber || '—' },
                    { label: 'Visa Type', value: formData.personalInfo?.visaType || '—' },
                    { label: 'Status', value: formData.personalInfo?.occupationType ?? '—' },
                  ]}
                />

                {/* US Address */}
                {formData.personalInfo?.usAddress && (
                  <ReviewCard
                    title="US Address"
                    icon="location"
                    onEdit={() => setCurrentStep(1)}
                    rows={[
                      { label: 'Address', value: [formData.personalInfo!.usAddress.address, formData.personalInfo!.usAddress.addressLine2].filter(Boolean).join(', ') || '—' },
                      { label: 'City, State, ZIP', value: [formData.personalInfo!.usAddress.city, formData.personalInfo!.usAddress.state, formData.personalInfo!.usAddress.zipCode].filter(Boolean).join(', ') || '—' },
                    ]}
                  />
                )}

                {/* Foreign address (home address) */}
                {formData.personalInfo?.foreignAddress && (
                  <ReviewCard
                    title="Foreign address"
                    icon="location"
                    onEdit={() => setCurrentStep(1)}
                    rows={[
                      { label: 'Address', value: [formData.personalInfo!.foreignAddress.addressLine1, formData.personalInfo!.foreignAddress.addressLine2].filter(Boolean).join(', ') || '—' },
                      { label: 'City, State, Postal code', value: [formData.personalInfo!.foreignAddress.city, formData.personalInfo!.foreignAddress.stateProvince, formData.personalInfo!.foreignAddress.postalCode].filter(Boolean).join(', ') || '—' },
                      { label: 'Country', value: formData.personalInfo!.foreignAddress.country || '—' },
                    ]}
                  />
                )}

                {/* University */}
                {formData.universityInfo && (
                  <ReviewCard
                    title="University"
                    icon="academic"
                    onEdit={() => setCurrentStep(2)}
                    rows={[
                      { label: 'School', value: formData.universityInfo.universityName || '—' },
                      { label: 'Address', value: formatAddress(formData.universityInfo.universityAddress) || '—' },
                      { label: 'ISS Advisor', value: formData.universityInfo.issAdvisorName || '—' },
                    ]}
                  />
                )}

                {/* Residency - readable dates and visit ranges */}
                <ReviewCard
                  title="Residency"
                  icon="calendar"
                  onEdit={() => setCurrentStep(3)}
                  rows={[
                    { label: 'First US Visit', value: formatReviewDate(formData.residencyInfo?.dateOfFirstVisit ?? '') },
                    { label: 'Filed US taxes before?', value: formData.residencyInfo?.hasFiledTaxReturnBefore === true ? 'Yes' : formData.residencyInfo?.hasFiledTaxReturnBefore === false ? 'No' : '—' },
                    ...(formData.residencyInfo?.hasFiledTaxReturnBefore
                      ? [
                          { label: 'Year Filed', value: formData.residencyInfo?.yearFiled ?? '—' },
                          { label: 'Form Used', value: formData.residencyInfo?.formUsed ?? '1040-NR' },
                        ]
                      : []),
                    ...(formData.residencyInfo?.visits?.length
                      ? formData.residencyInfo.visits.map((visit, i) => {
                          const entry = formatReviewDate(visit.entryDate)
                          const exit = visit.exitDate ? formatReviewDate(visit.exitDate) : 'Present'
                          return {
                            label: `Visit ${i + 1} (${visit.visaType || '—'})`,
                            value: `${entry} → ${exit}`,
                          }
                        })
                      : []),
                  ]}
                />

                {/* Income - W-2s in inner shadow cards */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-brand-dark font-semibold">
                      <span className="text-brand-dark">{CARD_ICONS.currency}</span>
                      <span>Income</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setCurrentStep(4)}
                      className="p-1.5 rounded-lg text-brand-dark hover:bg-slate-100 transition-colors"
                      aria-label="Edit Income"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                    </button>
                  </div>
                  <div className="px-5 py-4 space-y-4">
                    <div className="flex justify-between items-baseline gap-4">
                      <span className="text-brand-dark text-sm font-medium shrink-0">Had US Income</span>
                      <span className="text-brand-dark text-sm text-right font-medium min-w-0 break-words max-w-[60%]">
                        {formData.incomeInfo?.hadUSIncome === true ? 'Yes' : formData.incomeInfo?.hadUSIncome === false ? 'No' : '—'}
                      </span>
                    </div>
                    {formData.incomeInfo?.ssn && (
                      <div className="flex justify-between items-baseline gap-4">
                        <span className="text-brand-dark text-sm font-medium shrink-0">SSN</span>
                        <span className="text-brand-dark text-sm text-right font-medium min-w-0 break-words max-w-[60%]">
                          {formData.incomeInfo.ssn}
                        </span>
                      </div>
                    )}
                    {formData.incomeInfo?.hadUSIncome && formData.incomeInfo?.w2Forms?.length
                      ? formData.incomeInfo.w2Forms.map((w2, i) => (
                          <div
                            key={i}
                            className="bg-white rounded-lg shadow-md overflow-hidden"
                          >
                            <div className="px-4 py-2 border-b border-slate-100">
                              <span className="text-brand-dark text-sm font-semibold">W-2 #{i + 1}</span>
                            </div>
                            <div className="p-4 space-y-2">
                            <div className="flex justify-between items-baseline gap-4">
                              <span className="text-brand-dark text-sm font-medium shrink-0">Wages</span>
                              <span className="text-brand-dark text-sm text-right font-medium">{formatCurrency(w2.wages)}</span>
                            </div>
                            <div className="flex justify-between items-baseline gap-4">
                              <span className="text-brand-dark text-sm font-medium shrink-0">Federal withheld</span>
                              <span className="text-brand-dark text-sm text-right font-medium">{formatCurrency(w2.federalTaxWithheld)}</span>
                            </div>
                            <div className="flex justify-between items-baseline gap-4">
                              <span className="text-brand-dark text-sm font-medium shrink-0">State withheld</span>
                              <span className="text-brand-dark text-sm text-right font-medium">{formatCurrency(w2.stateTaxWithheld)}</span>
                            </div>
                            <div className="flex justify-between items-baseline gap-4">
                              <span className="text-brand-dark text-sm font-medium shrink-0">Social Security withheld</span>
                              <span className="text-brand-dark text-sm text-right font-medium">{formatCurrency(w2.socialSecurityWithheld)}</span>
                            </div>
                            <div className="flex justify-between items-baseline gap-4">
                              <span className="text-brand-dark text-sm font-medium shrink-0">Medicare withheld</span>
                              <span className="text-brand-dark text-sm text-right font-medium">{formatCurrency(w2.medicareWithheld)}</span>
                            </div>
                            <div className="flex justify-between items-baseline gap-4">
                              <span className="text-brand-dark text-sm font-medium shrink-0">EIN</span>
                              <span className="text-brand-dark text-sm text-right font-medium">{w2.ein || '—'}</span>
                            </div>
                            </div>
                          </div>
                        ))
                      : null}
                    {(formData.incomeInfo?.form1099INT?.length ?? 0) > 0 && formData.incomeInfo?.form1099INT?.map((f, i) => (
                      <div key={`1099int-${i}`} className="bg-white rounded-lg shadow-md overflow-hidden">
                        <div className="px-4 py-2 border-b border-slate-100">
                          <span className="text-brand-dark text-sm font-semibold">1099-INT #{i + 1}</span>
                        </div>
                        <div className="p-4 space-y-2">
                        <div className="flex justify-between items-baseline gap-4">
                          <span className="text-brand-dark text-sm font-medium shrink-0">Interest income</span>
                          <span className="text-brand-dark text-sm text-right font-medium">{formatCurrency(f.interestIncome)}</span>
                        </div>
                        <div className="flex justify-between items-baseline gap-4">
                          <span className="text-brand-dark text-sm font-medium shrink-0">Federal withheld</span>
                          <span className="text-brand-dark text-sm text-right font-medium">{formatCurrency(f.federalTaxWithheld)}</span>
                        </div>
                        <div className="flex justify-between items-baseline gap-4">
                          <span className="text-brand-dark text-sm font-medium shrink-0">State withheld</span>
                          <span className="text-brand-dark text-sm text-right font-medium">{formatCurrency(f.stateTaxWithheld)}</span>
                        </div>
                        <div className="flex justify-between items-baseline gap-4">
                          <span className="text-brand-dark text-sm font-medium shrink-0">Payer TIN</span>
                          <span className="text-brand-dark text-sm text-right font-medium">{f.payerTin || '—'}</span>
                        </div>
                        <div className="flex justify-between items-baseline gap-4">
                          <span className="text-brand-dark text-sm font-medium shrink-0">Income type</span>
                          <span className="text-brand-dark text-sm text-right font-medium">{f.incomeTypeDescription || '—'}</span>
                        </div>
                        </div>
                      </div>
                    ))}
                    {(formData.incomeInfo?.form1099MISC?.length ?? 0) > 0 && formData.incomeInfo?.form1099MISC?.map((f, i) => (
                      <div key={`1099misc-${i}`} className="bg-white rounded-lg shadow-md overflow-hidden">
                        <div className="px-4 py-2 border-b border-slate-100">
                          <span className="text-brand-dark text-sm font-semibold">1099-MISC #{i + 1}</span>
                        </div>
                        <div className="p-4 space-y-2">
                        <div className="flex justify-between items-baseline gap-4">
                          <span className="text-brand-dark text-sm font-medium shrink-0">Other income</span>
                          <span className="text-brand-dark text-sm text-right font-medium">{formatCurrency(f.otherIncome)}</span>
                        </div>
                        <div className="flex justify-between items-baseline gap-4">
                          <span className="text-brand-dark text-sm font-medium shrink-0">Federal withheld</span>
                          <span className="text-brand-dark text-sm text-right font-medium">{formatCurrency(f.federalTaxWithheld)}</span>
                        </div>
                        <div className="flex justify-between items-baseline gap-4">
                          <span className="text-brand-dark text-sm font-medium shrink-0">State withheld</span>
                          <span className="text-brand-dark text-sm text-right font-medium">{formatCurrency(f.stateTaxWithheld)}</span>
                        </div>
                        <div className="flex justify-between items-baseline gap-4">
                          <span className="text-brand-dark text-sm font-medium shrink-0">Payer TIN</span>
                          <span className="text-brand-dark text-sm text-right font-medium">{f.payerTin || '—'}</span>
                        </div>
                        <div className="flex justify-between items-baseline gap-4">
                          <span className="text-brand-dark text-sm font-medium shrink-0">Income type</span>
                          <span className="text-brand-dark text-sm text-right font-medium">{f.incomeTypeDescription || '—'}</span>
                        </div>
                        </div>
                      </div>
                    ))}
                    {formData.incomeInfo?.bankDetails && (
                      <div className="bg-white rounded-lg shadow-md overflow-hidden">
                        <div className="px-4 py-2 border-b border-slate-100">
                          <span className="text-brand-dark text-sm font-semibold">Direct deposit</span>
                        </div>
                        <div className="p-4 space-y-2">
                        <div className="flex justify-between items-baseline gap-4">
                          <span className="text-brand-dark text-sm font-medium shrink-0">Account type</span>
                          <span className="text-brand-dark text-sm text-right font-medium">{formData.incomeInfo.bankDetails?.accountType ?? '—'}</span>
                        </div>
                        <div className="flex justify-between items-baseline gap-4">
                          <span className="text-brand-dark text-sm font-medium shrink-0">Account number</span>
                          <span className="text-brand-dark text-sm text-right font-medium">{formData.incomeInfo.bankDetails?.accountNumber ?? '—'}</span>
                        </div>
                        <div className="flex justify-between items-baseline gap-4">
                          <span className="text-brand-dark text-sm font-medium shrink-0">Routing number</span>
                          <span className="text-brand-dark text-sm text-right font-medium">{formData.incomeInfo.bankDetails?.routingNumber ?? '—'}</span>
                        </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex gap-4 mt-8">
                <button
                  onClick={handlePrevious}
                  className="flex-1 bg-white border border-slate-300 text-slate-700 px-6 py-3 rounded-lg font-semibold hover:bg-slate-50 transition-colors"
                >
                  Previous
                </button>
                <button
                  onClick={handleNext}
                  className="flex-1 bg-brand-accent text-slate-900 px-6 py-3 rounded-lg font-semibold hover:bg-sky-300 transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
        </main>

        {/* Sticky left on desktop; below form on mobile */}
        <aside className="order-2 md:order-1 w-full md:w-64 md:shrink-0 pt-2">
          <div className="sticky top-4 md:top-8 space-y-4">
            <ProgressBar currentStep={currentStep} totalSteps={totalSteps} />
            <p className="text-xs text-slate-600 italic leading-relaxed hidden md:block">
              Your details never leave your machine. Calculations and form generation happen on your system, no data ever leaves your device.
            </p>
            <div className="hidden md:flex items-center gap-2 pt-1 text-slate-500">
              <svg className="w-4 h-4 shrink-0 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              <span className="text-[10px] font-medium uppercase tracking-wider">Processed locally</span>
            </div>
            <div className="hidden md:flex items-center gap-2 pt-1 text-slate-500">
              <svg className="w-4 h-4 shrink-0 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span className="text-[10px] font-medium uppercase tracking-wider">IRS-level safeguards maintained</span>
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}
