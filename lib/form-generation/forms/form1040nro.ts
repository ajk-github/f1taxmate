/**
 * Form 1040-NR Schedule O (f1040nro.pdf) – Other Income.
 * Only fields with a mapping are filled; unmapped fields are left blank.
 */

import { FormData } from '@/types/form'
import {
  loadPDFTemplate,
  setTextField,
  setCheckboxField,
  formatSSN,
  getPDFAsArrayBuffer,
} from '../pdf-filler'
import type { Visit } from '@/types/form'
import {
  calculateDaysInUS2023,
  calculateDaysInUS2024,
  calculateDaysInUS2025,
} from '../utils/days-calculator'

const P = 'form1040-NR[0].Page1[0]'

/**
 * Get entry/exit dates for Line G (2025 only).
 * - "Date entered": 01/01/2025 if user was already in the US from 2024; otherwise first actual entry in 2025.
 * - "Date departed": only if they actually left during 2025; leave blank if still in US (no fake end date).
 * Multiple rows when they left and re-entered (each re-entry gets a new row; departed blank if current stay).
 * Use Date.UTC for 2025 boundaries so we never get 12/31/24 from timezone shift.
 */
function get2025EntryExitDates(visits: Visit[]): { entryDate: string; exitDate: string | null }[] {
  const yStart = new Date(Date.UTC(2025, 0, 1))   // Jan 1 2025 00:00 UTC
  const yEnd = new Date(Date.UTC(2025, 11, 31))    // Dec 31 2025 00:00 UTC

  const segments: { entry: Date; exit: Date | null }[] = []

  for (const visit of visits) {
    if (!visit.entryDate) continue
    const entry = new Date(visit.entryDate)
    entry.setHours(0, 0, 0, 0)
    // Visit must overlap 2025
    if (entry > yEnd) continue
    const exit = visit.exitDate ? new Date(visit.exitDate) : null
    if (exit) exit.setHours(0, 0, 0, 0)
    if (exit !== null && exit < yStart) continue

    // Entry for this row: 01/01/2025 if they were already in US on Jan 1; else actual entry in 2025
    const entryForRow = entry < yStart ? yStart : entry
    // Departed: only if they actually left during 2025; otherwise leave blank (no fake date)
    const exitForRow: Date | null =
      exit !== null && exit >= yStart && exit <= yEnd ? exit : null

    segments.push({ entry: entryForRow, exit: exitForRow })
  }

  // Sort by entry so first row is 01/01 or first 2025 entry
  segments.sort((a, b) => a.entry.getTime() - b.entry.getTime())

  // Format as mm/dd/yy using UTC so 01/01/2025 never becomes 12/30/24 or 12/31/24 in other timezones
  const toMMDDYY = (d: Date): string => {
    const y = d.getUTCFullYear()
    const m = String(d.getUTCMonth() + 1).padStart(2, '0')
    const day = String(d.getUTCDate()).padStart(2, '0')
    return `${m}/${day}/${String(y).slice(-2)}`
  }
  return segments.map((s) => ({
    entryDate: toMMDDYY(s.entry),
    exitDate: s.exit ? toMMDDYY(s.exit) : null,
  }))
}

export async function fillForm1040NRO(formData: FormData): Promise<ArrayBuffer> {
  const pdf = await loadPDFTemplate('federal_forms/f1040nro.pdf')

  // 1: Full Name
  const fullName = `${formData.personalInfo.firstName} ${formData.personalInfo.lastName}`.trim()
  setTextField(pdf, `${P}.f1_1[0]`, fullName)

  // 2: SSN with dashes
  setTextField(pdf, `${P}.f1_2[0]`, formatSSN(formData.incomeInfo.ssn || ''))

  // 3, 4: Home Country (from Personal Info)
  const homeCountry = formData.personalInfo.foreignAddress?.country || ''
  setTextField(pdf, `${P}.f1_3[0]`, homeCountry)
  setTextField(pdf, `${P}.f1_4[0]`, homeCountry)

  // 5–6: c1_1 — Check No
  setCheckboxField(pdf, `${P}.c1_1[0]`, false)
  setCheckboxField(pdf, `${P}.c1_1[1]`, true)

  // 7–8: c1_2 — Check No
  setCheckboxField(pdf, `${P}.c1_2[0]`, false)
  setCheckboxField(pdf, `${P}.c1_2[1]`, true)

  // 9–10: c1_3 — Check No
  setCheckboxField(pdf, `${P}.c1_3[0]`, false)
  setCheckboxField(pdf, `${P}.c1_3[1]`, true)

  // 11: Visa Type from form
  setTextField(pdf, `${P}.f1_5[0]`, formData.personalInfo.visaType || '')

  // 12–13: c1_4 — Check No
  setCheckboxField(pdf, `${P}.c1_4[0]`, false)
  setCheckboxField(pdf, `${P}.c1_4[1]`, true)

  // 14: f1_6 — no mapping, leave blank

  // 15–16: c1_5 — no mapping, leave default

  // 17–32: Line G — entry/exit dates during 2025 only (col1 = date entered, col2 = date departed); two tables, 4 rows each. Format mm/dd/yy.
  const lineGTable1 = [
    { entry: `${P}.LineG_Table1[0].BodyRow1[0].f1_7[0]`, exit: `${P}.LineG_Table1[0].BodyRow1[0].f1_8[0]` },
    { entry: `${P}.LineG_Table1[0].BodyRow2[0].f1_9[0]`, exit: `${P}.LineG_Table1[0].BodyRow2[0].f1_10[0]` },
    { entry: `${P}.LineG_Table1[0].BodyRow3[0].f1_11[0]`, exit: `${P}.LineG_Table1[0].BodyRow3[0].f1_12[0]` },
    { entry: `${P}.LineG_Table1[0].BodyRow4[0].f1_13[0]`, exit: `${P}.LineG_Table1[0].BodyRow4[0].f1_14[0]` },
  ]
  const lineGTable2 = [
    { entry: `${P}.LineG_Table2[0].BodyRow1[0].f1_15[0]`, exit: `${P}.LineG_Table2[0].BodyRow1[0].f1_16[0]` },
    { entry: `${P}.LineG_Table2[0].BodyRow2[0].f1_17[0]`, exit: `${P}.LineG_Table2[0].BodyRow2[0].f1_18[0]` },
    { entry: `${P}.LineG_Table2[0].BodyRow3[0].f1_19[0]`, exit: `${P}.LineG_Table2[0].BodyRow3[0].f1_20[0]` },
    { entry: `${P}.LineG_Table2[0].BodyRow4[0].f1_21[0]`, exit: `${P}.LineG_Table2[0].BodyRow4[0].f1_22[0]` },
  ]
  const lineGAllRows = [...lineGTable1, ...lineGTable2]
  const visits2025 = get2025EntryExitDates(formData.residencyInfo?.visits || [])
  visits2025.slice(0, 8).forEach(({ entryDate, exitDate }, i) => {
    const row = lineGAllRows[i]
    if (row) {
      setTextField(pdf, row.entry, entryDate)
      setTextField(pdf, row.exit, exitDate ?? '')
    }
  })

  // 33–35: Days in US 2023, 2024, 2025 (from days calc used for 8843)
  const days2023 = calculateDaysInUS2023(formData.residencyInfo)
  const days2024 = calculateDaysInUS2024(formData.residencyInfo)
  const days2025 = calculateDaysInUS2025(formData.residencyInfo)
  setTextField(pdf, `${P}.f1_23[0]`, String(days2023))
  setTextField(pdf, `${P}.f1_24[0]`, String(days2024))
  setTextField(pdf, `${P}.f1_25[0]`, String(days2025))

  // 36–37: c1_6 — Check Yes
  setCheckboxField(pdf, `${P}.c1_6[0]`, true)
  setCheckboxField(pdf, `${P}.c1_6[1]`, false)

  // 38: Tax year and form filed — e.g. "2024, 1040NR"
  const residency = formData.residencyInfo
  if (residency?.hasFiledTaxReturnBefore && residency?.yearFiled && residency?.formUsed) {
    setTextField(pdf, `${P}.f1_26[0]`, `${residency.yearFiled}, ${residency.formUsed}`)
  }

  // 39–40: c1_7 — Check No
  setCheckboxField(pdf, `${P}.c1_7[0]`, false)
  setCheckboxField(pdf, `${P}.c1_7[1]`, true)

  // 41–42: c1_8 — no mapping
  // 43–44: c1_9 — Check No
  setCheckboxField(pdf, `${P}.c1_9[0]`, false)
  setCheckboxField(pdf, `${P}.c1_9[1]`, true)

  // 45–46: c1_10 — no mapping
  // 47–59: Line L1 table and f1_39 — no mapping
  // 60–61: c1_11 — Check No
  setCheckboxField(pdf, `${P}.c1_11[0]`, false)
  setCheckboxField(pdf, `${P}.c1_11[1]`, true)

  // 62–63: c1_12 — Check No
  setCheckboxField(pdf, `${P}.c1_12[0]`, false)
  setCheckboxField(pdf, `${P}.c1_12[1]`, true)

  // 64: c1_13 — no mapping
  // 65: c1_14 — no mapping

  return await getPDFAsArrayBuffer(pdf)
}
