'use client'

import { useState, useEffect, useRef } from 'react'
import DatePicker from 'react-datepicker'
import 'react-datepicker/dist/react-datepicker.css'
import { ResidencyInfo, Visit } from '@/types/form'

interface Step3ResidencyInfoProps {
  data?: Partial<ResidencyInfo>
  onUpdate: (data: ResidencyInfo) => void
  onNext: () => void
  onPrevious: () => void
}

export default function Step3ResidencyInfo({
  data,
  onUpdate,
  onNext,
  onPrevious,
}: Step3ResidencyInfoProps) {
  const [formData, setFormData] = useState<ResidencyInfo>({
    dateOfFirstVisit: data?.dateOfFirstVisit ?? '',
    visits:
      data?.visits?.length > 0
        ? data.visits
        : [{ visaType: 'F1', entryDate: '', exitDate: '' }],
    hasFiledTaxReturnBefore: data?.hasFiledTaxReturnBefore ?? false,
    yearFiled: data?.yearFiled ?? '',
    formUsed: data?.formUsed ?? '',
  })

  const [firstVisitDate, setFirstVisitDate] = useState<Date | null>(
    formData.dateOfFirstVisit ? new Date(formData.dateOfFirstVisit) : null
  )
  const [isStillInUS, setIsStillInUS] = useState(false)
  const formDataRef = useRef(formData)
  formDataRef.current = formData

  useEffect(() => {
    onUpdate(formData)
  }, [formData, onUpdate])

  const handleFirstVisitDateChange = (date: Date | null) => {
    setFirstVisitDate(date)
    if (date) {
      const formatted = date.toISOString().split('T')[0]
      setFormData((prev) => {
        const updatedVisits =
          prev.visits.length > 0
            ? [
                { ...prev.visits[0], entryDate: formatted },
                ...prev.visits.slice(1),
              ]
            : prev.visits
        return { ...prev, dateOfFirstVisit: formatted, visits: updatedVisits }
      })
    } else {
      setFormData((prev) => ({ ...prev, dateOfFirstVisit: '' }))
    }
  }

  const handleVisitDateChange = (
    index: number,
    field: 'entryDate' | 'exitDate',
    date: Date | null
  ) => {
    const updatedVisits = [...formData.visits]
    if (date) {
      updatedVisits[index] = {
        ...updatedVisits[index],
        [field]: date.toISOString().split('T')[0],
      }
    } else {
      updatedVisits[index] = {
        ...updatedVisits[index],
        [field]: '',
      }
    }
    setFormData({ ...formData, visits: updatedVisits })
  }

  const addVisit = () => {
    setFormData({
      ...formData,
      visits: [
        ...formData.visits,
        {
          visaType: 'F1',
          entryDate: '',
          exitDate: '',
        },
      ],
    })
  }

  const removeVisit = (index: number) => {
    const updatedVisits = formData.visits.filter((_, i) => i !== index)
    setFormData({ ...formData, visits: updatedVisits })
  }

  const getVisitDate = (dateString: string): Date | null => {
    return dateString ? new Date(dateString) : null
  }

  return (
    <div>
      <h1 className="text-3xl font-bold text-slate-900 mb-4">
        Residency Information
      </h1>
      <p className="text-slate-600 mb-8">
        Please complete all required fields. Fields marked with <span className="text-red-500">*</span> are mandatory.
      </p>

      <div className="space-y-6">
        {/* Date of First Visit */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Date of First Visit to the US on F1 Visa <span className="text-red-500">*</span>
          </label>
          <DatePicker
            selected={firstVisitDate}
            onChange={handleFirstVisitDateChange}
            dateFormat="dd-MM-yyyy"
            placeholderText="dd-mm-yyyy"
            required
            className="w-full px-4 py-2 border border-slate-300 rounded-lg bg-white text-slate-900 focus:ring-2 focus:ring-brand-accent/40 focus:border-brand-accent"
          />
        </div>

        {/* Visits to the US */}
        <div>
          <h2 className="text-xl font-semibold text-slate-900 mb-4">
            Visits to the US from 2022 onwards
          </h2>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
            <h3 className="font-semibold text-slate-900 mb-2">
              How to fill this section:
            </h3>
            <ul className="list-disc pl-5 text-sm text-slate-700 space-y-1">
              <li>List all your US entries and exits during 2022-2024</li>
              <li>
                Include both entry and exit dates for each completed trip
              </li>
              <li>
                For your most recent entry: if you were still in the US on
                December 31, 2024, leave the exit date empty
              </li>
            </ul>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
            <div className="flex items-start">
              <svg
                className="w-5 h-5 text-yellow-600 mt-0.5 mr-2"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                  clipRule="evenodd"
                />
              </svg>
              <div>
                <p className="text-sm text-slate-700">
                  <strong>Need help finding your travel dates?</strong> Access
                  your complete travel history on the{' '}
                  <a
                    href="https://i94.cbp.dhs.gov/I94/#/home"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-brand-accent underline"
                  >
                    Official I-94 Website
                  </a>
                  . This official US Customs and Border Protection site shows
                  all your entries and exits.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            {formData.visits.map((visit, index) => (
              <div
                key={index}
                className="border border-slate-300 rounded-lg bg-white p-4 relative"
              >
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Visa Type <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={visit.visaType}
                      onChange={(e) => {
                        const updatedVisits = [...formData.visits]
                        updatedVisits[index] = {
                          ...updatedVisits[index],
                          visaType: e.target.value,
                        }
                        setFormData({ ...formData, visits: updatedVisits })
                      }}
                      required
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg bg-white text-slate-900 focus:ring-2 focus:ring-brand-accent/40 focus:border-brand-accent"
                    >
                      <option value="">Select visa type</option>
                      <option value="F1">F1</option>
                      <option value="J1">J1</option>
                      <option value="M1">M1</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      US Entry Date <span className="text-red-500">*</span>
                    </label>
                    <DatePicker
                      selected={getVisitDate(visit.entryDate)}
                      onChange={(date) =>
                        handleVisitDateChange(index, 'entryDate', date)
                      }
                      dateFormat="dd-MM-yyyy"
                      placeholderText="dd-mm-yyyy"
                      required
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg bg-white text-slate-900 focus:ring-2 focus:ring-brand-accent/40 focus:border-brand-accent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1 flex items-center">
                      US Leave Date
                      {index === formData.visits.length - 1 ? (
                        <>
                          {!isStillInUS && <span className="text-red-500 ml-1">*</span>}
                          <svg
                            className="w-4 h-4 ml-1 text-slate-500"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path
                              fillRule="evenodd"
                              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                              clipRule="evenodd"
                            />
                          </svg>
                        </>
                      ) : (
                        <span className="text-red-500 ml-1">*</span>
                      )}
                    </label>
                    <DatePicker
                      selected={getVisitDate(visit.exitDate || '')}
                      onChange={(date) =>
                        handleVisitDateChange(index, 'exitDate', date)
                      }
                      dateFormat="dd-MM-yyyy"
                      placeholderText="dd-mm-yyyy"
                      isClearable={index !== formData.visits.length - 1 || !isStillInUS}
                      disabled={index === formData.visits.length - 1 && isStillInUS}
                      required={index !== formData.visits.length - 1 || !isStillInUS}
                      className={`w-full px-4 py-2 border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-brand-accent/40 focus:border-brand-accent ${
                        index === formData.visits.length - 1 && isStillInUS
                          ? 'bg-slate-100 text-slate-400 cursor-not-allowed border-slate-200'
                          : 'bg-white'
                      }`}
                    />
                  </div>
                </div>
                <button
                  onClick={() => removeVisit(index)}
                  type="button"
                  className="absolute top-4 right-4 p-1 rounded text-red-500 hover:text-red-700 hover:bg-red-50"
                  title="Remove this visit"
                  aria-label="Remove this visit"
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
              </div>
            ))}
          </div>

          <button
            onClick={addVisit}
            className="mt-4 flex items-center text-brand-accent font-semibold hover:text-sky-300"
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
            Add Visit
          </button>
          
          {/* I am still in the US checkbox */}
          <div className="mt-4">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={isStillInUS}
                onChange={(e) => {
                  setIsStillInUS(e.target.checked)
                  if (e.target.checked && formData.visits.length > 0) {
                    // Clear exit date on last visit when checked
                    const updatedVisits = [...formData.visits]
                    const lastIndex = updatedVisits.length - 1
                    updatedVisits[lastIndex] = {
                      ...updatedVisits[lastIndex],
                      exitDate: '',
                    }
                    setFormData({ ...formData, visits: updatedVisits })
                  }
                }}
                className="w-5 h-5 text-brand-accent border-slate-300 rounded focus:ring-brand-accent"
              />
              <span className="ml-2 text-slate-700 font-medium">
                I am still in the US
              </span>
            </label>
          </div>
        </div>

        {/* Previous Tax Filing */}
        <div>
          <h2 className="text-xl font-semibold text-slate-900 mb-4">
            Previous Tax Filing
          </h2>
          <p className="text-slate-700 mb-4">
            Have you filed a US federal tax return before? (Form 8843 does not
            count as Tax Filing) <span className="text-red-500">*</span>
          </p>
          <div className="flex gap-6">
            <label className="flex items-center">
              <input
                type="radio"
                name="hasFiledTaxReturnBefore"
                checked={formData.hasFiledTaxReturnBefore === true}
                onChange={() =>
                  setFormData({ ...formData, hasFiledTaxReturnBefore: true })
                }
                required
                className="w-4 h-4 text-brand-accent border-slate-300 focus:ring-brand-accent"
              />
              <span className="ml-2 text-slate-700">Yes</span>
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                name="hasFiledTaxReturnBefore"
                checked={formData.hasFiledTaxReturnBefore === false}
                onChange={() =>
                  setFormData({ ...formData, hasFiledTaxReturnBefore: false })
                }
                required
                className="w-4 h-4 text-brand-accent border-slate-300 focus:ring-brand-accent"
              />
              <span className="ml-2 text-slate-700">No</span>
            </label>
          </div>

          {formData.hasFiledTaxReturnBefore && (
            <div className="mt-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Year Filed <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="e.g. 2024"
                  value={formData.yearFiled ?? ''}
                  onChange={(e) =>
                    setFormData({ ...formData, yearFiled: e.target.value })
                  }
                  required
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg bg-white text-slate-900 focus:ring-2 focus:ring-brand-accent/40 focus:border-brand-accent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Form Used <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.formUsed ?? '1040-NR'}
                  onChange={(e) =>
                    setFormData({ ...formData, formUsed: e.target.value })
                  }
                  required
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg bg-white text-slate-900 focus:ring-2 focus:ring-brand-accent/40 focus:border-brand-accent"
                >
                  <option value="1040-NR">1040-NR</option>
                </select>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="flex gap-4 mt-8">
        <button
          onClick={onPrevious}
          className="flex-1 bg-slate-50 border border-slate-300 text-slate-700 px-6 py-3 rounded-lg font-semibold hover:bg-slate-50 transition-colors"
        >
          Previous
        </button>
        <button
          type="submit"
          onClick={(e) => {
            e.preventDefault()
            const latest = formDataRef.current
            if (!firstVisitDate) {
              alert('Please enter the date of first visit.')
              return
            }
            if (latest.visits.some(v => !v.visaType || !v.entryDate)) {
              alert('Please fill in all required visit fields (Visa Type and Entry Date).')
              return
            }
            if (latest.visits.some((v, idx) =>
              idx !== latest.visits.length - 1 && !v.exitDate
            )) {
              alert('Please fill in exit dates for all visits except the last one (if still in US).')
              return
            }
            const yearFilled = (latest.yearFiled ?? '').trim().length > 0
            const formUsedValue = (latest.formUsed ?? '1040-NR').trim() || '1040-NR'
            if (latest.hasFiledTaxReturnBefore && (!yearFilled || !formUsedValue)) {
              alert('Please fill in Year Filed and Form Used if you have filed before.')
              return
            }
            const toUpdate = latest.hasFiledTaxReturnBefore && !(latest.formUsed ?? '').trim()
              ? { ...latest, formUsed: '1040-NR' }
              : latest
            onUpdate(toUpdate)
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
