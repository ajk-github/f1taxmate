/**
 * Tax Calculation Module
 * 
 * This module handles tax calculations for F1 students.
 * 
 * Structure:
 * - lib/tax-calculation/
 *   - federal/
 *     - india.ts (federal tax by country)
 *   - state/
 *     - illinois.ts (state tax by state, country doesn't matter)
 */

import { FormData } from '@/types/form'

export interface TaxCalculationResult {
  federalTax: {
    taxOwed: number // Actual tax calculated (before considering withholdings)
    refund: number
    amountOwed: number // Amount owed after withholdings (0 if refund)
    forms: {
      form8843: boolean
      form1040: boolean
      form832: boolean
    }
  }
  stateTax: {
    taxOwed: number // Actual tax calculated (before considering withholdings)
    refund: number
    amountOwed: number // Amount owed after withholdings (0 if refund)
    forms: {
      form1040: boolean
    }
  }
}

/**
 * Main function to calculate taxes based on form data
 */
export async function calculateTax(
  formData: FormData
): Promise<TaxCalculationResult> {
  // Default to India if not specified
  const countryRaw = formData.personalInfo?.foreignAddress?.country || 'India'
  const country = countryRaw.toLowerCase().trim()
  const incomeStateIsIllinois = formData.incomeInfo?.incomeState === 'Illinois'

  // Calculate federal tax (country-specific)
  // Handle various ways India might be entered
  let federalResult
  if (
    country === 'india' ||
    country === 'indian' ||
    country === '' ||
    country === 'foreign country' ||
    !formData.personalInfo?.foreignAddress?.country
  ) {
    // Default to India calculation if country is not specified or is India
    const { calculateFederalTax } = await import('./federal/india')
    federalResult = await calculateFederalTax(formData)
  } else {
    throw new Error(
      `Federal tax calculation not yet supported for ${countryRaw} students. Currently only India is supported.`
    )
  }

  // Calculate state tax only when income was earned in Illinois
  let stateResult: TaxCalculationResult['stateTax']
  if (incomeStateIsIllinois) {
    const { calculateStateTax } = await import('./state/illinois')
    stateResult = await calculateStateTax(formData)
  } else {
    stateResult = {
      taxOwed: 0,
      refund: 0,
      amountOwed: 0,
      forms: { form1040: false },
    }
  }

  return {
    federalTax: federalResult,
    stateTax: stateResult,
  }
}

/**
 * Minimal tax result for form generation when user had no US income (8843 only).
 */
export function getMinimalTaxResultFor8843(): TaxCalculationResult {
  return {
    federalTax: {
      taxOwed: 0,
      refund: 0,
      amountOwed: 0,
      forms: { form8843: true, form1040: false, form832: false },
    },
    stateTax: {
      taxOwed: 0,
      refund: 0,
      amountOwed: 0,
      forms: { form1040: false },
    },
  }
}
