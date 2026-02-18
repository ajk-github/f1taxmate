/**
 * State Tax Calculation for Illinois
 * 
 * This file implements Illinois state tax calculation.
 * State taxes are not country-specific, only state-specific.
 * 
 * Rules:
 * - Illinois does NOT recognize India-US Tax Treaty
 * - NO standard deduction
 * - Personal exemption: $2,850 (single filer)
 * - Exemption phaseout: $0 if federal AGI > $250,000
 * - Flat tax rate: 4.95%
 * - Filing status: SINGLE
 */

import { FormData } from '@/types/form'
import { TaxCalculationResult } from '../index'

const ILLINOIS_TAX_RATE = 0.0495 // 4.95% flat rate
const PERSONAL_EXEMPTION_SINGLE = 2850 // Personal exemption for single filer
const HIGH_INCOME_THRESHOLD = 250000 // AGI threshold for exemption phaseout

export async function calculateStateTax(
  formData: FormData
): Promise<TaxCalculationResult['stateTax']> {
  // Calculate gross income (same as federal)
  const grossIncome = calculateGrossIncome(formData)
  
  // Calculate Illinois tax withheld (W-2 Box 17)
  const stateTaxWithheld = calculateStateTaxWithheld(formData)
  
  // Determine personal exemption
  // If federal AGI > $250,000, no exemption allowed
  const exemption = grossIncome > HIGH_INCOME_THRESHOLD 
    ? 0 
    : PERSONAL_EXEMPTION_SINGLE
  
  // Calculate taxable income: Gross Income - Personal Exemption (round down)
  const taxableIncome = Math.floor(Math.max(0, grossIncome - exemption))
  
  // Calculate tax owed: Taxable Income × 4.95% (round down to whole dollars)
  const taxOwed = Math.floor(taxableIncome * ILLINOIS_TAX_RATE)
  
  // Calculate refund or amount owed (round down)
  const refund = Math.floor(Math.max(0, stateTaxWithheld - taxOwed))
  const amountOwed = Math.floor(Math.max(0, taxOwed - stateTaxWithheld))
  
  return {
    taxOwed: taxOwed, // Actual tax calculated
    refund: refund,
    amountOwed: amountOwed, // Amount owed after withholdings
    forms: {
      form1040: formData.incomeInfo.hadUSIncome, // Form IL-1040 if had US income
    },
  }
}

/**
 * Calculate gross income from W-2 forms (Box 1)
 * Same calculation as federal for consistency
 */
function calculateGrossIncome(formData: FormData): number {
  let total = 0
  
  // Sum W2 wages (Box 1)
  formData.incomeInfo.w2Forms?.forEach((w2) => {
    total += w2?.wages || 0
  })
  
  // Include 1099 income
  formData.incomeInfo.form1099INT?.forEach((form) => {
    total += form?.interestIncome || 0
  })
  
  formData.incomeInfo.form1099MISC?.forEach((form) => {
    total += form?.otherIncome || 0
  })
  
  return total
}

/**
 * Total Illinois withholding: sum of floor(per-W2/per-1099 state withheld).
 * Must match Schedule IL-WIT Line 11 and IL-1040 Line 25 exactly (no rounding the sum).
 */
function calculateStateTaxWithheld(formData: FormData): number {
  let total = 0

  formData.incomeInfo.w2Forms?.forEach((w2) => {
    total += Math.floor(w2?.stateTaxWithheld ?? 0)
  })

  formData.incomeInfo.form1099INT?.forEach((form) => {
    total += Math.floor(form?.stateTaxWithheld ?? 0)
  })

  formData.incomeInfo.form1099MISC?.forEach((form) => {
    total += Math.floor(form?.stateTaxWithheld ?? 0)
  })

  return total
}
