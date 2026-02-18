'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function DisclaimerPage() {
  const [accepted, setAccepted] = useState(false)
  const router = useRouter()

  const handleStart = () => {
    if (accepted) {
      router.push('/form')
    }
  }

  return (
    <div className="min-h-screen bg-white py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-4xl font-bold text-gray-900 mb-8 text-center">
          Disclaimer
        </h1>
        
        <div className="bg-white border border-silver rounded-lg p-8 mb-8 shadow-sm">
          <div className="prose max-w-none text-gray-700 space-y-4">
            <p>
              By using this tax preparation service, you acknowledge and agree to the following:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                You are filing as a <strong>single filer</strong>. This service does not support married filing jointly, head of household, or other filing statuses.
              </li>
              <li>
                You are an <strong>F-1 student</strong> and a <strong>citizen of India</strong>. This service is intended for Indian F-1 students in the U.S.
              </li>
              <li>
                We <strong>do not process interest income</strong> (e.g., bank interest, 1099-INT). We only process W-2 wage income. If you have interest or other income, consult a tax professional or file manually for those items.
              </li>
              <li>
                We are not a tax advisory service and do not provide tax advice. Consult a qualified tax professional if you have questions.
              </li>
              <li>
                You are responsible for reviewing all information before submitting your tax forms to the IRS, and you must ensure all information entered is accurate and complete.
              </li>
              <li>
                Information you provide is used only to generate your tax forms and is not stored permanently.
              </li>
            </ul>
            <p className="mt-6">
              By proceeding, you confirm that you have read and understood this disclaimer and agree to use this service at your own discretion.
            </p>
          </div>
        </div>

        <div className="flex items-center mb-8">
          <input
            type="checkbox"
            id="accept"
            checked={accepted}
            onChange={(e) => setAccepted(e.target.checked)}
            className="w-5 h-5 text-primary border-gray-300 rounded focus:ring-primary"
          />
          <label htmlFor="accept" className="ml-3 text-gray-700">
            I have read and agree to the disclaimer
          </label>
        </div>

        <div className="flex gap-4">
          <Link
            href="/"
            className="flex-1 bg-white border border-silver text-gray-700 px-6 py-3 rounded-lg font-semibold hover:bg-gray-50 transition-colors text-center"
          >
            Back
          </Link>
          <button
            onClick={handleStart}
            disabled={!accepted}
            className={`flex-1 px-6 py-3 rounded-lg font-semibold transition-colors ${
              accepted
                ? 'bg-primary text-white hover:bg-green-600'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            Start Filing
          </button>
        </div>
      </div>
    </div>
  )
}
