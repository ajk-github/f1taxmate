/**
 * Form 843 - Claim for Refund and Request for Abatement
 *
 * Filled per FICA refund instructions: only "Refund to employee of SS/Medicare/RRTA
 * tax withheld in error" checked; Line 4a Employment; Line 5n Other (1040-NR);
 * Line 7d None of the above; Line 8 explanation.
 */

import { FormData } from '@/types/form'
import { TaxCalculationResult } from '../../tax-calculation'
import {
  loadPDFTemplate,
  setTextField,
  setCheckboxField,
  formatDateForPDF,
  formatSSN,
  getPDFAsArrayBuffer,
} from '../pdf-filler'

const P1 = 'topmostSubform[0].Page1[0]'
const P2 = 'topmostSubform[0].Page2[0]'
const TAX_YEAR = 2025

export async function fillForm843(
  formData: FormData,
  _taxResult: TaxCalculationResult
): Promise<ArrayBuffer> {
  const pdf = await loadPDFTemplate('FICA_forms/f843.pdf')

  let totalSS = 0
  let totalMedicare = 0
  const w2WithFica = formData.incomeInfo.w2Forms?.filter(
    (w2) => (w2?.socialSecurityWithheld || 0) + (w2?.medicareWithheld || 0) > 0
  ) || []
  w2WithFica.forEach((w2) => {
    totalSS += w2?.socialSecurityWithheld || 0
    totalMedicare += w2?.medicareWithheld || 0
  })
  const totalFICA = totalSS + totalMedicare
  const totalFICAFloor = Math.floor(totalFICA)
  const ssFloor = Math.floor(totalSS)
  const medicareFloor = Math.floor(totalMedicare)

  const firstName = formData.personalInfo.firstName || ''
  const lastName = formData.personalInfo.lastName || ''
  const fullName = `${firstName} ${lastName}`.trim()
  const usAddr = formData.personalInfo.usAddress
  const firstEntryDate = formData.residencyInfo?.dateOfFirstVisit || ''
  const firstW2WithFica = w2WithFica[0]
  const employerEIN = firstW2WithFica?.ein || 'See W-2'
  const employerLabel = employerEIN ? ` (EIN: ${employerEIN})` : ''

  // —— Page 1: Top checkboxes (reason for filing) ——
  // Only 5th: "Refund to employee of SS/Medicare/RRTA tax withheld in error" → CHECK
  for (let i = 0; i <= 16; i++) {
    setCheckboxField(pdf, `${P1}.c1_1[${i}]`, i === 4)
  }

  // —— Page 1: Taxpayer information ——
  // NOTE: Field #25 ("Other (specify)") uses f1_1[0]. To match the numbered
  // legend, we must leave f1_1[0] empty and start taxpayer info at f1_2[0],
  // otherwise everything shifts one field up (as seen in the screenshot).
  setTextField(pdf, `${P1}.f1_2[0]`, fullName) // #36 Name of person requesting refund
  setTextField(pdf, `${P1}.f1_3[0]`, formatSSN(formData.incomeInfo.ssn || '')) // #47 SSN
  // Spouse fields (#50, #51) left blank on purpose → f1_4, f1_5
  setTextField(pdf, `${P1}.f1_6[0]`, usAddr.address) // #52 Address
  setTextField(pdf, `${P1}.f1_7[0]`, usAddr.addressLine2 || '') // #53 Apt/suite
  setTextField(pdf, `${P1}.f1_8[0]`, usAddr.city) // #54 City
  setTextField(pdf, `${P1}.f1_9[0]`, usAddr.state) // #55 State
  setTextField(pdf, `${P1}.f1_10[0]`, usAddr.zipCode) // #26 ZIP
  // Employer EIN (#27) is f1_11[0] — leave empty per legend
  // Foreign address (#28–#30) and "Name/address shown on return" (#31) are left empty.
  setTextField(pdf, `${P1}.f1_16[0]`, formData.personalInfo.phone || '') // #32 Daytime phone

  // Line 1: Tax period (#33, #34)
  // After phone/return-address fields in the numbered PDF, the tax period
  // fields map to later indices; empirically, they align starting at f1_17.
  setTextField(pdf, `${P1}.f1_17[0]`, `01/01/${TAX_YEAR}`) // #33 Beginning date
  setTextField(pdf, `${P1}.f1_18[0]`, `12/31/${TAX_YEAR}`) // #34 Ending date

  // Line 2: Amount to be refunded (#35)
  setTextField(pdf, `${P1}.f1_19[0]`, String(totalFICAFloor))

  // Line 3: Date(s) of payment(s) 3a–3l (#37–#49).
  // We don't have individual pay dates in form data. To match the numbered
  // legend, we default 3a (Field #37) to "See attached" so the user can
  // attach a separate list of pay dates, and leave 3b–3l empty.
  if (totalFICAFloor > 0) {
    setTextField(pdf, `${P1}.f1_20[0]`, 'See attached') // 3a / #37
  }
  for (let i = 21; i <= 31; i++) {
    setTextField(pdf, `${P1}.f1_${i}[0]`, '')
  }

  // Line 4: Type of tax — only Employment (4a) CHECK
  setCheckboxField(pdf, `${P1}.c1_2[0]`, true)   // 4a Employment
  setCheckboxField(pdf, `${P1}.c1_3[0]`, false)  // 4b Estate
  setCheckboxField(pdf, `${P1}.c1_4[0]`, false)  // 4c Gift
  setCheckboxField(pdf, `${P1}.c1_5[0]`, false)  // 4d Excise
  setCheckboxField(pdf, `${P1}.c1_6[0]`, false)  // 4e Income
  setCheckboxField(pdf, `${P1}.c1_7[0]`, false)  // 4f Fee
  setCheckboxField(pdf, `${P1}.c1_8[0]`, false)  // 4g Civil penalty

  // —— Page 2: Line 5 — Type of return (checkboxes) and Line 6 IRC section ——
  for (let i = 0; i <= 13; i++) {
    setCheckboxField(pdf, `${P2}.c2_${i + 1}[0]`, i === 13) // c2_14 = 5n Other
  }
  // Numbered PDF shows "1040-NR" in field #70, which is Line 6
  // (Internal Revenue Code section) rather than the 5n "Other (specify)" field.
  // So we write 1040-NR into Line 6 and leave 5n text empty.
  setTextField(pdf, `${P2}.f2_1[0]`, '1040-NR') // Line 6 IRC section (#70)
  setTextField(pdf, `${P2}.f2_2[0]`, '')        // Line 5n Other (specify) (#71) left blank

  // Line 7: Reason — only 7d "None of the above" CHECK
  setCheckboxField(pdf, `${P2}.c2_15[0]`, false)  // 7a
  setCheckboxField(pdf, `${P2}.c2_15[1]`, false)   // 7b
  setCheckboxField(pdf, `${P2}.c2_15[2]`, false)   // 7c
  setCheckboxField(pdf, `${P2}.c2_15[3]`, true)    // 7d

  // Line 8: Explanation (Field #76) – single newlines only so text aligns with form’s dashed lines
  const entryDateStr = firstEntryDate ? formatDateForPDF(firstEntryDate) : '[MM/DD/YYYY]'
  const line8 = `I am a nonresident alien present in the United States on an F-1 student visa.
I first entered the U.S. on ${entryDateStr} and have been present for fewer than 5 calendar years. I am classified as a nonresident alien for federal tax purposes under IRC Section 7701(b).
Under Section 3121(b)(19) of the Internal Revenue Code, a nonresident alien on an F-1 visa is not liable for Social Security and Medicare (FICA) taxes for as long as they remain a nonresident alien.
My employer${employerLabel} mistakenly withheld FICA taxes from my wages during the ${TAX_YEAR} tax year. The employer erroneously deducted these taxes from my compensation despite my exempt status.
Social Security tax withheld (W-2 Box 4): $${ssFloor}. Medicare tax withheld (W-2 Box 6): $${medicareFloor}. Total refund requested: $${totalFICAFloor}.
I contacted my employer and requested a refund of these erroneously withheld taxes. My employer was unable to process the refund and advised me to apply directly with the Internal Revenue Service.
I have not received any reimbursement from my employer for these amounts. I have not claimed these amounts as a credit against, or refund of, my federal income tax on any return.`
  setTextField(pdf, `${P2}.ExplainWhy[0].f2_3[0]`, line8)

  // Signature block
  setTextField(pdf, `${P2}.f2_4[0]`, fullName)
  setTextField(pdf, `${P2}.f2_5[0]`, formatDateForPDF(new Date().toISOString().slice(0, 10)))
  setTextField(pdf, `${P2}.f2_6[0]`, '')  // IP PIN — leave empty

  return await getPDFAsArrayBuffer(pdf)
}
