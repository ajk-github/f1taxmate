/**
 * Form 8316 - Information Regarding Request for Refund of Social Security Tax
 * Erroneously Withheld on Wages Received by a Nonresident Alien on F, J, or M Visa
 *
 * Mapping based on numbered-field legend (f8316_numbered.pdf):
 * - Field #5: Question A → Yes
 * - Field #1: Question 1 → No
 * - Field #2: Question 3 → No
 * - Field #3: Question 5 → Do not Know
 * - Field #4: Question 7 → No
 * - Field #9: Employer statement text
 * - Field #13: Employer name and address (not a separate field in this PDF; we prepend it to the statement block)
 * - Field #12: Your telephone number (include area code)
 * - Field #11: Convenient hours for us to call
 *
 * All other fields remain empty for the user to complete manually.
 */

import { FormData } from '@/types/form'
import {
  loadPDFTemplate,
  setTextField,
  setRadioGroup,
  getPDFAsArrayBuffer,
} from '../pdf-filler'

export async function fillForm8316(formData: FormData): Promise<ArrayBuffer> {
  const pdf = await loadPDFTemplate('FICA_forms/f8316.pdf')

  const w2WithFica =
    formData.incomeInfo.w2Forms?.filter(
      (w2) => (w2?.socialSecurityWithheld || 0) + (w2?.medicareWithheld || 0) > 0
    ) || []
  const firstW2 = w2WithFica[0]
  const ficaEmployerInfo = formData.incomeInfo.ficaEmployerInfo ?? []

  // Question A: Was the income directly related to your course of studies? → Yes
  setRadioGroup(pdf, 'A', '1')

  // Q1: Has your employer paid you back? → No
  setRadioGroup(pdf, '1', '2')
  setTextField(pdf, 'FillText01', '')  // Q2 leave empty

  // Q3: Have you authorized your employer to claim any part? → No
  setRadioGroup(pdf, '3', '2')
  setTextField(pdf, 'FillText03', '')  // Q4 leave empty

  // Q5: Has your employer claimed any part? → Do not Know
  setRadioGroup(pdf, '5', '3')
  setTextField(pdf, 'FillText05', '')
  setTextField(pdf, 'FillText06', '')

  // Q7: Have you claimed any part as credit/refund on federal income tax? → No
  setRadioGroup(pdf, '7', '2')
  setTextField(pdf, 'FillText10', '')  // Q8 leave empty

  // Field #9: If you cannot get a statement from your employer... (employer statement)
  const employerStatement = firstW2
    ? `I requested a written statement from my employer regarding the erroneously withheld Social Security and Medicare taxes. My employer acknowledged that the FICA taxes were mistakenly withheld from my wages but was unable to process a refund or provide a formal written statement. They advised me to apply directly with the Internal Revenue Service for a refund of these amounts.`
    : `I requested a written statement from my employer regarding the erroneously withheld Social Security and Medicare taxes. My employer was unable to process a refund or provide a formal written statement. They advised me to apply directly with the Internal Revenue Service for a refund of these amounts.`
  // Q9 "Name and address of employer..." line isn't a separate fillable field in this template,
  // so we place employer name/address/EIN at the top of the statement block.
  const employerBlocks = w2WithFica.map((w2, i) => {
    const name = ficaEmployerInfo[i]?.employerName?.trim() || ''
    const address = ficaEmployerInfo[i]?.employerAddress?.trim() || ''
    const ein = (w2?.ein ?? '').replace(/\D/g, '')
    const einFormatted = ein.length >= 2 ? `${ein.slice(0, 2)}-${ein.slice(2)}` : ein || 'See W-2'
    const parts = [name, address, einFormatted ? `EIN: ${einFormatted}` : ''].filter(Boolean)
    return parts.join('\n')
  })
  const employerHeader =
    employerBlocks.length > 0 && employerBlocks.some((b) => b.trim())
      ? employerBlocks.join('\n\n')
      : w2WithFica
          .map((w2) => {
            const ein = (w2?.ein ?? '').replace(/\D/g, '')
            const einFormatted = ein.length >= 2 ? `${ein.slice(0, 2)}-${ein.slice(2)}` : ein || 'See W-2'
            return `See attached W-2 for employer name and address. EIN: ${einFormatted}`
          })
          .join('\n\n')

  setTextField(pdf, 'FillText7', `${employerHeader}\n\n${employerStatement}`)

  // Bottom contact row:
  // - FillText12 is "Your telephone number"
  // - FillText11 is "Convenient hours for us to call"
  setTextField(pdf, 'FillText12', formData.personalInfo.phone || '')
  setTextField(pdf, 'FillText11', '9:00 AM – 5:00 PM CST')

  return await getPDFAsArrayBuffer(pdf)
}
