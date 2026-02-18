'use client'

import { useState, useEffect } from 'react'
import { UniversityInfo } from '@/types/form'

interface Step2UniversityInfoProps {
  data?: Partial<UniversityInfo>
  onUpdate: (data: UniversityInfo) => void
  onNext: () => void
  onPrevious: () => void
}

const usStates = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'
]

export default function Step2UniversityInfo({
  data,
  onUpdate,
  onNext,
  onPrevious,
}: Step2UniversityInfoProps) {
  const [formData, setFormData] = useState<UniversityInfo>({
    universityName: data?.universityName ?? '',
    universityAddress: {
      address: data?.universityAddress?.address ?? '',
      addressLine2: data?.universityAddress?.addressLine2 ?? '',
      city: data?.universityAddress?.city ?? '',
      state: data?.universityAddress?.state ?? '',
      zipCode: data?.universityAddress?.zipCode ?? '',
    },
    universityContactNumber: data?.universityContactNumber ?? '',
    issAdvisorName: data?.issAdvisorName ?? '',
    issAdvisorAddress: {
      address: data?.issAdvisorAddress?.address ?? '',
      addressLine2: data?.issAdvisorAddress?.addressLine2 ?? '',
      city: data?.issAdvisorAddress?.city ?? '',
      state: data?.issAdvisorAddress?.state ?? '',
      zipCode: data?.issAdvisorAddress?.zipCode ?? '',
    },
    issAdvisorContactNumber: data?.issAdvisorContactNumber ?? '',
    sameAsUniversity: data?.sameAsUniversity ?? false,
  })

  useEffect(() => {
    onUpdate(formData)
  }, [formData, onUpdate])

  const handleSameAsUniversityChange = (checked: boolean) => {
    if (checked) {
      setFormData({
        ...formData,
        sameAsUniversity: true,
        issAdvisorAddress: {
          ...formData.universityAddress,
        },
      })
    } else {
      setFormData({
        ...formData,
        sameAsUniversity: false,
      })
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onNext()
  }

  return (
    <form onSubmit={handleSubmit}>
      <h1 className="text-3xl font-bold text-slate-900 mb-4">
        University/College Information
      </h1>
      <p className="text-slate-600 mb-8">
        Please complete all required fields. Fields marked (Optional) may be left blank.
      </p>

      <div className="space-y-6">
        {/* University Name */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            University Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            required
            value={formData.universityName}
            onChange={(e) =>
              setFormData({ ...formData, universityName: e.target.value })
            }
            className="w-full px-4 py-2 border border-slate-300 rounded-lg bg-white text-slate-900 focus:ring-2 focus:ring-brand-accent/40 focus:border-brand-accent"
          />
        </div>

        {/* University Address */}
        <div>
          <h2 className="text-xl font-semibold text-slate-900 mb-4">
            University Address
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Address <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.universityAddress.address}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    universityAddress: {
                      ...formData.universityAddress,
                      address: e.target.value,
                    },
                  })
                }
                className="w-full px-4 py-2 border border-slate-300 rounded-lg bg-white text-slate-900 focus:ring-2 focus:ring-brand-accent/40 focus:border-brand-accent"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Address Line 2 (Optional)
              </label>
              <input
                type="text"
                value={formData.universityAddress.addressLine2}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    universityAddress: {
                      ...formData.universityAddress,
                      addressLine2: e.target.value,
                    },
                  })
                }
                className="w-full px-4 py-2 border border-slate-300 rounded-lg bg-white text-slate-900 focus:ring-2 focus:ring-brand-accent/40 focus:border-brand-accent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                City <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.universityAddress.city}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    universityAddress: {
                      ...formData.universityAddress,
                      city: e.target.value,
                    },
                  })
                }
                className="w-full px-4 py-2 border border-slate-300 rounded-lg bg-white text-slate-900 focus:ring-2 focus:ring-brand-accent/40 focus:border-brand-accent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                State <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.universityAddress.state}
                required
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    universityAddress: {
                      ...formData.universityAddress,
                      state: e.target.value,
                    },
                  })
                }
                className="w-full px-4 py-2 border border-slate-300 rounded-lg bg-white text-slate-900 focus:ring-2 focus:ring-brand-accent/40 focus:border-brand-accent"
              >
                <option value="">Select a state</option>
                {usStates.map((state) => (
                  <option key={state} value={state}>
                    {state}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Zip Code <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.universityAddress.zipCode}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    universityAddress: {
                      ...formData.universityAddress,
                      zipCode: e.target.value,
                    },
                  })
                }
                placeholder="5 Digit Code"
                className="w-full px-4 py-2 border border-slate-300 rounded-lg bg-white text-slate-900 focus:ring-2 focus:ring-brand-accent/40 focus:border-brand-accent"
              />
            </div>
          </div>
        </div>

        {/* University Contact Number */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            University Contact Number <span className="text-red-500">*</span>
          </label>
          <input
            type="tel"
            required
            value={formData.universityContactNumber}
            onChange={(e) =>
              setFormData({
                ...formData,
                universityContactNumber: e.target.value,
              })
            }
            placeholder="Enter 10 digits"
            className="w-full px-4 py-2 border border-slate-300 rounded-lg bg-white text-slate-900 focus:ring-2 focus:ring-brand-accent/40 focus:border-brand-accent"
          />
        </div>

        {/* ISS Advisor Name */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Name of ISS Advisor/Director <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            required
            value={formData.issAdvisorName}
            onChange={(e) =>
              setFormData({ ...formData, issAdvisorName: e.target.value })
            }
            className="w-full px-4 py-2 border border-slate-300 rounded-lg bg-white text-slate-900 focus:ring-2 focus:ring-brand-accent/40 focus:border-brand-accent"
          />
          <p className="text-sm text-slate-500 mt-1">
            This information can be found in the i20 under School Information Section.
          </p>
        </div>

        {/* ISS Advisor Address */}
        <div>
          <div className="mb-4">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={formData.sameAsUniversity}
                onChange={(e) => handleSameAsUniversityChange(e.target.checked)}
                className="w-5 h-5 text-brand-accent border-slate-300 rounded focus:ring-brand-accent"
              />
              <span className="ml-2 text-sm font-medium text-slate-700">
                ISS Advisor/Director address is the same as University address
              </span>
            </label>
          </div>

          {!formData.sameAsUniversity && (
            <div>
              <h2 className="text-xl font-semibold text-slate-900 mb-4">
                ISS Advisor/Director Address
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Address <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required={!formData.sameAsUniversity}
                    value={formData.issAdvisorAddress.address}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        issAdvisorAddress: {
                          ...formData.issAdvisorAddress,
                          address: e.target.value,
                        },
                      })
                    }
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg bg-white text-slate-900 focus:ring-2 focus:ring-brand-accent/40 focus:border-brand-accent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    City <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required={!formData.sameAsUniversity}
                    value={formData.issAdvisorAddress.city}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        issAdvisorAddress: {
                          ...formData.issAdvisorAddress,
                          city: e.target.value,
                        },
                      })
                    }
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg bg-white text-slate-900 focus:ring-2 focus:ring-brand-accent/40 focus:border-brand-accent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    State <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.issAdvisorAddress.state}
                    required={!formData.sameAsUniversity}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        issAdvisorAddress: {
                          ...formData.issAdvisorAddress,
                          state: e.target.value,
                        },
                      })
                    }
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg bg-white text-slate-900 focus:ring-2 focus:ring-brand-accent/40 focus:border-brand-accent"
                  >
                    <option value="">Select a state</option>
                    {usStates.map((state) => (
                      <option key={state} value={state}>
                        {state}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Zip Code <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required={!formData.sameAsUniversity}
                    value={formData.issAdvisorAddress.zipCode}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        issAdvisorAddress: {
                          ...formData.issAdvisorAddress,
                          zipCode: e.target.value,
                        },
                      })
                    }
                    placeholder="5 Digit Code"
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg bg-white text-slate-900 focus:ring-2 focus:ring-brand-accent/40 focus:border-brand-accent"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ISS Advisor Contact Number */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            ISS Advisor/Director Contact Number <span className="text-red-500">*</span>
          </label>
          <input
            type="tel"
            required
            value={formData.issAdvisorContactNumber}
            onChange={(e) =>
              setFormData({
                ...formData,
                issAdvisorContactNumber: e.target.value,
              })
            }
            placeholder="Enter 10 digits"
            className="w-full px-4 py-2 border border-slate-300 rounded-lg bg-white text-slate-900 focus:ring-2 focus:ring-brand-accent/40 focus:border-brand-accent"
          />
        </div>
      </div>

      <div className="flex gap-4 mt-8">
        <button
          type="button"
          onClick={onPrevious}
          className="flex-1 bg-white border border-slate-300 text-slate-700 px-6 py-3 rounded-lg font-semibold hover:bg-slate-50 transition-colors"
        >
          Previous
        </button>
        <button
          type="submit"
          className="flex-1 bg-brand-accent text-slate-900 px-6 py-3 rounded-lg font-semibold hover:bg-sky-300 transition-colors"
        >
          Next
        </button>
      </div>
    </form>
  )
}
