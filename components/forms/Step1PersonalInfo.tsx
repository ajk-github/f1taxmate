'use client'

import { useState, useEffect } from 'react'
import DatePicker from 'react-datepicker'
import 'react-datepicker/dist/react-datepicker.css'
import { PersonalInfo } from '@/types/form'

interface Step1PersonalInfoProps {
  data?: Partial<PersonalInfo>
  onUpdate: (data: PersonalInfo) => void
  onNext: () => void
  onPrevious: () => void
}

const visaTypes = ['F1', 'J1', 'M1', 'Other']
const occupationTypes = ['Student'] as const

const usStates = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'
]

export default function Step1PersonalInfo({
  data,
  onUpdate,
  onNext,
  onPrevious,
}: Step1PersonalInfoProps) {
  const [formData, setFormData] = useState<PersonalInfo>({
    firstName: data?.firstName ?? '',
    lastName: data?.lastName ?? '',
    dateOfBirth: data?.dateOfBirth ?? '',
    phone: data?.phone ?? '',
    email: data?.email ?? '',
    passportNumber: data?.passportNumber ?? '',
    visaType: data?.visaType ?? 'F1',
    occupationType: (data?.occupationType as 'Student') || 'Student',
    usAddress: {
      address: data?.usAddress?.address ?? '',
      addressLine2: data?.usAddress?.addressLine2 ?? '',
      city: data?.usAddress?.city ?? '',
      state: data?.usAddress?.state ?? '',
      county: data?.usAddress?.county ?? '',
      zipCode: data?.usAddress?.zipCode ?? '',
    },
    foreignAddress: {
      addressLine1: data?.foreignAddress?.addressLine1 ?? '',
      addressLine2: data?.foreignAddress?.addressLine2 ?? '',
      city: data?.foreignAddress?.city ?? '',
      stateProvince: data?.foreignAddress?.stateProvince ?? '',
      postalCode: data?.foreignAddress?.postalCode ?? '',
      country: data?.foreignAddress?.country ?? '',
    },
  })

  const [dobDate, setDobDate] = useState<Date | null>(
    formData.dateOfBirth ? new Date(formData.dateOfBirth) : null
  )

  useEffect(() => {
    onUpdate(formData)
  }, [formData, onUpdate])

  const handleDateChange = (date: Date | null) => {
    setDobDate(date)
    if (date) {
      const formatted = date.toISOString().split('T')[0]
      setFormData({ ...formData, dateOfBirth: formatted })
    }
  }

  const formatDateForDisplay = (dateString: string) => {
    if (!dateString) return ''
    const date = new Date(dateString)
    const day = String(date.getDate()).padStart(2, '0')
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const year = date.getFullYear()
    return `${day}-${month}-${year}`
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.dateOfBirth || !dobDate) return
    onNext()
  }

  return (
    <form onSubmit={handleSubmit}>
      <h1 className="text-3xl font-bold text-slate-900 mb-4">
        Personal Information
      </h1>
      <p className="text-slate-600 mb-8">
        Please complete all required fields. Fields marked (Optional) may be left blank.
      </p>

      <div className="space-y-6">
        {/* Personal Information */}
        <div>
          <h2 className="text-xl font-semibold text-slate-900 mb-4">
            Personal Information
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                First Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.firstName}
                onChange={(e) =>
                  setFormData({ ...formData, firstName: e.target.value })
                }
                className="w-full px-4 py-2 border border-slate-300 rounded-lg bg-white text-slate-900 focus:ring-2 focus:ring-brand-accent/40 focus:border-brand-accent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Last Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.lastName}
                onChange={(e) =>
                  setFormData({ ...formData, lastName: e.target.value })
                }
                className="w-full px-4 py-2 border border-slate-300 rounded-lg bg-white text-slate-900 focus:ring-2 focus:ring-brand-accent/40 focus:border-brand-accent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Date of Birth <span className="text-red-500">*</span>
              </label>
              <DatePicker
                selected={dobDate}
                onChange={handleDateChange}
                dateFormat="dd-MM-yyyy"
                placeholderText="dd-mm-yyyy"
                required
                className="w-full px-4 py-2 border border-slate-300 rounded-lg bg-white text-slate-900 focus:ring-2 focus:ring-brand-accent/40 focus:border-brand-accent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Phone <span className="text-red-500">*</span>
              </label>
              <input
                type="tel"
                required
                value={formData.phone}
                onChange={(e) =>
                  setFormData({ ...formData, phone: e.target.value })
                }
                placeholder="Enter 10 Digits"
                className="w-full px-4 py-2 border border-slate-300 rounded-lg bg-white text-slate-900 focus:ring-2 focus:ring-brand-accent/40 focus:border-brand-accent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Email <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                className="w-full px-4 py-2 border border-slate-300 rounded-lg bg-white text-slate-900 focus:ring-2 focus:ring-brand-accent/40 focus:border-brand-accent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Passport Number <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.passportNumber}
                onChange={(e) =>
                  setFormData({ ...formData, passportNumber: e.target.value })
                }
                className="w-full px-4 py-2 border border-slate-300 rounded-lg bg-white text-slate-900 focus:ring-2 focus:ring-brand-accent/40 focus:border-brand-accent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Visa Type <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.visaType}
                onChange={(e) =>
                  setFormData({ ...formData, visaType: e.target.value })
                }
                required
                className="w-full px-4 py-2 border border-slate-300 rounded-lg bg-white text-slate-900 focus:ring-2 focus:ring-brand-accent/40 focus:border-brand-accent"
              >
                <option value="">Select visa type</option>
                {visaTypes.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Occupation Type <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.occupationType}
                onChange={(e) =>
                  setFormData({ ...formData, occupationType: e.target.value as 'Student' })
                }
                required
                className="w-full px-4 py-2 border border-slate-300 rounded-lg bg-white text-slate-900 focus:ring-2 focus:ring-brand-accent/40 focus:border-brand-accent"
              >
                {occupationTypes.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* US Address */}
        <div>
          <h2 className="text-xl font-semibold text-slate-900 mb-4">
            US Address
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Address <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.usAddress.address}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    usAddress: { ...formData.usAddress, address: e.target.value },
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
                value={formData.usAddress.addressLine2}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    usAddress: {
                      ...formData.usAddress,
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
                value={formData.usAddress.city}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    usAddress: { ...formData.usAddress, city: e.target.value },
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
                value={formData.usAddress.state}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    usAddress: { ...formData.usAddress, state: e.target.value },
                  })
                }
                required
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
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">
                County <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.usAddress.county ?? ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    usAddress: { ...formData.usAddress, county: e.target.value },
                  })
                }
                placeholder="e.g. Cook"
                className="w-full px-4 py-2 border border-slate-300 rounded-lg bg-white text-slate-900 focus:ring-2 focus:ring-brand-accent/40 focus:border-brand-accent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Zip Code <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.usAddress.zipCode}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    usAddress: {
                      ...formData.usAddress,
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

        {/* Foreign Address */}
        <div>
          <h2 className="text-xl font-semibold text-slate-900 mb-4">
            Foreign Address
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Address Line 1 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.foreignAddress.addressLine1}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    foreignAddress: {
                      ...formData.foreignAddress,
                      addressLine1: e.target.value,
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
                value={formData.foreignAddress.addressLine2}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    foreignAddress: {
                      ...formData.foreignAddress,
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
                value={formData.foreignAddress.city}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    foreignAddress: {
                      ...formData.foreignAddress,
                      city: e.target.value,
                    },
                  })
                }
                className="w-full px-4 py-2 border border-slate-300 rounded-lg bg-white text-slate-900 focus:ring-2 focus:ring-brand-accent/40 focus:border-brand-accent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                State/Province (Optional)
              </label>
              <input
                type="text"
                value={formData.foreignAddress.stateProvince}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    foreignAddress: {
                      ...formData.foreignAddress,
                      stateProvince: e.target.value,
                    },
                  })
                }
                className="w-full px-4 py-2 border border-slate-300 rounded-lg bg-white text-slate-900 focus:ring-2 focus:ring-brand-accent/40 focus:border-brand-accent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Postal Code/Zip Code (Optional)
              </label>
              <input
                type="text"
                value={formData.foreignAddress.postalCode}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    foreignAddress: {
                      ...formData.foreignAddress,
                      postalCode: e.target.value,
                    },
                  })
                }
                className="w-full px-4 py-2 border border-slate-300 rounded-lg bg-white text-slate-900 focus:ring-2 focus:ring-brand-accent/40 focus:border-brand-accent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Country <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.foreignAddress.country}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    foreignAddress: {
                      ...formData.foreignAddress,
                      country: e.target.value,
                    },
                  })
                }
                className="w-full px-4 py-2 border border-slate-300 rounded-lg bg-white text-slate-900 focus:ring-2 focus:ring-brand-accent/40 focus:border-brand-accent"
              />
            </div>
          </div>
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
