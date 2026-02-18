'use client'

import { useState, useEffect } from 'react'
import {
  IncomeInfo,
  W2Form,
} from '@/types/form'

interface Step4IncomeInfoProps {
  data?: Partial<IncomeInfo>
  onUpdate: (data: IncomeInfo) => void
  onNext: () => void
  onPrevious: () => void
}

export default function Step4IncomeInfo({
  data,
  onUpdate,
  onNext,
  onPrevious,
}: Step4IncomeInfoProps) {
  const [formData, setFormData] = useState<IncomeInfo>({
    hadUSIncome: data?.hadUSIncome ?? false,
    incomeState: data?.incomeState,
    ssn: data?.ssn || '',
    w2Forms: data?.w2Forms || [],
    form1099INT: data?.form1099INT || [],
    form1099MISC: data?.form1099MISC || [],
    bankDetails: {
      accountNumber: data?.bankDetails?.accountNumber || '',
      routingNumber: data?.bankDetails?.routingNumber || '',
      accountType: data?.bankDetails?.accountType || 'checking',
    },
  })

  const [errorMessage, setErrorMessage] = useState<string>('')
  const [errorFieldId, setErrorFieldId] = useState<string>('')

  useEffect(() => {
    onUpdate(formData)
  }, [formData, onUpdate])

  const addW2Form = () => {
    setFormData({
      ...formData,
      w2Forms: [
        ...formData.w2Forms,
        {
          wages: null as any,
          federalTaxWithheld: null as any,
          stateTaxWithheld: null as any,
          socialSecurityWithheld: null as any,
          medicareWithheld: null as any,
          ein: '',
        },
      ],
    })
  }

  const removeW2Form = (index: number) => {
    const updated = formData.w2Forms.filter((_, i) => i !== index)
    setFormData({ ...formData, w2Forms: updated })
  }

  const updateW2Form = (index: number, field: keyof W2Form, value: any) => {
    const updated = [...formData.w2Forms]
    updated[index] = { ...updated[index], [field]: value }
    setFormData({ ...formData, w2Forms: updated })
  }

  // Format SSN with dashes: 123-45-6789
  const formatSSN = (value: string): string => {
    // Remove all non-digits
    const digits = value.replace(/\D/g, '')
    // Limit to 9 digits
    const limited = digits.slice(0, 9)
    // Add dashes at positions 3 and 5
    if (limited.length <= 3) {
      return limited
    } else if (limited.length <= 5) {
      return `${limited.slice(0, 3)}-${limited.slice(3)}`
    } else {
      return `${limited.slice(0, 3)}-${limited.slice(3, 5)}-${limited.slice(5)}`
    }
  }

  // Get SSN without dashes for storage/validation
  const getSSNWithoutDashes = (ssn: string): string => {
    return ssn.replace(/\D/g, '')
  }

  const handleSSNChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatSSN(e.target.value)
    setFormData({ ...formData, ssn: formatted })
  }

  // Format EIN with dashes: 12-3456789 (exactly 9 digits)
  const formatEIN = (value: string): string => {
    // Remove all non-digits
    const digits = value.replace(/\D/g, '')
    // Limit to exactly 9 digits
    const limited = digits.slice(0, 9)
    // Add dash after first 2 digits only if we have at least 2 digits
    if (limited.length <= 2) {
      return limited
    } else {
      return `${limited.slice(0, 2)}-${limited.slice(2)}`
    }
  }

  // Validate EIN format: must be exactly 9 digits
  const isValidEIN = (ein: string): boolean => {
    const digits = ein.replace(/\D/g, '')
    return digits.length === 9
  }

  const handleEINChange = (index: number, value: string) => {
    const formatted = formatEIN(value)
    updateW2Form(index, 'ein', formatted)
    // Clear error when user starts typing
    if (errorFieldId === `ein-${index}`) {
      setErrorMessage('')
      setErrorFieldId('')
    }
  }

  // Scroll to field and show error message
  const showFieldError = (fieldId: string, message: string) => {
    setErrorMessage(message)
    setErrorFieldId(fieldId)
    const field = document.getElementById(fieldId)
    if (field) {
      field.scrollIntoView({ behavior: 'smooth', block: 'center' })
      field.focus()
    }
  }

  return (
    <div>
      <h1 className="text-3xl font-bold text-slate-900 mb-4">
        Income Documents and Bank Details
      </h1>
      <p className="text-slate-600 mb-8">
        Please complete all required fields. Fields marked with <span className="text-red-500">*</span> are mandatory.
      </p>

      <div className="space-y-8">
        {/* US Income Yes/No Question */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-3">
            Did you have any income in 2025? <span className="text-red-500">*</span>
          </label>
          <div className="flex gap-6">
            <label className="flex items-center">
              <input
                id="hadUSIncome"
                type="radio"
                name="hadUSIncome"
                value="yes"
                checked={formData.hadUSIncome === true}
                onChange={() => {
                  setFormData({ ...formData, hadUSIncome: true })
                  if (errorFieldId === 'hadUSIncome') {
                    setErrorMessage('')
                    setErrorFieldId('')
                  }
                }}
                required
                className="w-4 h-4 text-brand-accent border-slate-300 focus:ring-brand-accent"
              />
              <span className="ml-2 text-slate-700">Yes</span>
            </label>
            <label className="flex items-center">
              <input
                id="hadUSIncome"
                type="radio"
                name="hadUSIncome"
                value="no"
                checked={formData.hadUSIncome === false}
                onChange={() => {
                  setFormData({ ...formData, hadUSIncome: false })
                  if (errorFieldId === 'hadUSIncome') {
                    setErrorMessage('')
                    setErrorFieldId('')
                  }
                }}
                required
                className="w-4 h-4 text-brand-accent border-slate-300 focus:ring-brand-accent"
              />
              <span className="ml-2 text-slate-700">No</span>
            </label>
          </div>
        </div>

        {/* SSN */}
        {formData.hadUSIncome && (
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Social Security Number (SSN) <span className="text-red-500">*</span>
            </label>
            <p className="text-sm text-slate-500 mb-2">
              For security purposes, we do not store your SSN anywhere. Your SSN
              is only used during form generation and is never saved to any
              database.
            </p>
            <input
              id="ssn"
              type="text"
              value={formData.ssn}
              onChange={(e) => {
                handleSSNChange(e)
                if (errorFieldId === 'ssn') {
                  setErrorMessage('')
                  setErrorFieldId('')
                }
              }}
              placeholder="123-45-6789"
              maxLength={11}
              required
              className={`w-full px-4 py-2 border rounded-lg bg-white text-slate-900 focus:ring-2 focus:ring-brand-accent/40 focus:border-brand-accent ${
                errorFieldId === 'ssn' ? 'border-red-500' : 'border-slate-300'
              }`}
            />
            {errorFieldId === 'ssn' && (
              <p className="text-sm text-red-500 mt-1">{errorMessage}</p>
            )}
          </div>
        )}

        {/* W2 Forms */}
        {formData.hadUSIncome && (
          <div>
            <h2 className="text-xl font-semibold text-slate-900 mb-2">
              W2 Forms
            </h2>
            <p className="text-slate-600 mb-4">
              Please enter the information from your W2 forms. If any field is
              empty on your W2, please enter 0.
            </p>

            {/* Income state — outside W2 cards; only Illinois can file state return */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Income state <span className="text-red-500">*</span>
              </label>
              <select
                id="incomeState"
                value={formData.incomeState ?? ''}
                onChange={(e) => {
                  setFormData({
                    ...formData,
                    incomeState: e.target.value ? (e.target.value as 'Illinois' | 'Other') : undefined,
                  })
                  if (errorFieldId === 'incomeState') {
                    setErrorMessage('')
                    setErrorFieldId('')
                  }
                }}
                required
                className={`w-full max-w-xs px-4 py-2 border rounded-lg bg-white text-slate-900 focus:ring-2 focus:ring-brand-accent/40 focus:border-brand-accent ${
                  errorFieldId === 'incomeState' ? 'border-red-500' : 'border-slate-300'
                }`}
              >
                <option value="">Select income state</option>
                <option value="Illinois">Illinois</option>
                <option value="Other">Other</option>
              </select>
              {errorFieldId === 'incomeState' && (
                <p className="text-sm text-red-500 mt-1">{errorMessage}</p>
              )}
            </div>

            {formData.w2Forms.length === 0 && (
              <div>
                <button
                  data-add-w2-button
                  onClick={addW2Form}
                  className="flex items-center text-brand-accent font-semibold hover:text-sky-300 mb-4"
                  type="button"
                >
                  <svg
                    className="w-5 h-5 mr-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 4v16m8-8H4"
                    />
                  </svg>
                  Add W2 Form
                </button>
                {errorFieldId === 'w2Forms' && (
                  <p className="text-sm text-red-500 mb-2">{errorMessage}</p>
                )}
              </div>
            )}
            <div className="space-y-4">
              {formData.w2Forms.map((w2, index) => (
                <div
                  key={index}
                  className="border border-slate-300 rounded-lg p-4 bg-white relative"
                >
                  <h3 className="font-semibold text-slate-900 mb-4">
                    W2 Form {index + 1}
                  </h3>
                  {formData.w2Forms.length > 1 && (
                    <button
                      onClick={() => removeW2Form(index)}
                      className="absolute top-4 right-4 text-red-500 hover:text-red-700"
                      type="button"
                    >
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        />
                      </svg>
                    </button>
                  )}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Wages, tips, other compensation (Box 1) <span className="text-red-500">*</span>
                      </label>
                      <input
                        id={`wages-${index}`}
                        type="number"
                        step="0.01"
                        value={w2.wages === null || w2.wages === undefined ? '' : w2.wages}
                        onChange={(e) => {
                          const val = e.target.value === '' ? null : parseFloat(e.target.value)
                          updateW2Form(index, 'wages', isNaN(val as number) ? null : val)
                          if (errorFieldId === `wages-${index}`) {
                            setErrorMessage('')
                            setErrorFieldId('')
                          }
                        }}
                        onBlur={(e) => {
                          if (e.target.value === '' || e.target.value === null || e.target.value === undefined) {
                            updateW2Form(index, 'wages', 0)
                          }
                        }}
                        required
                        className={`w-full px-4 py-2 border rounded-lg bg-white text-slate-900 focus:ring-2 focus:ring-brand-accent/40 focus:border-brand-accent ${
                          errorFieldId === `wages-${index}` ? 'border-red-500' : 'border-slate-300'
                        }`}
                      />
                      {errorFieldId === `wages-${index}` && (
                        <p className="text-sm text-red-500 mt-1">{errorMessage}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Federal income tax withheld (Box 2)
                      </label>
                      <input
                        id={`federalTax-${index}`}
                        type="number"
                        step="0.01"
                        value={w2.federalTaxWithheld === null || w2.federalTaxWithheld === undefined ? '' : w2.federalTaxWithheld}
                        onChange={(e) => {
                          const val = e.target.value === '' ? null : parseFloat(e.target.value)
                          updateW2Form(index, 'federalTaxWithheld', isNaN(val as number) ? null : val)
                        }}
                        onBlur={(e) => {
                          if (e.target.value === '' || e.target.value === null || e.target.value === undefined) {
                            updateW2Form(index, 'federalTaxWithheld', 0)
                          }
                        }}
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg bg-white text-slate-900 focus:ring-2 focus:ring-brand-accent/40 focus:border-brand-accent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        State income tax (Box 17)
                      </label>
                      <input
                        id={`stateTax-${index}`}
                        type="number"
                        step="0.01"
                        value={w2.stateTaxWithheld === null || w2.stateTaxWithheld === undefined ? '' : w2.stateTaxWithheld}
                        onChange={(e) => {
                          const val = e.target.value === '' ? null : parseFloat(e.target.value)
                          updateW2Form(index, 'stateTaxWithheld', isNaN(val as number) ? null : val)
                        }}
                        onBlur={(e) => {
                          if (e.target.value === '' || e.target.value === null || e.target.value === undefined) {
                            updateW2Form(index, 'stateTaxWithheld', 0)
                          }
                        }}
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg bg-white text-slate-900 focus:ring-2 focus:ring-brand-accent/40 focus:border-brand-accent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Employer Identification Number (EIN) (Box b) <span className="text-red-500">*</span>
                      </label>
                      <input
                        id={`ein-${index}`}
                        type="text"
                        value={w2.ein}
                        onChange={(e) =>
                          handleEINChange(index, e.target.value)
                        }
                        placeholder="12-3456789"
                        maxLength={10}
                        required
                        className={`w-full px-4 py-2 border rounded-lg bg-white text-slate-900 focus:ring-2 focus:ring-brand-accent/40 focus:border-brand-accent ${
                          errorFieldId === `ein-${index}` ? 'border-red-500' : 'border-slate-300'
                        }`}
                      />
                      {errorFieldId === `ein-${index}` && (
                        <p className="text-sm text-red-500 mt-1">{errorMessage}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Social Security tax withheld (Box 4)
                      </label>
                      <input
                        id={`ssTax-${index}`}
                        type="number"
                        step="0.01"
                        value={w2.socialSecurityWithheld === null || w2.socialSecurityWithheld === undefined ? '' : w2.socialSecurityWithheld}
                        onChange={(e) => {
                          const val = e.target.value === '' ? null : parseFloat(e.target.value)
                          updateW2Form(index, 'socialSecurityWithheld', isNaN(val as number) ? null : val)
                        }}
                        onBlur={(e) => {
                          if (e.target.value === '' || e.target.value === null || e.target.value === undefined) {
                            updateW2Form(index, 'socialSecurityWithheld', 0)
                          }
                        }}
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg bg-white text-slate-900 focus:ring-2 focus:ring-brand-accent/40 focus:border-brand-accent"
                      />
                      <p className="text-xs text-slate-500 mt-1">
                        F-1 students with &lt;5 years in US are exempt from FICA
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Medicare tax withheld (Box 6)
                      </label>
                      <input
                        id={`medicareTax-${index}`}
                        type="number"
                        step="0.01"
                        value={w2.medicareWithheld === null || w2.medicareWithheld === undefined ? '' : w2.medicareWithheld}
                        onChange={(e) => {
                          const val = e.target.value === '' ? null : parseFloat(e.target.value)
                          updateW2Form(index, 'medicareWithheld', isNaN(val as number) ? null : val)
                        }}
                        onBlur={(e) => {
                          if (e.target.value === '' || e.target.value === null || e.target.value === undefined) {
                            updateW2Form(index, 'medicareWithheld', 0)
                          }
                        }}
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg bg-white text-slate-900 focus:ring-2 focus:ring-brand-accent/40 focus:border-brand-accent"
                      />
                      <p className="text-xs text-slate-500 mt-1">
                        F-1 students with &lt;5 years in US are exempt from FICA
                      </p>
                    </div>
                  </div>
                </div>
              ))}
              {formData.w2Forms.length > 0 && (
                <button
                  onClick={addW2Form}
                  className="flex items-center text-brand-accent font-semibold hover:text-sky-300"
                  type="button"
                >
                  <svg
                    className="w-5 h-5 mr-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 4v16m8-8H4"
                    />
                  </svg>
                  Add W2 Form
                </button>
              )}
            </div>
          </div>
        )}

        {/* Disclaimer about 1099 forms */}
        {formData.hadUSIncome && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <div className="flex items-start">
              <svg
                className="w-5 h-5 text-amber-600 mt-0.5 mr-2 flex-shrink-0"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                  clipRule="evenodd"
                />
              </svg>
              <p className="text-sm text-slate-700">
                <strong>Note:</strong> We currently only process W-2 forms. We do not process 1099-INT, 1099-MISC, or other 1099 forms at this time. If you have income from 1099 forms, please consult with a tax professional or file manually.
              </p>
            </div>
          </div>
        )}

        {/* Bank Details */}
        {formData.hadUSIncome && (
          <div>
            <h2 className="text-xl font-semibold text-slate-900 mb-4">
              Bank Details
            </h2>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
            <div className="flex items-start">
              <svg
                className="w-5 h-5 text-blue-600 mt-0.5 mr-2"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                  clipRule="evenodd"
                />
              </svg>
              <p className="text-sm text-slate-700">
                These bank details will only be used if you are eligible for a
                tax refund. If you owe taxes to the IRS, these details will not
                be included in your tax forms. Your tax liability (whether
                you&apos;ll receive a refund or owe taxes) will be calculated
                based on your income information and tax withholdings.
              </p>
            </div>
          </div>
          <p className="text-slate-600 mb-4">
            Please provide your banking information for tax refund deposit.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Account Number <span className="text-red-500">*</span>
              </label>
              <input
                id="accountNumber"
                type="text"
                value={formData.bankDetails.accountNumber}
                onChange={(e) => {
                  setFormData({
                    ...formData,
                    bankDetails: {
                      ...formData.bankDetails,
                      accountNumber: e.target.value,
                    },
                  })
                  if (errorFieldId === 'accountNumber') {
                    setErrorMessage('')
                    setErrorFieldId('')
                  }
                }}
                placeholder="Enter 8-17 digits"
                required
                className={`w-full px-4 py-2 border rounded-lg bg-white text-slate-900 focus:ring-2 focus:ring-brand-accent/40 focus:border-brand-accent ${
                  errorFieldId === 'accountNumber' ? 'border-red-500' : 'border-slate-300'
                }`}
              />
              {errorFieldId === 'accountNumber' && (
                <p className="text-sm text-red-500 mt-1">{errorMessage}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Routing Number <span className="text-red-500">*</span>
              </label>
              <input
                id="routingNumber"
                type="text"
                value={formData.bankDetails.routingNumber}
                onChange={(e) => {
                  setFormData({
                    ...formData,
                    bankDetails: {
                      ...formData.bankDetails,
                      routingNumber: e.target.value,
                    },
                  })
                  if (errorFieldId === 'routingNumber') {
                    setErrorMessage('')
                    setErrorFieldId('')
                  }
                }}
                placeholder="Enter 9 digits"
                required
                className={`w-full px-4 py-2 border rounded-lg bg-white text-slate-900 focus:ring-2 focus:ring-brand-accent/40 focus:border-brand-accent ${
                  errorFieldId === 'routingNumber' ? 'border-red-500' : 'border-slate-300'
                }`}
              />
              {errorFieldId === 'routingNumber' && (
                <p className="text-sm text-red-500 mt-1">{errorMessage}</p>
              )}
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Account Type <span className="text-red-500">*</span>
              </label>
              <div className="flex gap-6">
                <label className="flex items-center">
                  <input
                    id="accountType"
                    type="radio"
                    name="accountType"
                    value="checking"
                    checked={formData.bankDetails.accountType === 'checking'}
                    onChange={(e) => {
                      setFormData({
                        ...formData,
                        bankDetails: {
                          ...formData.bankDetails,
                          accountType: e.target.value as 'checking' | 'savings',
                        },
                      })
                      if (errorFieldId === 'accountType') {
                        setErrorMessage('')
                        setErrorFieldId('')
                      }
                    }}
                    required
                    className="w-4 h-4 text-brand-accent border-slate-300 focus:ring-brand-accent"
                  />
                  <span className="ml-2 text-slate-700">Checking</span>
                </label>
                <label className="flex items-center">
                  <input
                    id="accountType"
                    type="radio"
                    name="accountType"
                    value="savings"
                    checked={formData.bankDetails.accountType === 'savings'}
                    onChange={(e) => {
                      setFormData({
                        ...formData,
                        bankDetails: {
                          ...formData.bankDetails,
                          accountType: e.target.value as 'checking' | 'savings',
                        },
                      })
                      if (errorFieldId === 'accountType') {
                        setErrorMessage('')
                        setErrorFieldId('')
                      }
                    }}
                    required
                    className="w-4 h-4 text-brand-accent border-slate-300 focus:ring-brand-accent"
                  />
                  <span className="ml-2 text-slate-700">Savings</span>
                </label>
              </div>
            </div>
          </div>
          </div>
        )}
      </div>

      <div className="flex gap-4 mt-8">
        <button
          onClick={onPrevious}
          className="flex-1 bg-white border border-slate-300 text-slate-700 px-6 py-3 rounded-lg font-semibold hover:bg-slate-50 transition-colors"
        >
          Previous
        </button>
        {errorMessage && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-600">{errorMessage}</p>
          </div>
        )}
        <button
          type="submit"
          onClick={(e) => {
            e.preventDefault()
            setErrorMessage('')
            setErrorFieldId('')
            
            // Validate required fields before proceeding
            if (formData.hadUSIncome === undefined) {
              showFieldError('hadUSIncome', 'Please indicate whether you had income in 2025.')
              return
            }
            if (formData.hadUSIncome) {
              const ssnDigits = getSSNWithoutDashes(formData.ssn)
              if (!ssnDigits || ssnDigits.length !== 9) {
                showFieldError('ssn', 'Please enter a valid 9-digit Social Security Number.')
                return
              }
              if (!formData.incomeState) {
                showFieldError('incomeState', 'Please select an income state.')
                return
              }
              if (formData.w2Forms.length === 0) {
                const addButton = document.querySelector('[data-add-w2-button]')
                if (addButton) {
                  addButton.scrollIntoView({ behavior: 'smooth', block: 'center' })
                }
                showFieldError('w2Forms', 'Please add at least one W2 form.')
                return
              }
              
              // Normalize optional tax fields to 0 before validation
              const normalizedW2Forms = formData.w2Forms.map(w2 => ({
                ...w2,
                federalTaxWithheld: w2.federalTaxWithheld === null || w2.federalTaxWithheld === undefined ? 0 : w2.federalTaxWithheld,
                stateTaxWithheld: w2.stateTaxWithheld === null || w2.stateTaxWithheld === undefined ? 0 : w2.stateTaxWithheld,
                socialSecurityWithheld: w2.socialSecurityWithheld === null || w2.socialSecurityWithheld === undefined ? 0 : w2.socialSecurityWithheld,
                medicareWithheld: w2.medicareWithheld === null || w2.medicareWithheld === undefined ? 0 : w2.medicareWithheld,
              }))
              
              // Update form data with normalized values
              setFormData({ ...formData, w2Forms: normalizedW2Forms })
              
              // Validate all W2 forms
              for (let i = 0; i < normalizedW2Forms.length; i++) {
                const w2 = normalizedW2Forms[i]
                if (!w2.ein || w2.ein.trim() === '') {
                  showFieldError(`ein-${i}`, `Please enter the Employer Identification Number (EIN) for W2 Form ${i + 1}.`)
                  return
                }
                if (!isValidEIN(w2.ein)) {
                  showFieldError(`ein-${i}`, `EIN must be exactly 9 digits in the format 12-3456789 for W2 Form ${i + 1}.`)
                  return
                }
                // Validate required number fields - only wages is mandatory
                if (w2.wages === null || w2.wages === undefined) {
                  showFieldError(`wages-${i}`, `Please enter wages for W2 Form ${i + 1}.`)
                  return
                }
              }
              // Validate bank details
              if (!formData.bankDetails.accountNumber || formData.bankDetails.accountNumber.trim() === '') {
                showFieldError('accountNumber', 'Please enter your bank account number.')
                return
              }
              if (!formData.bankDetails.routingNumber || formData.bankDetails.routingNumber.trim() === '') {
                showFieldError('routingNumber', 'Please enter your bank routing number.')
                return
              }
              if (!formData.bankDetails.accountType) {
                showFieldError('accountType', 'Please select an account type.')
                return
              }
            }
            onUpdate(formData)
            onNext()
          }}
          className="flex-1 bg-brand-accent text-slate-900 px-6 py-3 rounded-lg font-semibold hover:bg-sky-300 transition-colors"
        >
          Next
        </button>
      </div>
    </div>
  )
}
