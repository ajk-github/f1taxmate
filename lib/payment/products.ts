import type { FormData } from '@/types/form'
import type { TaxCalculationResult } from '@/lib/tax-calculation'
import type { GeneratedForms } from '@/lib/form-generation'

export type GeneratedFormKey = keyof GeneratedForms

/**
 * Which form assets to include for each paid product.
 * Federal bundle includes Form 8843 + 1040-NR.
 */
export const PRODUCT_FORM_KEYS: Record<FormProductId, GeneratedFormKey[]> = {
  form8843: ['form8843'],
  federal: ['form8843', 'form1040Federal'],
  illinois: ['form1040State', 'form1040StateScheduleNR', 'form1040StateScheduleILWIT'],
  fica: ['form843', 'form8316'],
}

export const FORM_PRODUCTS = {
  form8843: {
    id: 'form8843' as const,
    label: 'Form 8843 only',
    description: 'Statement for Exempt Individuals',
    price: 4.99,
  },
  federal: {
    id: 'federal' as const,
    label: 'Federal only',
    description: 'Form 1040-NR – U.S. Individual Income Tax Return',
    price: 9.99,
  },
  illinois: {
    id: 'illinois' as const,
    label: 'Illinois only',
    description: 'Form IL-1040 – Illinois Individual Income Tax Return',
    price: 14.99,
  },
  fica: {
    id: 'fica' as const,
    label: 'FICA only',
    description: 'Form 843 + Form 8316 – FICA Tax Refund Request',
    price: 25.99,
  },
} as const

export type FormProductId = keyof typeof FORM_PRODUCTS

export interface ProductOption {
  id: FormProductId
  label: string
  description: string
  price: number
}

/**
 * Returns which form products are applicable for this user based on form data.
 * - 8843: only when no US income (then it's the only billable option; federal bundle includes 8843)
 * - Federal: when they had US income (includes Form 8843)
 * - Illinois: only when income state is Illinois (income was earned in Illinois)
 * - FICA: when they had US income and any FICA withheld on W-2s
 */
export function getApplicableProducts(formData: FormData | null): ProductOption[] {
  if (!formData) return []

  const options: ProductOption[] = []
  const hadUSIncome = formData.incomeInfo?.hadUSIncome === true
  const incomeStateIsIllinois = formData.incomeInfo?.incomeState === 'Illinois'

  // Form 8843 only as a separate billable option when no US income (only document to file)
  if (!hadUSIncome) {
    options.push(FORM_PRODUCTS.form8843)
    return options
  }

  // With US income: Federal (includes 8843), then state/FICA if applicable
  options.push(FORM_PRODUCTS.federal)

  if (incomeStateIsIllinois && hadUSIncome) {
    options.push(FORM_PRODUCTS.illinois)
  }

  let hasFICAWithheld = false
  if (hadUSIncome && formData.incomeInfo?.w2Forms?.length) {
    for (const w2 of formData.incomeInfo.w2Forms) {
      if ((w2?.socialSecurityWithheld || 0) + (w2?.medicareWithheld || 0) > 0) {
        hasFICAWithheld = true
        break
      }
    }
  }
  if (hasFICAWithheld) {
    options.push(FORM_PRODUCTS.fica)
  }

  return options
}

/**
 * Refund amount per product. Only refunds (money back to user) are returned;
 * amounts owed are not shown on the payment screen.
 */
export function getRefundByProduct(
  formData: FormData | null,
  taxResult: TaxCalculationResult | null
): Partial<Record<FormProductId, number>> {
  const out: Partial<Record<FormProductId, number>> = {}

  if (!formData) return out

  // 8843 – no refund
  // federal – only show if refund > 0
  if (taxResult && taxResult.federalTax.refund > 0) {
    out.federal = taxResult.federalTax.refund
  }

  // illinois – only show if refund > 0
  if (taxResult && taxResult.stateTax.refund > 0) {
    out.illinois = taxResult.stateTax.refund
  }

  // FICA – recoverable amount from W-2s (refund they can get back)
  let ficaTotal = 0
  formData.incomeInfo?.w2Forms?.forEach((w2) => {
    ficaTotal += (w2?.socialSecurityWithheld || 0) + (w2?.medicareWithheld || 0)
  })
  if (ficaTotal > 0) {
    out.fica = ficaTotal
  }

  return out
}
