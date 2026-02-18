/**
 * Form 1040-NR - U.S. Nonresident Alien Income Tax Return
 * 
 * This form is used by nonresident aliens to report U.S. income.
 * Field mappings based on numbered PDF analysis.
 */

import { PDFDocument } from 'pdf-lib'
import { FormData } from '@/types/form'
import { TaxCalculationResult } from '../../tax-calculation'
import {
  loadPDFTemplate,
  setTextField,
  setCheckboxField,
  formatDateForPDF,
  formatSSN,
  formatCurrencyForPDFWholeOnly,
  getPDFAsArrayBuffer,
} from '../pdf-filler'

export async function fillForm1040NR(
  formData: FormData,
  taxResult: TaxCalculationResult
): Promise<ArrayBuffer> {
  const pdf = await loadPDFTemplate('federal_forms/f1040nr.pdf')
  
  // Field 14: First Name
  setTextField(pdf, 'topmostSubform[0].Page1[0].f1_14[0]', formData.personalInfo.firstName)
  
  // Field 15: Last Name
  setTextField(pdf, 'topmostSubform[0].Page1[0].f1_15[0]', formData.personalInfo.lastName)
  
  // Field 16: SSN (without dashes, maxLength is 9)
  // Remove all non-digits since the field only accepts 9 digits
  const ssn = formData.incomeInfo.ssn || ''
  const ssnDigits = ssn.replace(/\D/g, '')
  setTextField(pdf, 'topmostSubform[0].Page1[0].f1_16[0]', ssnDigits)
  
  // Field 17: Address
  setTextField(pdf, 'topmostSubform[0].Page1[0].f1_17[0]', formData.personalInfo.usAddress.address)
  
  // Field 18: Apt No (Address Line 2, leave empty if not provided)
  if (formData.personalInfo.usAddress.addressLine2) {
    setTextField(pdf, 'topmostSubform[0].Page1[0].f1_18[0]', formData.personalInfo.usAddress.addressLine2)
  }
  
  // Field 19: City
  setTextField(pdf, 'topmostSubform[0].Page1[0].f1_19[0]', formData.personalInfo.usAddress.city)
  
  // Field 20: State
  setTextField(pdf, 'topmostSubform[0].Page1[0].f1_20[0]', formData.personalInfo.usAddress.state)
  
  // Checkbox after field 20: Check "NO"
  // Need to find the correct checkbox field name - likely c1_X[0] or c1_X[1] for Yes/No
  // For now, we'll try common checkbox patterns
  // This will need to be verified with the actual PDF
  
  // Field 21: Zip Code
  setTextField(pdf, 'topmostSubform[0].Page1[0].f1_21[0]', formData.personalInfo.usAddress.zipCode)
  
  // Calculate values
  const grossIncome = calculateGrossIncome(formData)
  const standardDeduction = 15750 // India-US Treaty Article 21(2)
  const taxableIncome = Math.max(0, grossIncome - standardDeduction)
  const federalTaxWithheld = calculateFederalTaxWithheld(formData)
  
  // Field 42: Total amount from W2s (Box 1 sum for all W2s). Round down to whole dollars.
  setTextField(pdf, 'topmostSubform[0].Page1[0].f1_42[0]', formatCurrencyForPDFWholeOnly(grossIncome))
  
  // Field 54: Same value as 42
  setTextField(pdf, 'topmostSubform[0].Page1[0].f1_54[0]', formatCurrencyForPDFWholeOnly(grossIncome))
  
  // Field 56: Put value 0
  setTextField(pdf, 'topmostSubform[0].Page1[0].f1_56[0]', '0')
  
  // Field 68: Put value 0
  setTextField(pdf, 'topmostSubform[0].Page1[0].f1_68[0]', '0')
  
  // Field 69: Same value as 42
  setTextField(pdf, 'topmostSubform[0].Page1[0].f1_69[0]', formatCurrencyForPDFWholeOnly(grossIncome))
  
  // Field 71: Same value as 42
  setTextField(pdf, 'topmostSubform[0].Page1[0].f1_71[0]', formatCurrencyForPDFWholeOnly(grossIncome))
  
  // Field 72: Same value as 42 (on Page 2)
  setTextField(pdf, 'topmostSubform[0].Page2[0].f2_01[0]', formatCurrencyForPDFWholeOnly(grossIncome))
  
  // Field 73: Standard Deduction
  setTextField(pdf, 'topmostSubform[0].Page2[0].f2_02[0]', formatCurrencyForPDFWholeOnly(standardDeduction))
  
  // Field 77: Same value as 73 (Standard Deduction)
  setTextField(pdf, 'topmostSubform[0].Page2[0].f2_06[0]', formatCurrencyForPDFWholeOnly(standardDeduction))
  
  // Field 78: Total Gross Income - Standard Deduction (Taxable Income)
  setTextField(pdf, 'topmostSubform[0].Page2[0].f2_07[0]', formatCurrencyForPDFWholeOnly(taxableIncome))
  
  // Field 80: Tax value (Tax owed)
  setTextField(pdf, 'topmostSubform[0].Page2[0].f2_09[0]', formatCurrencyForPDFWholeOnly(taxResult.federalTax.taxOwed))
  
  // Field 82: Same value as 80
  setTextField(pdf, 'topmostSubform[0].Page2[0].f2_11[0]', formatCurrencyForPDFWholeOnly(taxResult.federalTax.taxOwed))
  
  // Field 86: Same value as 80
  setTextField(pdf, 'topmostSubform[0].Page2[0].f2_15[0]', formatCurrencyForPDFWholeOnly(taxResult.federalTax.taxOwed))
  
  // Field 91: Same value as 80
  setTextField(pdf, 'topmostSubform[0].Page2[0].f2_20[0]', formatCurrencyForPDFWholeOnly(taxResult.federalTax.taxOwed))
  
  // Field 92: Federal tax withheld (total of all W2s)
  setTextField(pdf, 'topmostSubform[0].Page2[0].Line25_ReadOrder[0].f2_21[0]', formatCurrencyForPDFWholeOnly(federalTaxWithheld))
  
  // Field 95: Same value as 92
  setTextField(pdf, 'topmostSubform[0].Page2[0].f2_24[0]', formatCurrencyForPDFWholeOnly(federalTaxWithheld))
  
  // Field 106: Same value as 92 (Federal tax withheld)
  setTextField(pdf, 'topmostSubform[0].Page2[0].f2_35[0]', formatCurrencyForPDFWholeOnly(federalTaxWithheld))
  
  // Field 107: Overpaid Value (round down to whole dollars)
  const overpaid = Math.max(0, federalTaxWithheld - taxResult.federalTax.taxOwed)
  setTextField(pdf, 'topmostSubform[0].Page2[0].f2_36[0]', formatCurrencyForPDFWholeOnly(overpaid))
  
  // Field 108: Refund Value (round down to whole dollars)
  const refund = taxResult.federalTax.refund > 0 ? taxResult.federalTax.refund : overpaid
  setTextField(pdf, 'topmostSubform[0].Page2[0].f2_37[0]', formatCurrencyForPDFWholeOnly(refund))
  
  // Field 109: Routing Number
  if (formData.incomeInfo.bankDetails?.routingNumber) {
    setTextField(pdf, 'topmostSubform[0].Page2[0].RoutingNo[0].f2_38[0]', formData.incomeInfo.bankDetails.routingNumber)
  }
  
  // Field 110: Account Number
  if (formData.incomeInfo.bankDetails?.accountNumber) {
    setTextField(pdf, 'topmostSubform[0].Page2[0].AccountNo[0].f2_39[0]', formData.incomeInfo.bankDetails.accountNumber)
  }
  
  // Field 120: Phone Number
  setTextField(pdf, 'topmostSubform[0].Page2[0].f2_49[0]', formData.personalInfo.phone)
  
  // Field 121: Email
  setTextField(pdf, 'topmostSubform[0].Page2[0].f2_50[0]', formData.personalInfo.email)
  
  // Field 118: Occupation (from personal info — Student only)
  setTextField(pdf, 'topmostSubform[0].Page2[0].f2_47[0]', 'Student')
  
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

function calculateFederalTaxWithheld(formData: FormData): number {
  let total = 0
  formData.incomeInfo.w2Forms?.forEach((w2) => {
    total += w2?.federalTaxWithheld || 0
  })
  formData.incomeInfo.form1099INT?.forEach((form) => {
    total += form?.federalTaxWithheld || 0
  })
  formData.incomeInfo.form1099MISC?.forEach((form) => {
    total += form?.federalTaxWithheld || 0
  })
  return total
}
