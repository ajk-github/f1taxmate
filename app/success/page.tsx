'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState, useMemo } from 'react'
import { calculateTax, TaxCalculationResult } from '@/lib/tax-calculation'
import { generateTaxForms, createFormsZip } from '@/lib/form-generation'
import type { FormData as FormDataType } from '@/types/form'
import type { FormData, FICAEmployerEntry } from '@/types/form'

export default function SuccessPage() {
  const router = useRouter()
  const [isCalculating, setIsCalculating] = useState(true)
  const [taxResult, setTaxResult] = useState<TaxCalculationResult | null>(null)
  const [formData, setFormData] = useState<FormDataType | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isGeneratingForms, setIsGeneratingForms] = useState(false)
  const [formGenerationError, setFormGenerationError] = useState<string | null>(null)
  const [ficaEmployerInfo, setFicaEmployerInfo] = useState<FICAEmployerEntry[]>([])
  const [skipFICA, setSkipFICA] = useState(false)
  const [ficaEmployerError, setFicaEmployerError] = useState<string | null>(null)

  useEffect(() => {
    // Get form data from sessionStorage
    const storedData = sessionStorage.getItem('formData')
    if (!storedData) {
      setError('No form data found. Please start over.')
      setIsCalculating(false)
      return
    }

    try {
      const parsedData = JSON.parse(storedData) as FormDataType
      setFormData(parsedData)

      // Only calculate if user had US income
      if (!parsedData.incomeInfo?.hadUSIncome) {
        setIsCalculating(false)
        return
      }

      // Perform tax calculation
      // Ensure we have minimum required data for calculation
      if (!parsedData.incomeInfo) {
        setError('Income information is required for tax calculation')
        setIsCalculating(false)
        return
      }

      // Provide default values for optional fields
      const completeFormData: FormData = {
        personalInfo: {
          firstName: parsedData.personalInfo?.firstName || '',
          lastName: parsedData.personalInfo?.lastName || '',
          dateOfBirth: parsedData.personalInfo?.dateOfBirth || '',
          phone: parsedData.personalInfo?.phone || '',
          email: parsedData.personalInfo?.email || '',
          passportNumber: parsedData.personalInfo?.passportNumber || '',
          visaType: parsedData.personalInfo?.visaType || 'F1',
          occupationType: parsedData.personalInfo?.occupationType || '',
          usAddress: {
            address: parsedData.personalInfo?.usAddress?.address || '',
            addressLine2: parsedData.personalInfo?.usAddress?.addressLine2,
            city: parsedData.personalInfo?.usAddress?.city || '',
            state: parsedData.personalInfo?.usAddress?.state || 'IL',
            county: parsedData.personalInfo?.usAddress?.county,
            zipCode: parsedData.personalInfo?.usAddress?.zipCode || '',
          },
          foreignAddress: {
            addressLine1: parsedData.personalInfo?.foreignAddress?.addressLine1 || '',
            addressLine2: parsedData.personalInfo?.foreignAddress?.addressLine2,
            city: parsedData.personalInfo?.foreignAddress?.city || '',
            stateProvince: parsedData.personalInfo?.foreignAddress?.stateProvince,
            postalCode: parsedData.personalInfo?.foreignAddress?.postalCode,
            country: parsedData.personalInfo?.foreignAddress?.country || 'India',
          },
        },
        universityInfo: parsedData.universityInfo || {
          universityName: '',
          universityAddress: { address: '', city: '', state: '', zipCode: '' },
          universityContactNumber: '',
          issAdvisorName: '',
          issAdvisorAddress: { address: '', city: '', state: '', zipCode: '' },
          issAdvisorContactNumber: '',
          sameAsUniversity: false,
        },
        residencyInfo: parsedData.residencyInfo || {
          dateOfFirstVisit: '',
          visits: [],
          hasFiledTaxReturnBefore: false,
        },
        incomeInfo: parsedData.incomeInfo,
      }

      calculateTax(completeFormData)
        .then((result) => {
          setTaxResult(result)
          setIsCalculating(false)
        })
        .catch((err) => {
          console.error('Tax calculation error:', err)
          setError(err.message || 'Failed to calculate taxes')
          setIsCalculating(false)
        })
    } catch (err) {
      console.error('Error parsing form data:', err)
      setError('Invalid form data. Please start over.')
      setIsCalculating(false)
    }
  }, [])

  const w2WithFica = useMemo(
    () =>
      formData?.incomeInfo?.w2Forms?.filter(
        (w2) => (w2?.socialSecurityWithheld || 0) + (w2?.medicareWithheld || 0) > 0
      ) ?? [],
    [formData]
  )

  useEffect(() => {
    if (!formData?.incomeInfo || !taxResult?.federalTax?.forms?.form832 || w2WithFica.length === 0)
      return
    const existing = formData.incomeInfo.ficaEmployerInfo
    if (existing && existing.length === w2WithFica.length) {
      setFicaEmployerInfo(existing)
      return
    }
    setFicaEmployerInfo(
      Array.from({ length: w2WithFica.length }, (_, i) => ({
        employerName: existing?.[i]?.employerName ?? '',
        employerAddress: existing?.[i]?.employerAddress ?? '',
      }))
    )
  }, [formData?.incomeInfo?.ficaEmployerInfo, taxResult?.federalTax?.forms?.form832, w2WithFica.length])

  const handleProceedToPayment = (ficaEmployerInfoToSave?: FICAEmployerEntry[]) => {
    setFicaEmployerError(null)
    // Validate FICA employer info if FICA is applicable and not skipped
    if (
      taxResult?.federalTax?.forms?.form832 &&
      !skipFICA &&
      ficaEmployerInfoToSave &&
      ficaEmployerInfoToSave.length > 0
    ) {
      const missingFields = ficaEmployerInfoToSave.some(
        (entry) => !entry.employerName?.trim() || !entry.employerAddress?.trim()
      )
      if (missingFields) {
        setFicaEmployerError(
          'Please fill in all employer name and address fields, or check "I don’t want to file FICA" to skip.'
        )
        return
      }
    }

    if (taxResult) {
      try {
        sessionStorage.setItem('taxResult', JSON.stringify(taxResult))
      } catch {
        // ignore
      }
    }
    if (formData && ficaEmployerInfoToSave && formData.incomeInfo) {
      try {
        const updated = {
          ...formData,
          incomeInfo: { ...formData.incomeInfo, ficaEmployerInfo: ficaEmployerInfoToSave },
        }
        sessionStorage.setItem('formData', JSON.stringify(updated))
      } catch {
        // ignore
      }
    }
    router.push('/payment')
  }

  const handleGenerateForms = async () => {
    if (!formData || !taxResult) {
      setFormGenerationError('Form data or tax result is missing')
      return
    }

    setIsGeneratingForms(true)
    setFormGenerationError(null)

    try {
      // Prepare complete form data
      const completeFormData: FormData = {
        personalInfo: {
          firstName: formData.personalInfo?.firstName || '',
          lastName: formData.personalInfo?.lastName || '',
          dateOfBirth: formData.personalInfo?.dateOfBirth || '',
          phone: formData.personalInfo?.phone || '',
          email: formData.personalInfo?.email || '',
          passportNumber: formData.personalInfo?.passportNumber || '',
          visaType: formData.personalInfo?.visaType || 'F1',
          occupationType: formData.personalInfo?.occupationType || '',
          usAddress: {
            address: formData.personalInfo?.usAddress?.address || '',
            addressLine2: formData.personalInfo?.usAddress?.addressLine2,
            city: formData.personalInfo?.usAddress?.city || '',
            state: formData.personalInfo?.usAddress?.state || 'IL',
            county: formData.personalInfo?.usAddress?.county,
            zipCode: formData.personalInfo?.usAddress?.zipCode || '',
          },
          foreignAddress: {
            addressLine1: formData.personalInfo?.foreignAddress?.addressLine1 || '',
            addressLine2: formData.personalInfo?.foreignAddress?.addressLine2,
            city: formData.personalInfo?.foreignAddress?.city || '',
            stateProvince: formData.personalInfo?.foreignAddress?.stateProvince,
            postalCode: formData.personalInfo?.foreignAddress?.postalCode,
            country: formData.personalInfo?.foreignAddress?.country || 'India',
          },
        },
        universityInfo: formData.universityInfo || {
          universityName: '',
          universityAddress: { address: '', city: '', state: '', zipCode: '' },
          universityContactNumber: '',
          issAdvisorName: '',
          issAdvisorAddress: { address: '', city: '', state: '', zipCode: '' },
          issAdvisorContactNumber: '',
          sameAsUniversity: false,
        },
        residencyInfo: formData.residencyInfo || {
          dateOfFirstVisit: '',
          visits: [],
          hasFiledTaxReturnBefore: false,
        },
        incomeInfo: formData.incomeInfo,
      }

      // Generate all forms
      const generatedForms = await generateTaxForms(completeFormData, taxResult)

      // Create ZIP file
      const zipBlob = await createFormsZip(generatedForms)

      // Download the ZIP file
      const url = window.URL.createObjectURL(zipBlob)
      const a = document.createElement('a')
      a.href = url
      a.download = `tax-forms-${new Date().getFullYear()}.zip`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
    } catch (err: any) {
      console.error('Error generating forms:', err)
      setFormGenerationError(err.message || 'Failed to generate forms. Please try again.')
    } finally {
      setIsGeneratingForms(false)
    }
  }

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount)
  }

  const calculateGrossIncome = (): number => {
    if (!formData?.incomeInfo) return 0
    let total = 0
    formData.incomeInfo.w2Forms?.forEach((w2) => {
      total += w2?.wages || 0
    })
    formData.incomeInfo.form1099INT?.forEach((form) => {
      total += form?.interestIncome || 0
    })
    formData.incomeInfo.form1099MISC?.forEach((form) => {
      total += form?.otherIncome || 0
    })
    return total
  }

  const calculateFederalTaxWithheld = (): number => {
    if (!formData?.incomeInfo) return 0
    let total = 0
    formData.incomeInfo.w2Forms?.forEach((w2) => {
      total += w2?.federalTaxWithheld || 0
    })
    formData.incomeInfo.form1099INT?.forEach((form) => {
      total += form?.federalTaxWithheld || 0
    })
    formData.incomeInfo.form1099MISC?.forEach((form) => {
      total += form?.federalTaxWithheld || 0
    })
    return total
  }

  const calculateStateTaxWithheld = (): number => {
    if (!formData?.incomeInfo) return 0
    let total = 0
    formData.incomeInfo.w2Forms?.forEach((w2) => {
      total += w2?.stateTaxWithheld || 0
    })
    formData.incomeInfo.form1099INT?.forEach((form) => {
      total += form?.stateTaxWithheld || 0
    })
    formData.incomeInfo.form1099MISC?.forEach((form) => {
      total += form?.stateTaxWithheld || 0
    })
    return total
  }

  const calculateFICAWithheld = (): { socialSecurity: number; medicare: number; total: number } => {
    if (!formData?.incomeInfo) return { socialSecurity: 0, medicare: 0, total: 0 }
    let socialSecurity = 0
    let medicare = 0
    formData.incomeInfo.w2Forms?.forEach((w2) => {
      socialSecurity += w2?.socialSecurityWithheld || 0
      medicare += w2?.medicareWithheld || 0
    })
    return {
      socialSecurity,
      medicare,
      total: socialSecurity + medicare,
    }
  }

  if (isCalculating) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center px-4">
        <div className="max-w-2xl w-full text-center">
          <div className="mb-8">
            <div className="inline-block animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-primary"></div>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Calculating Your Tax
          </h1>
          <p className="text-gray-600">
            Please wait while we calculate your federal and state tax...
          </p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center px-4">
        <div className="max-w-2xl w-full text-center">
          <div className="mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-red-100 mb-4">
              <svg
                className="w-10 h-10 text-red-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-4">
              Calculation Error
            </h1>
            <p className="text-gray-600 mb-8">{error}</p>
            <button
              onClick={() => router.push('/form')}
              className="bg-primary text-white px-6 py-3 rounded-lg font-semibold hover:bg-green-600 transition-colors"
            >
              Go Back to Form
            </button>
          </div>
        </div>
      </div>
    )
  }

  // If no US income, show simple message
  if (!formData?.incomeInfo?.hadUSIncome) {
    return (
      <div className="min-h-screen bg-white py-12 px-4">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-100 mb-4">
              <svg
                className="w-10 h-10 text-primary"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              Form Preparation Complete
            </h1>
            <p className="text-xl text-gray-600 mb-8">
              Since you had no US income, you only need to file Form 8843.
            </p>
          </div>

          <div className="flex flex-col items-center gap-4">
            <button
              onClick={() => router.push('/form?review=1')}
              className="bg-white border border-slate-300 text-slate-700 px-8 py-4 rounded-lg text-lg font-semibold hover:bg-slate-50 transition-colors shadow-lg"
            >
              Back to Forms
            </button>
            <button
              onClick={() =>
                handleProceedToPayment(
                  taxResult?.federalTax?.forms?.form832 && !skipFICA ? ficaEmployerInfo : undefined
                )
              }
              className="bg-primary text-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-green-600 transition-colors shadow-lg"
            >
              Proceed to Payment
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (!taxResult) {
    return null
  }

  const grossIncome = calculateGrossIncome()
  const federalTaxWithheld = calculateFederalTaxWithheld()
  const stateTaxWithheld = calculateStateTaxWithheld()
  const federalTaxableIncome = Math.max(0, grossIncome - 15750)
  const illinoisExemption = grossIncome > 250000 ? 0 : 2850
  const illinoisTaxableIncome = Math.max(0, grossIncome - illinoisExemption)

  const totalRefund = taxResult.federalTax.refund + taxResult.stateTax.refund
  const totalOwed = (taxResult.federalTax.amountOwed || 0) + (taxResult.stateTax.amountOwed || 0)
  const hasNetUnderpayment = totalOwed > totalRefund

  return (
    <div className="min-h-screen bg-white py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-100 mb-4">
            <svg
              className="w-10 h-10 text-primary"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Tax Calculation Complete
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            Your tax has been calculated and your forms are ready!
          </p>
        </div>

        {/* Federal Tax Breakdown */}
        <div className="bg-white border border-silver rounded-lg p-8 mb-6 shadow-sm">
          <h2 className="text-2xl font-semibold text-gray-900 mb-6">
            Federal Tax (Form 1040-NR, Single)
          </h2>
          <div className="space-y-3 text-gray-700">
            <div className="flex justify-between">
              <span>Gross Income:</span>
              <span className="font-semibold">{formatCurrency(grossIncome)}</span>
            </div>
            <div className="flex justify-between">
              <span>Standard Deduction:</span>
              <span className="font-semibold text-green-600">
                {formatCurrency(15750)} (India-US Treaty Article 21(2))
              </span>
            </div>
            <div className="flex justify-between border-t border-gray-300 pt-3">
              <span className="font-semibold">Taxable Income:</span>
              <span className="font-semibold">{formatCurrency(federalTaxableIncome)}</span>
            </div>
            <div className="flex justify-between">
              <span>Tax Owed:</span>
              <span className="font-semibold">{formatCurrency(taxResult.federalTax.taxOwed)}</span>
            </div>
            <div className="flex justify-between">
              <span>Tax Withheld:</span>
              <span className="font-semibold">{formatCurrency(federalTaxWithheld)}</span>
            </div>
            <div className="flex justify-between border-t-2 border-gray-900 pt-3 mt-4">
              <span className="text-lg font-bold">
                {taxResult.federalTax.refund > 0 ? 'Federal Refund:' : 'Federal Amount Owed:'}
              </span>
              <span
                className={`text-lg font-bold ${
                  taxResult.federalTax.refund > 0 ? 'text-green-600' : 'text-red-600'
                }`}
              >
                {taxResult.federalTax.refund > 0
                  ? formatCurrency(taxResult.federalTax.refund)
                  : formatCurrency(taxResult.federalTax.amountOwed || 0)}
              </span>
            </div>
          </div>
        </div>

        {/* Illinois State Tax Breakdown — only when income state is Illinois */}
        {formData?.incomeInfo?.incomeState === 'Illinois' && (
          <div className="bg-white border border-silver rounded-lg p-8 mb-6 shadow-sm">
            <h2 className="text-2xl font-semibold text-gray-900 mb-6">
              Illinois State Tax (Form IL-1040, Single)
            </h2>
            <div className="space-y-3 text-gray-700">
              <div className="flex justify-between">
                <span>Gross Income:</span>
                <span className="font-semibold">{formatCurrency(grossIncome)}</span>
              </div>
              <div className="flex justify-between">
                <span>Personal Exemption:</span>
                <span className="font-semibold text-green-600">
                  {formatCurrency(illinoisExemption)}
                  {grossIncome > 250000 && ' (Phaseout: AGI > $250,000)'}
                </span>
              </div>
              <div className="flex justify-between border-t border-gray-300 pt-3">
                <span className="font-semibold">Taxable Income:</span>
                <span className="font-semibold">{formatCurrency(illinoisTaxableIncome)}</span>
              </div>
              <div className="flex justify-between">
                <span>Tax Rate:</span>
                <span className="font-semibold">4.95% (flat rate)</span>
              </div>
              <div className="flex justify-between">
                <span>Tax Owed:</span>
                <span className="font-semibold">
                  {formatCurrency(illinoisTaxableIncome * 0.0495)}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Tax Withheld:</span>
                <span className="font-semibold">{formatCurrency(stateTaxWithheld)}</span>
              </div>
              <div className="flex justify-between border-t-2 border-gray-900 pt-3 mt-4">
                <span className="text-lg font-bold">
                  {taxResult.stateTax.refund > 0 ? 'State Refund:' : 'State Amount Owed:'}
                </span>
                <span
                  className={`text-lg font-bold ${
                    taxResult.stateTax.refund > 0 ? 'text-green-600' : 'text-red-600'
                  }`}
                >
                  {taxResult.stateTax.refund > 0
                    ? formatCurrency(taxResult.stateTax.refund)
                    : formatCurrency(taxResult.stateTax.amountOwed || 0)}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Total Summary */}
        <div className="bg-gradient-to-r from-gray-50 to-gray-100 border-2 border-gray-300 rounded-lg p-8 mb-6 shadow-sm">
          <h2 className="text-2xl font-semibold text-gray-900 mb-6">
            Total Summary
          </h2>
          <div className="space-y-3">
            <div className="flex justify-between text-lg">
              <span className="font-semibold">Total Refund:</span>
              <span className="font-bold text-green-600">
                {formatCurrency(totalRefund)}
              </span>
            </div>
            <div className="flex justify-between text-lg">
              <span className="font-semibold">Total Amount Owed:</span>
              <span className="font-bold text-red-600">
                {formatCurrency(totalOwed)}
              </span>
            </div>
            <div className="flex justify-between border-t-2 border-gray-900 pt-4 mt-4">
              <span className="text-2xl font-bold">Net Result:</span>
              <span
                className={`text-2xl font-bold ${
                  totalRefund > totalOwed ? 'text-green-600' : 'text-red-600'
                }`}
              >
                {totalRefund > totalOwed
                  ? formatCurrency(totalRefund - totalOwed) + ' Refund'
                  : formatCurrency(totalOwed - totalRefund) + ' Owed'}
              </span>
            </div>
            {hasNetUnderpayment && (
              <p className="mt-4 text-sm text-red-700">
                We identified a tax underpayment. We do not process underpayments — you owe tax and will
                need to file and pay using another service or directly with the IRS/state.
              </p>
            )}
          </div>
        </div>

        {/* FICA Tax Recovery (if applicable) */}
        {taxResult.federalTax.forms.form832 && (() => {
          const ficaInfo = calculateFICAWithheld()
          return (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-8 mb-6 shadow-sm">
              <h2 className="text-2xl font-semibold text-gray-900 mb-6">
                FICA Tax Recovery
              </h2>
              <div className="space-y-3 text-gray-700">
                <p className="mb-4">
                  F-1 students with less than 5 years in the US are <strong>exempt</strong> from FICA taxes. 
                  If FICA was withheld from your wages, you can recover it.
                </p>
                <div className="flex justify-between">
                  <span>Social Security tax withheld (Box 4):</span>
                  <span className="font-semibold">{formatCurrency(ficaInfo.socialSecurity)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Medicare tax withheld (Box 6):</span>
                  <span className="font-semibold">{formatCurrency(ficaInfo.medicare)}</span>
                </div>
                <div className="flex justify-between border-t-2 border-gray-900 pt-3 mt-4">
                  <span className="text-lg font-bold">Total FICA withheld in error:</span>
                  <span className="text-lg font-bold text-red-600">
                    {formatCurrency(ficaInfo.total)}
                  </span>
                </div>
                <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-gray-700">
                    Processing time: 6-9 months. Deadline: 3 years from when tax was paid. 
                    We provide the forms needed to recover your FICA taxes.
                  </p>
                </div>
                <div className="mt-6 border-t border-yellow-300 pt-6">
                  <div className="mb-4">
                    <label className="flex items-start gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={skipFICA}
                        onChange={(e) => {
                          setSkipFICA(e.target.checked)
                          setFicaEmployerError(null)
                        }}
                        className="mt-1 h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                      />
                      <span className="text-sm font-semibold text-gray-900">
                        I don&apos;t want to file FICA
                      </span>
                    </label>
                  </div>
                  {ficaEmployerError && !skipFICA && (
                    <p className="mb-3 text-sm text-red-700" role="alert">
                      {ficaEmployerError}
                    </p>
                  )}
                  {!skipFICA && (
                    <>
                      <p className="text-sm font-semibold text-gray-900 mb-2">
                        Employer information 
                      </p>
                      <p className="text-xs text-gray-600 mb-3">
                        <strong>Important:</strong> This is for employers that withheld FICA only. Please check your W-2 forms (Box 4 for Social Security and Box 6 for Medicare) to confirm FICA was withheld before providing employer information.
                      </p>
                      {w2WithFica.map((w2, i) => {
                        const hasFICA = (w2?.socialSecurityWithheld || 0) + (w2?.medicareWithheld || 0) > 0
                        return (
                          <div key={i} className="mb-4 p-4 bg-white border border-gray-200 rounded-lg">
                            <p className="text-xs font-medium text-gray-600 mb-2">
                              Employer {i + 1}
                              {hasFICA && (
                                <span className="ml-2 text-green-600">✓ FICA withheld (SS: ${(w2?.socialSecurityWithheld || 0).toFixed(2)}, Med: ${(w2?.medicareWithheld || 0).toFixed(2)})</span>
                              )}
                            </p>
                            <div className="space-y-2">
                              <label className="block text-sm text-gray-700">
                                Employer name <span className="text-red-500">*</span>
                                <input
                                  type="text"
                                  required
                                  value={ficaEmployerInfo[i]?.employerName ?? ''}
                                  onChange={(e) => {
                                    setFicaEmployerError(null)
                                    setFicaEmployerInfo((prev) => {
                                      const next = [...(prev.length ? prev : Array.from({ length: w2WithFica.length }, () => ({ employerName: '', employerAddress: '' })))]
                                      next[i] = { ...next[i], employerName: e.target.value }
                                      return next
                                    })
                                  }}
                                  placeholder="Employer or company name"
                                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 shadow-sm focus:border-primary focus:ring-primary"
                                />
                              </label>
                              <label className="block text-sm text-gray-700">
                                Employer address <span className="text-gray-500 font-normal">(include street, city, State and ZIP code)</span> <span className="text-red-500">*</span>
                                <input
                                  type="text"
                                  required
                                  value={ficaEmployerInfo[i]?.employerAddress ?? ''}
                                  onChange={(e) => {
                                    setFicaEmployerError(null)
                                    setFicaEmployerInfo((prev) => {
                                      const next = [...(prev.length ? prev : Array.from({ length: w2WithFica.length }, () => ({ employerName: '', employerAddress: '' })))]
                                      next[i] = { ...next[i], employerAddress: e.target.value }
                                      return next
                                    })
                                  }}
                                  placeholder="Street, city, state, ZIP"
                                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 shadow-sm focus:border-primary focus:ring-primary"
                                />
                              </label>
                            </div>
                          </div>
                        )
                      })}
                    </>
                  )}
                </div>
              </div>
            </div>
          )
        })()}

        <div className="flex flex-col items-center gap-4">
          <button
            onClick={() => router.push('/form?review=1')}
            className="bg-white border border-slate-300 text-slate-700 px-8 py-4 rounded-lg text-lg font-semibold hover:bg-slate-50 transition-colors shadow-lg"
          >
            Back to Forms
          </button>
          {!hasNetUnderpayment && (
            <button
              onClick={() =>
                handleProceedToPayment(
                  taxResult?.federalTax?.forms?.form832 && !skipFICA ? ficaEmployerInfo : undefined
                )
              }
              className="bg-primary text-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-green-600 transition-colors shadow-lg"
            >
              Proceed to Payment
            </button>
          )}
          {hasNetUnderpayment && (
            <p className="text-sm text-red-700 text-center max-w-md">
              Because you owe tax overall, we cannot process this return. Please file and pay your tax
              using another service or directly with the IRS/state.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
