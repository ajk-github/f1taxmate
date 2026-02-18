/**
 * Form IL-1040 Schedule NR - Nonresident and Part-Year Resident Schedule
 */

import { FormData } from '@/types/form'
import { TaxCalculationResult } from '../../tax-calculation'
import {
  loadPDFTemplate,
  setTextField,
  setCheckboxField,
  formatCurrencyForPDFWholeOnly,
  getPDFAsArrayBuffer,
} from '../pdf-filler'

const ZERO = '0'

export async function fillFormIL1040ScheduleNR(
  formData: FormData,
  taxResult: TaxCalculationResult
): Promise<ArrayBuffer> {
  const pdf = await loadPDFTemplate('illinois_forms/il-1040-schedule-nr.pdf')

  const grossIncome = calculateGrossIncome(formData)
  const exemption = grossIncome > 250000 ? 0 : 2850
  const taxableIncome = Math.max(0, grossIncome - exemption)
  const { taxOwed } = taxResult.stateTax

  const fullName = `${formData.personalInfo.firstName} ${formData.personalInfo.lastName}`.trim()
  const ssnDigits = (formData.incomeInfo.ssn || '').replace(/\D/g, '')
  const ssn3 = ssnDigits.length >= 3 ? ssnDigits.slice(0, 3) : ssnDigits
  const ssn2 = ssnDigits.length >= 5 ? ssnDigits.slice(3, 5) : ''
  const ssn4 = ssnDigits.length >= 9 ? ssnDigits.slice(5, 9) : ''

  // --- Header: Full name (field 2), SSN in 3 parts (3, 4, 5) ---
  setTextField(pdf, 'Attach to your Form IL1040', fullName)
  setTextField(pdf, 'Your SSN-3', ssn3)
  setTextField(pdf, 'Your SSN-2', ssn2)
  setTextField(pdf, 'Your SSN-4', ssn4)

  // --- Step 1: Line 1 – full year resident? Check No ---
  setCheckboxField(
    pdf,
    'Step 1: Line 1 - check if you or your spouse  if "married filing jointly," were a full year resident of Illinois during the tax year?',
    false
  )

  // --- Step 3: Income (from tax calculation) ---
  const federalTotal = formatCurrencyForPDFWholeOnly(grossIncome)
  const illinoisTotal = formatCurrencyForPDFWholeOnly(grossIncome)

  setTextField(
    pdf,
    'Step 3: Line 5 - Column A Federal Total from  Wages, salaries, tips, etc. (federal Form 1040 or 1040-SR, Line 1z)',
    federalTotal
  )
  setTextField(
    pdf,
    'Step 3: Line 5 - Column B Illinois Portion from  Wages, salaries, tips, etc. (federal Form 1040 or 1040-SR, Line 1z)',
    illinoisTotal
  )
  setTextField(
    pdf,
    'Step 3: Line 6 - Column A Federal Total from Taxable interest (federal Form 1040 or 1040-SR, Line 2b)',
    ZERO
  )
  setTextField(
    pdf,
    'Step 3: Line 6 - Column B Illinois Portion from Taxable interest (federal Form 1040 or 1040-SR, Line 2b)',
    ZERO
  )
  setTextField(
    pdf,
    'Step 3: Line 19 - Column A Federal Total from Other income  See instructions.  (federal Form 1040 or 1040-SR, Schedule 1, Line 9) Include winnings from the Illinois State Lottery as Illinois income in Column B',
    ZERO
  )
  setTextField(
    pdf,
    'Step 3: Line 19 - Column B Illinois Portion from Other income.  See instructions.  (federal Form 1040 or 1040-SR, Schedule 1, Line 9) Include winnings from the Illinois State Lottery as Illinois income in Column B',
    ZERO
  )
  setTextField(
    pdf,
    'Step 3: Line 20 - Column B Illinois Portion add Column B, Lines 5 through 19. This is the Illinois portion of your federal total income',
    illinoisTotal
  )
  setTextField(
    pdf,
    'Step 3: Line 25 - Column A Federal Total from Moving expenses for members of the Armed Forces (federal Form 1040 or 1040-SR, Schedule 1, Line 14)',
    ZERO
  )
  setTextField(
    pdf,
    'Step 3: Line 25 - Column B Illinois Portion Moving expenses for members of the Armed Forces (federal Form 1040 or 1040-SR, Schedule 1, Line 14)',
    ZERO
  )
  setTextField(
    pdf,
    'Step 3: Line 35 - Column A Federal Total from Other adjustments (see instructions)',
    ZERO
  )
  setTextField(
    pdf,
    'Step 3: Line 35 - Column B Illinois Portion from Other adjustments (see instructions)',
    ZERO
  )
  setTextField(
    pdf,
    'Step 3: Line 37 - Columm A Federal Total Enter your adjusted gross income as reported on your Form IL-1040, Line 1',
    federalTotal
  )
  setTextField(
    pdf,
    'Line 38: Column B Illinois Portion Subtract Line 36 from Line 21.   This is the Illinois portion of your federal adjusted gross income',
    illinoisTotal
  )
  setTextField(
    pdf,
    'Step 4: Line 41 - Column B Illinois Portion Add Column B, Lines 38, 39, and 40. This is the Illinois portion of your total income',
    illinoisTotal
  )
  setTextField(
    pdf,
    'Step 4: Line 42 - Column A Form IL-1040 Total from Federally taxed Social Security and retirement income (Form IL-1040, Line 5)',
    ZERO
  )
  setTextField(
    pdf,
    'Step 5: Line 46 - Subtract Line 45 from Line 41. If Line 45 is larger than Line 41, enter zero. This is your illinois base income.  If line 46 is zero, skip Lines 47 through 51, and enter "0" on line 52',
    formatCurrencyForPDFWholeOnly(taxableIncome)
  )
  setTextField(
    pdf,
    'Step 5: Line 47 - Enter the base income from Form IL-1040, Line 9',
    formatCurrencyForPDFWholeOnly(grossIncome)
  )
  setTextField(pdf, 'step5-48', '1')
  setTextField(
    pdf,
    'Step 5: Line 48 - Divide Line 46 by Line 47 (round to three decimal places). Enter the appropriate decimal.  If Line 46 is greater than Line 47, enter 1.000',
    '000'
  )
  setTextField(
    pdf,
    'Step 5: Line 49 - Enter your exemption allowance from your Form IL-1040, Line 10',
    formatCurrencyForPDFWholeOnly(exemption)
  )
  setTextField(
    pdf,
    'Step 5: Line 50 - Multiply Line 49 by the decimal on Line 48. This is your Illinois exemption allowance',
    formatCurrencyForPDFWholeOnly(exemption)
  )
  setTextField(
    pdf,
    'Step 5: Line 51 - Subtract Line 50 from Line 46. This is your Illinois net income.  Enter the amount here and on your Form IL-1040, line 11',
    formatCurrencyForPDFWholeOnly(taxableIncome)
  )
  setTextField(
    pdf,
    'Step 5: Line 52 - Multiply the amount on Line 51 by 4.95% ( 0.0495). This amount may not be less than zero. Enter the amount here and on your Form IL-1040, Line 12. This is your tax',
    formatCurrencyForPDFWholeOnly(taxOwed)
  )

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
