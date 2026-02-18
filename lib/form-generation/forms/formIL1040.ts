/**
 * Form IL-1040 - Illinois Individual Income Tax Return
 */

import { FormData } from '@/types/form'
import { TaxCalculationResult } from '../../tax-calculation'
import {
  loadPDFTemplate,
  setTextField,
  setTextFieldWithAlternateNames,
  setCheckboxField,
  formatSSN,
  formatCurrencyForPDFWholeOnly,
  formatDateForPDFDashes,
  formatPhoneForPDF,
  getPDFAsArrayBuffer,
} from '../pdf-filler'

/** Illinois form shows ".00" already – use whole numbers only, round down */
const ZERO = '0'

export async function fillFormIL1040(
  formData: FormData,
  taxResult: TaxCalculationResult
): Promise<ArrayBuffer> {
  const pdf = await loadPDFTemplate('illinois_forms/il-1040.pdf')

  const grossIncome = calculateGrossIncome(formData)
  // Use same total as Schedule IL-WIT Line 11 (sum of floor per W-2) so Line 25 matches exactly
  const stateTaxWithheld = calculateStateTaxWithheldForForms(formData)
  const exemption = grossIncome > 250000 ? 0 : 2850
  const taxableIncome = Math.max(0, grossIncome - exemption)
  const { taxOwed, refund, amountOwed } = taxResult.stateTax
  const phone = formatPhoneForPDF(formData.personalInfo.phone)
  const usAddress = formData.personalInfo.usAddress

  // --- Section A: Personal information ---
  setTextField(pdf, 'step1-A-firstnamemi', formData.personalInfo.firstName)
  setTextField(pdf, 'step1-A-lastname', formData.personalInfo.lastName)
  setTextField(pdf, 'Step1-A-dob', formatDateForPDFDashes(formData.personalInfo.dateOfBirth))
  setTextField(pdf, 'step1-A-ssn', formatSSN(formData.incomeInfo.ssn || ''))

  setTextField(pdf, 'step1-A-mailingaddress', usAddress.address)
  setTextField(pdf, 'step1-A-aptno', usAddress.addressLine2 || '')
  setTextField(pdf, 'step1-A-city', usAddress.city)
  setTextField(pdf, 'step1-A-state', usAddress.state)
  setTextField(pdf, 'step1-A-zip', usAddress.zipCode)
  // County: try common PDF field names (template may use step1-A-county or a different name)
  setTextFieldWithAlternateNames(
    pdf,
    ['step1-A-county', 'County', 'county', 'County (Illinois only)'],
    usAddress.county ?? ''
  )
  setTextField(pdf, 'step1-A-email', formData.personalInfo.email || '')

  // --- Section B: Filing status – Single ---
  setCheckboxField(pdf, 'filing_status', true)
  // --- Section D: Nonresident ---
  setCheckboxField(pdf, 'residency', true)

  // --- Income (get from tax calculation). Whole numbers only; round down. ---
  setTextField(pdf, 'Federally adjusted income', formatCurrencyForPDFWholeOnly(grossIncome))
  setTextField(pdf, 'Federally tax-exempt interest', ZERO)
  setTextField(pdf, 'Other additions', ZERO)
  setTextField(pdf, 'Total income', formatCurrencyForPDFWholeOnly(grossIncome))

  setTextField(pdf, 'step3-5', ZERO)
  setTextField(pdf, 'step3-6', ZERO)
  setTextField(pdf, 'step3-7', ZERO)
  setTextField(pdf, 'Total of your subtractions', ZERO)

  setTextField(pdf, 'Illinois base income', formatCurrencyForPDFWholeOnly(grossIncome))
  setTextField(pdf, 'Exemption amount', formatCurrencyForPDFWholeOnly(exemption))
  setTextField(pdf, '65 or older exemption amount', ZERO)
  setTextField(pdf, 'Legally blind exemption amount', ZERO)
  setTextField(pdf, 'Claiming dependents', ZERO)
  setTextField(pdf, 'Exemption allowance', formatCurrencyForPDFWholeOnly(exemption))

  setTextField(pdf, 'Illinois net income from Schedule NR', formatCurrencyForPDFWholeOnly(taxableIncome))
  setTextField(pdf, 'Multiply residency rate', formatCurrencyForPDFWholeOnly(taxOwed))
  setTextField(pdf, 'Recapture of investment tax credits', ZERO)
  setTextField(pdf, 'Income tax', formatCurrencyForPDFWholeOnly(taxOwed))
  setTextField(pdf, 'Income tax paid to another state', ZERO)
  setTextField(pdf, 'Schedule ICR', ZERO)
  setTextField(pdf, 'Credit amount from Schedule 1299-C', ZERO)
  setTextField(pdf, 'Total of your credits', ZERO)
  setTextField(pdf, 'Tax after nonrefundable credits', formatCurrencyForPDFWholeOnly(taxOwed))
  setTextField(pdf, 'Household employment tax', ZERO)
  setTextField(pdf, 'Use tax', ZERO)
  setTextField(pdf, 'Compassionate Use of Medical Cannabis Program Act', ZERO)
  setTextField(pdf, 'Total Tax', formatCurrencyForPDFWholeOnly(taxOwed))

  setTextField(pdf, 'Total tax from Page 1', formatCurrencyForPDFWholeOnly(taxOwed))
  setTextField(pdf, 'Illinois Income Tax withheld', formatCurrencyForPDFWholeOnly(stateTaxWithheld))
  setTextField(pdf, 'Estimated payments', ZERO)
  setTextField(pdf, 'Pass-through withholding', ZERO)
  setTextField(pdf, 'Pass-through entity tax credit', ZERO)
  setTextField(pdf, 'Earned Income Tax Credit from Schedule IL-E/EIC', ZERO)
  setTextField(pdf, 'Child Tax credit from Sch.IL-EITC', ZERO)
  setTextField(pdf, 'Total payments and refundable credit', formatCurrencyForPDFWholeOnly(stateTaxWithheld))

  // Refund or amount owed
  setTextField(pdf, 'If Line 31 is greater', refund > 0 ? formatCurrencyForPDFWholeOnly(refund) : ZERO)
  setTextField(pdf, 'If Line 24 is greater', amountOwed > 0 ? formatCurrencyForPDFWholeOnly(amountOwed) : ZERO)
  setTextField(pdf, 'Late-payment penalty for underpayment', ZERO)
  setTextField(pdf, 'Voluntary charitable donations', ZERO)
  setTextField(pdf, 'Total penalty and donations', ZERO)

  setTextField(pdf, 'Overpayment amount', refund > 0 ? formatCurrencyForPDFWholeOnly(refund) : ZERO)
  setTextField(pdf, 'Refunded to you', refund > 0 ? formatCurrencyForPDFWholeOnly(refund) : ZERO)

  // Direct deposit (when refund)
  if (formData.incomeInfo.bankDetails && refund > 0) {
    const bank = formData.incomeInfo.bankDetails
    setTextField(pdf, 'Routing number', bank.routingNumber)
    setTextField(pdf, 'Account number', bank.accountNumber)
    setCheckboxField(pdf, 'account_type', bank.accountType === 'checking')
  }

  setTextField(pdf, 'Amount to be credited forwarded', ZERO)
  setTextField(pdf, 'Amount you owe', amountOwed > 0 ? formatCurrencyForPDFWholeOnly(amountOwed) : ZERO)

  // Signature area: date (field 65), phone (66 = area code, 67 = number)
  setTextField(pdf, 'date_2', formatDateForPDFDashes(new Date().toISOString()))
  setTextField(pdf, 'DaytimeAreaCode_1', phone.areaCode)
  setTextField(pdf, 'phone_number_1', phone.number)

  return await getPDFAsArrayBuffer(pdf)
}

function calculateGrossIncome(formData: FormData): number {
  let total = 0
  formData.incomeInfo.w2Forms?.forEach((w2) => {
    total += w2?.wages || 0
  })
  formData.incomeInfo.form1099INT?.forEach((form) => {
    total += form?.interestIncome || 0
  })
  formData.incomeInfo.form1099MISC?.forEach((form) => {
    total += form?.otherIncome || 0
  })
  return total
}

/**
 * Total Illinois withholding to match Schedule IL-WIT Line 11 exactly.
 * Sum of floor(per-W2 state withheld) so IL-1040 Line 25 = Schedule IL-WIT Line 11.
 */
function calculateStateTaxWithheldForForms(formData: FormData): number {
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
