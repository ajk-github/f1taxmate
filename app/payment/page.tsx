'use client'

import { useEffect, useState, useMemo, useCallback, useRef } from 'react'
import Link from 'next/link'
import { loadStripe } from '@stripe/stripe-js'
import {
  Elements,
  CardElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js'
import type { FormData as FormDataType } from '@/types/form'
import type { FormData } from '@/types/form'
import {
  getApplicableProducts,
  getRefundByProduct,
  type FormProductId,
  type ProductOption,
} from '@/lib/payment/products'
import type { TaxCalculationResult } from '@/lib/tax-calculation'
import { getMinimalTaxResultFor8843 } from '@/lib/tax-calculation'
import { createZipFromPaidProducts } from '@/lib/form-generation'

const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || 'pk_test_placeholder'
)

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => {
      const dataUrl = reader.result as string
      resolve(dataUrl.split(',')[1] || '')
    }
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

function buildCompleteFormData(formData: FormDataType): FormData {
  return {
    personalInfo: {
      firstName: formData.personalInfo?.firstName || '',
      lastName: formData.personalInfo?.lastName || '',
      dateOfBirth: formData.personalInfo?.dateOfBirth || '',
      phone: formData.personalInfo?.phone || '',
      email: formData.personalInfo?.email || '',
      passportNumber: formData.personalInfo?.passportNumber || '',
      visaType: formData.personalInfo?.visaType || 'F1',
      occupationType: (formData.personalInfo?.occupationType as 'Student') || 'Student',
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
    incomeInfo: formData.incomeInfo!,
  }
}

function PaymentSuccessScreen({
  formData,
  taxResult,
  paidProductIds,
}: {
  formData: FormDataType
  taxResult: TaxCalculationResult | null
  paidProductIds: FormProductId[]
}) {
  const userEmail = formData.personalInfo?.email?.trim() || ''
  const effectiveTaxResult = taxResult ?? getMinimalTaxResultFor8843()
  const autoSendStartedRef = useRef(false)

  const [autoSendStatus, setAutoSendStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  const [autoSendError, setAutoSendError] = useState<string | null>(null)
  const [zipBlob, setZipBlob] = useState<Blob | null>(null)
  const [downloadStatus, setDownloadStatus] = useState<'idle' | 'generating' | 'done' | 'error'>('idle')
  const [downloadError, setDownloadError] = useState<string | null>(null)
  const [otherEmail, setOtherEmail] = useState('')
  const [sendOtherStatus, setSendOtherStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  const [sendOtherError, setSendOtherError] = useState<string | null>(null)

  const generateZip = useCallback(async (): Promise<Blob> => {
    const completeFormData = buildCompleteFormData(formData)
    return await createZipFromPaidProducts(paidProductIds, completeFormData, effectiveTaxResult)
  }, [formData, effectiveTaxResult, paidProductIds])

  useEffect(() => {
    if (!userEmail || autoSendStartedRef.current) return
    autoSendStartedRef.current = true
    setAutoSendStatus('sending')
    generateZip()
      .then(async (blob) => {
        setZipBlob(blob)
        const zipBase64 = await blobToBase64(blob)
        const res = await fetch('/api/send-forms', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ to: userEmail, zipBase64 }),
        })
        const data = await res.json().catch(() => ({}))
        if (res.ok) setAutoSendStatus('sent')
        else {
          setAutoSendStatus('error')
          setAutoSendError(data.error || 'Failed to send email')
        }
      })
      .catch((err) => {
        setAutoSendStatus('error')
        setAutoSendError(err?.message || 'Failed to prepare or send forms')
      })
  }, [userEmail, generateZip])

  const handleDownload = async () => {
    setDownloadError(null)
    setDownloadStatus('generating')
    try {
      const blob = zipBlob ?? await generateZip()
      if (!zipBlob) setZipBlob(blob)
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `tax-forms-${new Date().getFullYear()}.zip`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
      setDownloadStatus('done')
    } catch (err) {
      setDownloadError(err instanceof Error ? err.message : 'Download failed')
      setDownloadStatus('error')
    }
  }

  const handleSendToOther = async () => {
    const email = otherEmail.trim()
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setSendOtherError('Please enter a valid email address')
      setSendOtherStatus('error')
      return
    }
    setSendOtherError(null)
    setSendOtherStatus('sending')
    try {
      const blob = zipBlob ?? await generateZip()
      if (!zipBlob) setZipBlob(blob)
      const zipBase64 = await blobToBase64(blob)
      const res = await fetch('/api/send-forms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: email, zipBase64 }),
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok) {
        setSendOtherStatus('sent')
        setOtherEmail('')
      } else {
        setSendOtherStatus('error')
        setSendOtherError(data.error || 'Failed to send email')
      }
    } catch (err) {
      setSendOtherStatus('error')
      setSendOtherError(err instanceof Error ? err.message : 'Failed to send')
    }
  }

  return (
    <div className="space-y-8">
      <div className="text-center">
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
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Payment Successful!
        </h2>
        <p className="text-gray-600">
          Your tax forms have been prepared.
        </p>
      </div>

      <div className="rounded-lg border-2 border-amber-400 bg-amber-50 p-4">
        <div className="flex gap-3">
          <svg
            className="h-6 w-6 shrink-0 text-amber-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
          <div className="text-sm text-amber-900">
            <p className="font-semibold mb-1">Important — please read</p>
            <p className="mb-2">
              We do not store any of your data. Your forms are only available on this screen right now.
            </p>
            <p className="mb-2">
              Please <strong>download your forms</strong>, <strong>send them to your email</strong> if you haven’t already, and <strong>confirm you have them</strong> before leaving this page.
            </p>
            <p className="font-medium">
              Once you navigate away, you will not be able to access these forms again and would need to pay again to generate them.
            </p>
          </div>
        </div>
      </div>

      {userEmail && (
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
          <p className="font-medium text-gray-900 mb-1">Forms sent to your email</p>
          {autoSendStatus === 'sending' && (
            <p className="text-sm text-gray-600">Sending to {userEmail}…</p>
          )}
          {autoSendStatus === 'sent' && (
            <p className="text-sm text-green-700">Sent to {userEmail}</p>
          )}
          {autoSendStatus === 'error' && (
            <p className="text-sm text-red-600">
              Could not send to {userEmail}. {autoSendError} Use the download button or send to another email below.
            </p>
          )}
        </div>
      )}

      <div>
        <button
          type="button"
          onClick={handleDownload}
          disabled={downloadStatus === 'generating'}
          className="w-full bg-primary text-white px-6 py-3 rounded-lg font-semibold hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {downloadStatus === 'generating' ? 'Preparing download…' : 'Download tax forms'}
        </button>
        {downloadError && (
          <p className="text-red-600 text-sm mt-2">{downloadError}</p>
        )}
      </div>

      <div className="border-t border-gray-200 pt-6">
        <p className="font-medium text-gray-900 mb-2">Send forms to another email</p>
        <div className="flex flex-wrap gap-2">
          <input
            type="email"
            value={otherEmail}
            onChange={(e) => {
              setOtherEmail(e.target.value)
              setSendOtherError(null)
            }}
            placeholder="Email address"
            className="flex-1 min-w-[200px] px-3 py-2 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-primary focus:border-primary"
          />
          <button
            type="button"
            onClick={handleSendToOther}
            disabled={sendOtherStatus === 'sending'}
            className="px-4 py-2 rounded-lg font-medium bg-gray-900 text-white hover:bg-gray-800 transition-colors disabled:opacity-50"
          >
            {sendOtherStatus === 'sending' ? 'Sending…' : 'Send docs'}
          </button>
        </div>
        {sendOtherStatus === 'sent' && (
          <p className="text-green-600 text-sm mt-2">Forms sent successfully.</p>
        )}
        {sendOtherStatus === 'error' && sendOtherError && (
          <p className="text-red-600 text-sm mt-2">{sendOtherError}</p>
        )}
      </div>
    </div>
  )
}

function CheckoutForm({
  total,
  selectedProductIds,
  onSuccess,
}: {
  total: number
  selectedProductIds: FormProductId[]
  onSuccess: () => void
}) {
  const stripe = useStripe()
  const elements = useElements()
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()

    if (!stripe || !elements) return

    setProcessing(true)
    setError(null)

    const cardElement = elements.getElement(CardElement)
    if (!cardElement) {
      setError('Card element not found')
      setProcessing(false)
      return
    }

    try {
      const amountCents = Math.round(total * 100)
      const res = await fetch('/api/create-payment-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amountCents,
          selectedProductIds,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data.error || 'Unable to start payment')
        setProcessing(false)
        return
      }
      const clientSecret = data.clientSecret
      if (!clientSecret) {
        setError('Invalid response from server')
        setProcessing(false)
        return
      }

      const { error: confirmError } = await stripe.confirmCardPayment(clientSecret, {
        payment_method: { card: cardElement },
      })
      if (confirmError) {
        setError(confirmError.message || 'Payment failed')
        setProcessing(false)
        return
      }
      onSuccess()
    } catch {
      setError('An unexpected error occurred')
    } finally {
      setProcessing(false)
    }
  }

  const totalFormatted = total.toFixed(2)

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Payment Information
        </h2>
        <div className="border border-gray-300 rounded-lg p-4">
          <CardElement
            options={{
              style: {
                base: {
                  fontSize: '16px',
                  color: '#424770',
                  '::placeholder': { color: '#aab7c4' },
                },
                invalid: { color: '#9e2146' },
              },
            }}
          />
        </div>
        {error && (
          <p className="text-red-600 text-sm mt-2">{error}</p>
        )}
      </div>

      <div className="bg-gray-50 rounded-lg p-4">
        <div className="flex justify-between items-center pt-2 border-t border-gray-300">
          <span className="text-lg font-semibold text-gray-900">Total</span>
          <span className="text-lg font-bold text-gray-900">
            ${totalFormatted}
          </span>
        </div>
      </div>

      <button
        type="submit"
        disabled={!stripe || processing}
        className={`w-full bg-primary text-white px-6 py-3 rounded-lg font-semibold hover:bg-green-600 transition-colors ${
          !stripe || processing ? 'opacity-50 cursor-not-allowed' : ''
        }`}
      >
        {processing ? 'Processing...' : `Pay $${totalFormatted}`}
      </button>
    </form>
  )
}

export default function PaymentPage() {
  const [formData, setFormData] = useState<FormDataType | null>(null)
  const [taxResult, setTaxResult] = useState<TaxCalculationResult | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<FormProductId>>(new Set())
  const [mounted, setMounted] = useState(false)
  const [paymentSuccess, setPaymentSuccess] = useState(false)

  const applicableProducts = useMemo(
    () => getApplicableProducts(formData),
    [formData]
  )

  const refundByProduct = useMemo(
    () => getRefundByProduct(formData, taxResult),
    [formData, taxResult]
  )

  const total = useMemo(() => {
    let sum = 0
    applicableProducts.forEach((p) => {
      if (selectedIds.has(p.id)) sum += p.price
    })
    return sum
  }, [applicableProducts, selectedIds])

  const [promoCode, setPromoCode] = useState('')
  const [appliedPromo, setAppliedPromo] = useState<{ code: string; discount: number } | null>(null)
  const [promoError, setPromoError] = useState<string | null>(null)

  const finalTotal = Math.max(0, total - (appliedPromo?.discount ?? 0))

  const handleApplyPromo = () => {
    setPromoError(null)
    const code = promoCode.trim().toUpperCase()
    if (!code) {
      setPromoError('Enter a promo code')
      return
    }
    // Promo codes (in production, validate on backend)
    let discount: number | null = null
    let error: string | null = null

    if (code === 'SAVE10OVER50') {
      // 10% off if total is greater than $50
      if (total > 50) {
        discount = total * 0.1
      } else {
        error = 'This promo code requires a total greater than $50'
      }
    } else if (code === 'GUNTURKIMIRCHI') {
      // 100% off (free)
      discount = total
    } else if (code === 'SAVE10') {
      // 10% off (no minimum)
      discount = total * 0.1
    } else if (code === 'SAVE5') {
      // $5 off
      discount = 5
    } else if (code === 'F1TAX') {
      // $2.99 off
      discount = 2.99
    } else {
      error = 'Invalid or expired promo code'
    }

    if (error) {
      setPromoError(error)
      setAppliedPromo(null)
    } else if (discount != null) {
      setAppliedPromo({ code, discount })
    } else {
      setPromoError('Invalid or expired promo code')
      setAppliedPromo(null)
    }
  }

  useEffect(() => {
    const stored = typeof window !== 'undefined' ? sessionStorage.getItem('formData') : null
    if (!stored) {
      setMounted(true)
      return
    }
    try {
      const parsed = JSON.parse(stored) as FormDataType
      setFormData(parsed)
      const products = getApplicableProducts(parsed)
      setSelectedIds(new Set(products.map((p) => p.id)))
      const taxStored = sessionStorage.getItem('taxResult')
      if (taxStored) {
        try {
          setTaxResult(JSON.parse(taxStored) as TaxCalculationResult)
        } catch {
          // ignore
        }
      }
    } catch {
      setFormData(null)
    }
    setMounted(true)
  }, [])

  const toggleProduct = (id: FormProductId) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  if (!mounted) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center px-4">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary" />
      </div>
    )
  }

  if (!formData) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            No form data found
          </h1>
          <p className="text-gray-600 mb-6">
            Please complete the tax form first, then return to payment from the
            calculation summary.
          </p>
          <Link
            href="/form"
            className="inline-block bg-primary text-white px-6 py-3 rounded-lg font-semibold hover:bg-green-600 transition-colors"
          >
            Go to form
          </Link>
        </div>
      </div>
    )
  }

  if (applicableProducts.length === 0) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            No forms available
          </h1>
          <p className="text-gray-600 mb-6">
            We couldn&apos;t determine which forms apply. Please complete the form and
            try again.
          </p>
          <Link
            href="/form"
            className="inline-block bg-primary text-white px-6 py-3 rounded-lg font-semibold hover:bg-green-600 transition-colors"
          >
            Go to form
          </Link>
        </div>
      </div>
    )
  }

  if (paymentSuccess && formData) {
    return (
      <div className="min-h-screen bg-white py-12 px-4">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white border border-silver rounded-lg p-8 shadow-sm">
            <PaymentSuccessScreen
              formData={formData}
              taxResult={taxResult}
              paidProductIds={Array.from(selectedIds)}
            />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-4xl font-bold text-gray-900 mb-2 text-center">
          Payment
        </h1>
        <p className="text-gray-600 mb-8 text-center">
          Select the forms you want to generate. You will only be charged for
          the selected items.
        </p>

        <div className="bg-white border border-silver rounded-lg p-8 shadow-sm space-y-8">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Select forms to generate
            </h2>
            <ul className="space-y-3">
              {applicableProducts.map((product) => {
                const refund = refundByProduct[product.id]
                const showRefund = typeof refund === 'number' && refund > 0
                return (
                  <li
                    key={product.id}
                    className="flex items-start gap-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50"
                  >
                    <input
                      type="checkbox"
                      id={product.id}
                      checked={selectedIds.has(product.id)}
                      onChange={() => toggleProduct(product.id)}
                      className="mt-1 h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                    />
                    <label
                      htmlFor={product.id}
                      className="flex-1 cursor-pointer min-w-0"
                    >
                      <span className="font-medium text-gray-900">
                        {product.label}
                      </span>
                      <span className="text-gray-600"> — ${product.price.toFixed(2)}</span>
                      {product.description && (
                        <p className="text-sm text-gray-500 mt-0.5">
                          {product.description}
                        </p>
                      )}
                    </label>
                    {showRefund && (
                      <div className="shrink-0 text-right">
                        <span className="text-green-600 font-medium text-sm">
                          Your refund value: ${refund.toFixed(2)}
                        </span>
                      </div>
                    )}
                  </li>
                )
              })}
            </ul>
            <p className="text-sm text-gray-500 mt-3">
              Only forms that apply to your situation are shown (e.g. Illinois
              appears only if you file in Illinois).
            </p>
          </div>

          {selectedIds.size === 0 ? (
            <div className="rounded-lg bg-amber-50 border border-amber-200 p-4">
              <p className="text-amber-800 text-sm">
                Select at least one form to continue.
              </p>
            </div>
          ) : (
            <>
              <div className="border-t border-gray-200 pt-6">
                <div className="flex flex-wrap items-center gap-2 mb-4">
                  <label htmlFor="promo-code" className="sr-only">
                    Promo code
                  </label>
                  <input
                    id="promo-code"
                    type="text"
                    value={promoCode}
                    onChange={(e) => {
                      setPromoCode(e.target.value)
                      setPromoError(null)
                    }}
                    placeholder="Promo code"
                    className="flex-1 min-w-[140px] px-3 py-2 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-primary focus:border-primary"
                    aria-invalid={!!promoError}
                  />
                  <button
                    type="button"
                    onClick={handleApplyPromo}
                    className="px-4 py-2 rounded-lg font-medium bg-gray-900 text-white hover:bg-gray-800 transition-colors shrink-0"
                  >
                    Apply
                  </button>
                </div>
                {promoError && (
                  <p className="text-red-600 text-sm mb-2" role="alert">
                    {promoError}
                  </p>
                )}
                {appliedPromo && (
                  <p className="text-green-600 text-sm mb-2">
                    Promo &quot;{appliedPromo.code}&quot; applied: -${appliedPromo.discount.toFixed(2)}
                  </p>
                )}
                <div className="flex justify-between text-lg font-semibold text-gray-900 mb-6">
                  <span>Total</span>
                  <span>${finalTotal.toFixed(2)}</span>
                </div>
                {finalTotal === 0 ? (
                  <div className="rounded-lg bg-gray-50 p-4">
                    <p className="text-gray-700 mb-4">No payment required.</p>
                    <button
                      type="button"
                      onClick={() => setPaymentSuccess(true)}
                      className="w-full bg-primary text-white px-6 py-3 rounded-lg font-semibold hover:bg-green-600 transition-colors"
                    >
                      Continue
                    </button>
                  </div>
                ) : finalTotal < 0.5 ? (
                  <p className="text-amber-700 text-sm">
                    Minimum charge is $0.50. Add a form or reduce your promo discount to continue.
                  </p>
                ) : (
                  <Elements stripe={stripePromise}>
                    <CheckoutForm
                      total={finalTotal}
                      selectedProductIds={Array.from(selectedIds)}
                      onSuccess={() => setPaymentSuccess(true)}
                    />
                  </Elements>
                )}
              </div>
            </>
          )}
        </div>

        <div className="mt-6 text-center text-sm text-gray-500">
          <p>
            Secure payment processed by Stripe. Your payment information is
            encrypted and secure.
          </p>
        </div>
      </div>
    </div>
  )
}
