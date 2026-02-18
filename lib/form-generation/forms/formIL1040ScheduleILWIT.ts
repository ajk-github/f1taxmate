/**
 * Form IL-1040 Schedule IL-WIT - Illinois Withholding.
 * One row per W-2 (Code W, EIN, Federal wages, Illinois wages, Illinois withheld); total at end.
 */

import { FormData } from '@/types/form'
import { TaxCalculationResult } from '../../tax-calculation'
import {
  loadPDFTemplate,
  setTextField,
  formatCurrencyForPDFWholeOnly,
  getPDFAsArrayBuffer,
} from '../pdf-filler'

const MAX_W2_ROWS = 5

export async function fillFormIL1040ScheduleILWIT(
  formData: FormData,
  taxResult: TaxCalculationResult
): Promise<ArrayBuffer> {
  const pdf = await loadPDFTemplate('illinois_forms/il-1040-schedule-il-wit.pdf')

  const fullName = `${formData.personalInfo.firstName} ${formData.personalInfo.lastName}`.trim()
  const ssnDigits = (formData.incomeInfo.ssn || '').replace(/\D/g, '')
  const ssn3 = ssnDigits.length >= 3 ? ssnDigits.slice(0, 3) : ssnDigits
  const ssn2 = ssnDigits.length >= 5 ? ssnDigits.slice(3, 5) : ''
  const ssn4 = ssnDigits.length >= 9 ? ssnDigits.slice(5, 9) : ''

  setTextField(pdf, 'Your name', fullName)
  setTextField(pdf, 'Your SSN-3', ssn3)
  setTextField(pdf, 'Your SSN-2', ssn2)
  setTextField(pdf, 'Your SSN-4', ssn4)

  const w2Forms = formData.incomeInfo.w2Forms || []
  let totalIllinoisWithheld = 0

  for (let i = 0; i < Math.min(w2Forms.length, MAX_W2_ROWS); i++) {
    const w2 = w2Forms[i]
    const n = i + 1
    const wages = w2?.wages ?? 0
    const illinoisWithheld = w2?.stateTaxWithheld ?? 0
    const illinoisWithheldFloored = Math.floor(illinoisWithheld)
    const ein = (w2?.ein ?? '').replace(/\D/g, '')

    totalIllinoisWithheld += illinoisWithheldFloored

    setTextField(pdf, `Form type - ${n}`, 'W')
    setTextField(pdf, `EIN - ${n}`, ein)
    setTextField(pdf, `Federal wages - ${n}`, formatCurrencyForPDFWholeOnly(wages))
    setTextField(pdf, `Illinois wages - ${n}`, formatCurrencyForPDFWholeOnly(wages))
    setTextField(pdf, `Illinois withheld - ${n}`, String(illinoisWithheldFloored))
  }

  setTextField(pdf, 'Total amount', String(totalIllinoisWithheld))

  return await getPDFAsArrayBuffer(pdf)
}
