/**
 * Federal Tax Calculation for Indian F1 Students
 * 
 * This file implements federal tax calculation for Indian F-1 students in Illinois.
 * Based on India-US Tax Treaty Article 21(2) which grants standard deduction.
 * 
 * Rules:
 * - Nonresident Alien status (Form 1040-NR)
 * - Standard deduction: $15,750 (India-US Treaty exception)
 * - Progressive tax brackets for 2025
 * - Filing status: SINGLE
 */

import { FormData } from '@/types/form'
import { TaxCalculationResult } from '../index'

// 2025 Federal Tax Brackets (Single Filer)
const TAX_BRACKETS = [
  { min: 0, max: 11925, rate: 0.10, base: 0 },
  { min: 11926, max: 48475, rate: 0.12, base: 1192.50 },
  { min: 48476, max: 103350, rate: 0.22, base: 5578.50 },
  { min: 103351, max: 197300, rate: 0.24, base: 17651.00 },
  { min: 197301, max: 250525, rate: 0.32, base: 40199.00 },
  { min: 250526, max: 626350, rate: 0.35, base: 57231.00 },
  { min: 626351, max: Infinity, rate: 0.37, base: 188769.75 },
]

const STANDARD_DEDUCTION = 15750 // India-US Tax Treaty Article 21(2)

export async function calculateFederalTax(
  formData: FormData
): Promise<TaxCalculationResult['federalTax']> {
  // Calculate gross income (W-2 Box 1 only for federal)
  const grossIncome = calculateGrossIncome(formData)
  
  // Calculate federal tax withheld (W-2 Box 2)
  const taxWithheld = calculateTotalTaxWithheld(formData)
  
  // Calculate taxable income: Gross Income - Standard Deduction (round down)
  const taxableIncome = Math.floor(Math.max(0, grossIncome - STANDARD_DEDUCTION))
  
  // Calculate tax owed using progressive brackets (round down to whole dollars)
  const taxOwed = Math.floor(calculateProgressiveTax(taxableIncome))
  
  // Calculate refund or amount owed (round down)
  const refund = Math.floor(Math.max(0, taxWithheld - taxOwed))
  const amountOwed = Math.floor(Math.max(0, taxOwed - taxWithheld))
  
  // Check if FICA was withheld (for Form 832/843)
  // F-1 students with <5 years in US are exempt from FICA
  // If FICA was withheld, they can file Form 843 + Form 8316 to get a refund
  let totalFICAWithheld = 0
  formData.incomeInfo.w2Forms?.forEach((w2) => {
    totalFICAWithheld += (w2?.socialSecurityWithheld || 0) + (w2?.medicareWithheld || 0)
  })
  const hasFICAWithheld = totalFICAWithheld > 0
  
  return {
    taxOwed: taxOwed, // Actual tax calculated
    refund: refund,
    amountOwed: amountOwed, // Amount owed after withholdings
    forms: {
      form8843: true, // Always needed for F1 students
      form1040: formData.incomeInfo.hadUSIncome, // Form 1040-NR if had US income
      form832: hasFICAWithheld, // Form 832/843 if FICA was wrongly withheld
    },
  }
}

/**
 * Calculate gross income from W-2 forms (Box 1)
 * Note: For federal tax, we primarily use W-2 wages
 */
function calculateGrossIncome(formData: FormData): number {
  let total = 0
  
  // Sum W2 wages (Box 1)
  formData.incomeInfo.w2Forms?.forEach((w2) => {
    total += w2?.wages || 0
  })
  
  // Note: 1099-INT and 1099-MISC income may also be taxable
  // but for F-1 students, W-2 wages are typically the primary income source
  formData.incomeInfo.form1099INT?.forEach((form) => {
    total += form?.interestIncome || 0
  })
  
  formData.incomeInfo.form1099MISC?.forEach((form) => {
    total += form?.otherIncome || 0
  })
  
  return total
}

/**
 * Calculate total federal tax withheld (W-2 Box 2)
 */
function calculateTotalTaxWithheld(formData: FormData): number {
  let total = 0
  
  // Sum federal tax withheld from W2 (Box 2)
  formData.incomeInfo.w2Forms?.forEach((w2) => {
    total += w2?.federalTaxWithheld || 0
  })
  
  // Sum federal tax withheld from 1099 forms
  formData.incomeInfo.form1099INT?.forEach((form) => {
    total += form?.federalTaxWithheld || 0
  })
  
  formData.incomeInfo.form1099MISC?.forEach((form) => {
    total += form?.federalTaxWithheld || 0
  })
  
  return total
}

/**
 * Calculate tax using progressive brackets
 */
function calculateProgressiveTax(taxableIncome: number): number {
  if (taxableIncome <= 0) {
    return 0
  }
  
  // Find the appropriate tax bracket
  const bracket = TAX_BRACKETS.find(
    (b) => taxableIncome >= b.min && taxableIncome <= b.max
  )
  
  if (!bracket) {
    // Should not happen, but handle edge case
    return 0
  }
  
  // Calculate: base tax + (taxable income - bracket minimum) × rate
  const amountOverBracketMin = taxableIncome - bracket.min
  const additionalTax = amountOverBracketMin * bracket.rate
  
  return bracket.base + additionalTax
}
