/**
 * Illinois State Tax Return Package
 *
 * Single PDF: instruction pages (same styling as federal/8843) + IL-1040 + Schedule IL-WIT + Schedule NR.
 * Content based on state_instructions.pdf structure.
 */

import { PDFDocument, StandardFonts, rgb, PDFPage, PDFFont } from 'pdf-lib'
import { FormData } from '@/types/form'
import { TaxCalculationResult } from '../tax-calculation'
import { fillFormIL1040 } from './forms/formIL1040'
import { fillFormIL1040ScheduleNR } from './forms/formIL1040ScheduleNR'
import { fillFormIL1040ScheduleILWIT } from './forms/formIL1040ScheduleILWIT'

/* ─── Constants (matching federal-package) ─── */
const PAGE_WIDTH = 612
const PAGE_HEIGHT = 792
const MARGIN = 50
const LINE_HEIGHT = 15
const FONT_SIZE = 10
const FONT_SIZE_SM = 9
const FONT_SIZE_XS = 8
const FONT_SIZE_TITLE = 26
const FONT_SIZE_HEADING = 14

const COLOR_PRIMARY = rgb(14 / 255, 165 / 255, 233 / 255)    // #0ea5e9
const COLOR_PRIMARY_DARK = rgb(2 / 255, 132 / 255, 199 / 255) // #0284c7
const COLOR_PRIMARY_LIGHT = rgb(224 / 255, 242 / 255, 254 / 255) // #e0f2fe
const COLOR_DARK = rgb(15 / 255, 23 / 255, 42 / 255)           // #0f172a
const COLOR_TEXT = rgb(0.22, 0.22, 0.22)
const COLOR_MUTED = rgb(0.5, 0.5, 0.5)
const COLOR_RED = rgb(220 / 255, 38 / 255, 38 / 255)           // #dc2626
const COLOR_WHITE = rgb(1, 1, 1)
const COLOR_LIGHT_BG = rgb(0.97, 0.97, 0.97)
const COLOR_BORDER = rgb(0.84, 0.84, 0.84)

const ILLINOIS_EXEMPTION_SINGLE = 2850
const ILLINOIS_HIGH_INCOME = 250000

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

/* ─── Drawing Helpers (same as federal-package) ─── */

function drawPageHeader(page: PDFPage, fontBold: PDFFont, font: PDFFont): void {
  const y = PAGE_HEIGHT - 36
  page.drawText('f1taxmate', { x: MARGIN, y, size: 18, font: fontBold, color: COLOR_PRIMARY })
  const warningText = 'Instruction page only. Do not mail with your tax return.'
  const warningWidth = fontBold.widthOfTextAtSize(warningText, FONT_SIZE_XS)
  page.drawText(warningText, {
    x: PAGE_WIDTH - MARGIN - warningWidth,
    y: y + 3,
    size: FONT_SIZE_XS,
    font: fontBold,
    color: COLOR_RED,
  })
  page.drawLine({
    start: { x: MARGIN, y: y - 10 },
    end: { x: PAGE_WIDTH - MARGIN, y: y - 10 },
    thickness: 1.5,
    color: COLOR_PRIMARY,
  })
}

function drawPageNumber(page: PDFPage, font: PDFFont, pageNum: number): void {
  const text = `${pageNum}`
  const w = font.widthOfTextAtSize(text, FONT_SIZE_SM)
  page.drawText(text, {
    x: PAGE_WIDTH - MARGIN - w,
    y: 28,
    size: FONT_SIZE_SM,
    font,
    color: COLOR_MUTED,
  })
}

async function drawWrappedText(
  page: PDFPage,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  font: PDFFont,
  size: number = FONT_SIZE,
  color: ReturnType<typeof rgb> = COLOR_TEXT,
  lineHeight: number = LINE_HEIGHT
): Promise<number> {
  const words = text.split(/\s+/)
  let line = ''
  let currentY = y
  for (const word of words) {
    const testLine = line ? `${line} ${word}` : word
    const width = font.widthOfTextAtSize(testLine, size)
    if (width > maxWidth && line) {
      page.drawText(line, { x, y: currentY, size, font, color })
      currentY -= lineHeight
      line = word
    } else {
      line = testLine
    }
  }
  if (line) {
    page.drawText(line, { x, y: currentY, size, font, color })
    currentY -= lineHeight
  }
  return currentY
}

function drawTable(
  page: PDFPage,
  x: number,
  y: number,
  columns: { label: string; width: number }[],
  rows: string[][],
  font: PDFFont,
  fontBold: PDFFont,
): number {
  const rowHeight = 24
  const totalWidth = columns.reduce((s, c) => s + c.width, 0)

  page.drawRectangle({
    x, y: y - rowHeight, width: totalWidth, height: rowHeight, color: COLOR_PRIMARY,
  })
  let colX = x
  for (const col of columns) {
    page.drawText(col.label, {
      x: colX + 10, y: y - rowHeight + 8, size: FONT_SIZE, font: fontBold, color: COLOR_WHITE,
    })
    colX += col.width
  }
  let currentY = y - rowHeight

  for (let r = 0; r < rows.length; r++) {
    const rowY = currentY - rowHeight
    page.drawRectangle({
      x, y: rowY, width: totalWidth, height: rowHeight,
      color: r % 2 === 0 ? COLOR_WHITE : COLOR_LIGHT_BG,
    })
    page.drawLine({
      start: { x, y: currentY }, end: { x: x + totalWidth, y: currentY },
      thickness: 0.4, color: COLOR_BORDER,
    })
    colX = x
    for (let c = 0; c < columns.length; c++) {
      page.drawText(rows[r][c] ?? '', {
        x: colX + 10, y: rowY + 8, size: FONT_SIZE, font, color: COLOR_TEXT,
      })
      colX += columns[c].width
    }
    currentY = rowY
  }
  page.drawLine({
    start: { x, y: currentY }, end: { x: x + totalWidth, y: currentY },
    thickness: 0.4, color: COLOR_BORDER,
  })
  return currentY
}

function drawAddressCard(
  page: PDFPage,
  x: number,
  y: number,
  width: number,
  title: string,
  lines: string[],
  fontBold: PDFFont,
  font: PDFFont,
): number {
  const padding = 12
  const lineH = 13
  const titleH = 16

  page.drawText(title, {
    x, y, size: FONT_SIZE_SM, font: fontBold, color: COLOR_PRIMARY_DARK,
  })
  const cardTop = y - titleH
  const boxHeight = padding * 2 + lines.length * lineH
  const cardBottom = cardTop - boxHeight

  page.drawRectangle({ x, y: cardBottom, width, height: boxHeight, color: COLOR_PRIMARY_LIGHT })
  page.drawRectangle({ x, y: cardBottom, width: 3, height: boxHeight, color: COLOR_PRIMARY })
  page.drawRectangle({
    x, y: cardBottom, width, height: boxHeight,
    borderColor: COLOR_PRIMARY, borderWidth: 1,
  })

  let ty = cardTop - padding
  page.drawText(lines[0], {
    x: x + padding + 2, y: ty, size: FONT_SIZE_SM, font: fontBold, color: COLOR_DARK,
  })
  ty -= lineH
  for (let i = 1; i < lines.length; i++) {
    page.drawText(lines[i], {
      x: x + padding + 2, y: ty, size: FONT_SIZE_SM, font, color: COLOR_TEXT,
    })
    ty -= lineH
  }
  return cardBottom
}

function illinoisGrossIncome(formData: FormData): number {
  let total = 0
  formData.incomeInfo.w2Forms?.forEach((w2) => { total += w2?.wages ?? 0 })
  formData.incomeInfo.form1099INT?.forEach((f) => { total += f?.interestIncome ?? 0 })
  formData.incomeInfo.form1099MISC?.forEach((f) => { total += f?.otherIncome ?? 0 })
  return total
}

/* ─── Explanation Pages ─── */

async function addIllinoisExplanationPages(
  doc: PDFDocument,
  formData: FormData,
  taxResult: TaxCalculationResult
): Promise<void> {
  const font = await doc.embedFont(StandardFonts.Helvetica)
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold)
  const fontItalic = await doc.embedFont(StandardFonts.HelveticaOblique)
  const contentWidth = PAGE_WIDTH - 2 * MARGIN

  const grossIncome = illinoisGrossIncome(formData)
  const exemption = grossIncome > ILLINOIS_HIGH_INCOME ? 0 : ILLINOIS_EXEMPTION_SINGLE
  const netIncome = Math.floor(Math.max(0, grossIncome - exemption))
  const { taxOwed, refund, amountOwed } = taxResult.stateTax
  const totalPayments = taxOwed + refund - amountOwed

  const userName = `${formData.personalInfo.firstName} ${formData.personalInfo.lastName}`.toUpperCase()
  const userAddress = [
    formData.personalInfo.usAddress.address,
    formData.personalInfo.usAddress.addressLine2,
  ].filter(Boolean).join(', ')
  const userCityStateZip = [
    formData.personalInfo.usAddress.city,
    formData.personalInfo.usAddress.state,
    formData.personalInfo.usAddress.zipCode,
  ].filter(Boolean).join(', ')

  const w2Count = formData.incomeInfo.w2Forms?.length || 0

  let pageNum = 1

  // ─────────────────────────────────────────
  // PAGE 1: Instruction letter + Tax Summary
  // ─────────────────────────────────────────
  let page = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT])
  drawPageHeader(page, fontBold, font)
  let y = PAGE_HEIGHT - 80

  // User address block
  page.drawText(userName, { x: MARGIN, y, size: FONT_SIZE, font: fontBold, color: COLOR_DARK })
  y -= LINE_HEIGHT
  if (userAddress) {
    page.drawText(userAddress, { x: MARGIN, y, size: FONT_SIZE, font, color: COLOR_TEXT })
    y -= LINE_HEIGHT
  }
  page.drawText(userCityStateZip.toUpperCase(), { x: MARGIN, y, size: FONT_SIZE, font, color: COLOR_TEXT })
  y -= LINE_HEIGHT * 2.5

  // Greeting
  page.drawText(`Dear ${formData.personalInfo.firstName.toUpperCase()},`, {
    x: MARGIN, y, size: FONT_SIZE, font, color: COLOR_TEXT,
  })
  y -= LINE_HEIGHT * 1.5

  // Letter body
  const letterBody = `Enclosed please find two copies of your 2025 Illinois state income tax return, which you prepared through F1TaxMate tax software. File one copy with the Illinois Department of Revenue and retain the second copy for your records.`
  y = await drawWrappedText(page, letterBody, MARGIN, y, contentWidth, font)
  y -= LINE_HEIGHT * 1.8

  // ── Illinois Tax Summary ──
  page.drawText('Illinois Tax Summary', {
    x: MARGIN, y, size: FONT_SIZE_HEADING, font: fontBold, color: COLOR_PRIMARY,
  })
  y -= LINE_HEIGHT * 1.3

  // Summary table — same style as federal
  const tableX = MARGIN
  const tableW = contentWidth
  const tableRowH = 23
  const col1W = 260
  const summaryRows = [
    ['Base Income', formatCurrency(grossIncome)],
    ['Net Income', formatCurrency(netIncome)],
    ['Tax (4.95%)', formatCurrency(taxOwed)],
    ['Total Payments', formatCurrency(totalPayments)],
    ['Refund Amount', refund > 0 ? formatCurrency(refund) : amountOwed > 0 ? `(${formatCurrency(amountOwed)})` : formatCurrency(0)],
  ]

  let tableY = y
  for (let i = 0; i < summaryRows.length; i++) {
    const rowY = tableY - tableRowH
    page.drawRectangle({
      x: tableX, y: rowY, width: tableW, height: tableRowH,
      color: i % 2 === 0 ? COLOR_WHITE : COLOR_LIGHT_BG,
    })
    page.drawLine({
      start: { x: tableX, y: tableY }, end: { x: tableX + tableW, y: tableY },
      thickness: 0.4, color: COLOR_BORDER,
    })
    page.drawText(summaryRows[i][0], {
      x: tableX + 10, y: rowY + 8, size: FONT_SIZE, font: fontItalic, color: COLOR_TEXT,
    })
    page.drawText(summaryRows[i][1], {
      x: tableX + col1W + 10, y: rowY + 8, size: FONT_SIZE, font: fontBold, color: COLOR_DARK,
    })
    page.drawLine({
      start: { x: tableX + col1W, y: tableY }, end: { x: tableX + col1W, y: rowY },
      thickness: 0.4, color: COLOR_BORDER,
    })
    tableY = rowY
  }
  page.drawLine({ start: { x: tableX, y: tableY }, end: { x: tableX + tableW, y: tableY }, thickness: 0.4, color: COLOR_BORDER })
  page.drawLine({ start: { x: tableX, y }, end: { x: tableX, y: tableY }, thickness: 0.4, color: COLOR_BORDER })
  page.drawLine({ start: { x: tableX + tableW, y }, end: { x: tableX + tableW, y: tableY }, thickness: 0.4, color: COLOR_BORDER })

  y = tableY - 6
  page.drawText('* We have attached instructions detailing how to file your state tax return.', {
    x: MARGIN, y, size: FONT_SIZE_XS, font, color: COLOR_RED,
  })
  y -= LINE_HEIGHT * 2

  // ── How much is my refund? ──
  page.drawText('How much is my Illinois refund?', {
    x: MARGIN, y, size: FONT_SIZE_HEADING, font: fontBold, color: COLOR_PRIMARY,
  })
  y -= LINE_HEIGHT * 1.2
  if (refund > 0) {
    const refundLine1 = `Your Illinois state tax refund is `
    const refundAmount = formatCurrency(refund)
    const refundLine2 = `. This will be deposited directly into your bank account if you provided direct deposit details.`
    const w1 = font.widthOfTextAtSize(refundLine1, FONT_SIZE)
    const wAmt = fontBold.widthOfTextAtSize(refundAmount, FONT_SIZE)
    page.drawText(refundLine1, { x: MARGIN, y, size: FONT_SIZE, font, color: COLOR_TEXT })
    page.drawText(refundAmount, { x: MARGIN + w1, y, size: FONT_SIZE, font: fontBold, color: COLOR_PRIMARY_DARK })
    page.drawText(refundLine2, { x: MARGIN + w1 + wAmt, y, size: FONT_SIZE, font, color: COLOR_TEXT })
    y -= LINE_HEIGHT
  } else if (amountOwed > 0) {
    y = await drawWrappedText(
      page,
      `You owe ${formatCurrency(amountOwed)} to the Illinois Department of Revenue. Please include payment with your return.`,
      MARGIN, y, contentWidth, font
    )
  } else {
    y = await drawWrappedText(page, 'You have no refund or amount owed for Illinois.', MARGIN, y, contentWidth, font)
  }
  y -= LINE_HEIGHT * 1.8

  // ── How do I file my Illinois tax return? ──
  page.drawText('How do I file my Illinois tax return?', {
    x: MARGIN, y, size: FONT_SIZE_HEADING, font: fontBold, color: COLOR_PRIMARY,
  })
  y -= LINE_HEIGHT * 1.3

  y = await drawWrappedText(
    page,
    'Your Illinois state tax return must be received by April 18th. We recommend you mail your state return as soon as possible using the United States Post Office certified mail service to:',
    MARGIN, y, contentWidth, font, FONT_SIZE_SM
  )
  y -= LINE_HEIGHT * 0.5

  // Single address card (Illinois only has one mailing address)
  drawAddressCard(page, MARGIN, y, contentWidth / 2 + 20,
    'Via USPS Mail:',
    ['Illinois Department of Revenue', 'PO BOX 19027', 'Springfield, IL 62794-9027', 'USA'],
    fontBold, font
  )

  drawPageNumber(page, font, pageNum++)

  // ─────────────────────────────────────────
  // PAGE 2: Checklist
  // ─────────────────────────────────────────
  page = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT])
  drawPageHeader(page, fontBold, font)
  y = PAGE_HEIGHT - 80

  page.drawText('Illinois State Tax Return', {
    x: MARGIN, y, size: FONT_SIZE_TITLE, font: fontBold, color: COLOR_DARK,
  })
  y -= LINE_HEIGHT * 2
  page.drawText('checklist', {
    x: MARGIN, y, size: FONT_SIZE_TITLE, font: fontBold, color: COLOR_DARK,
  })
  y -= LINE_HEIGHT * 2.5

  // Step 1
  page.drawText('1.', { x: MARGIN, y, size: FONT_SIZE, font: fontBold, color: COLOR_RED })
  y = await drawWrappedText(
    page,
    'Review and sign the following form(s) where indicated with a pen mark.',
    MARGIN + 16, y, contentWidth - 16, font
  )
  y -= LINE_HEIGHT * 0.5

  y = drawTable(page, MARGIN, y,
    [
      { label: 'Form', width: 200 },
      { label: 'Action', width: contentWidth - 200 },
    ],
    [
      ['IL-1040', 'Sign on page 2'],
      ['Schedule NR', 'No signature required'],
      ['Schedule IL-WIT', 'No signature required'],
    ],
    font, fontBold
  )
  y -= LINE_HEIGHT * 1.5

  // Step 2
  page.drawText('2.', { x: MARGIN, y, size: FONT_SIZE, font: fontBold, color: COLOR_RED })
  y = await drawWrappedText(
    page,
    'Attach copies of all your income and tax withholding statements showing Illinois income sources you used to prepare your state return:',
    MARGIN + 16, y, contentWidth - 16, font
  )
  y -= LINE_HEIGHT * 0.5

  y = drawTable(page, MARGIN, y,
    [
      { label: 'Income Document', width: 300 },
      { label: 'Quantity', width: contentWidth - 300 },
    ],
    [
      [`W-2 form(s), Copy 2 *`, `${w2Count}`],
    ],
    font, fontBold
  )
  y -= LINE_HEIGHT * 0.6

  page.drawText('* – Attach Copy 2 of your W-2 forms (the state copy). This is different from the federal return which uses Copy B.', {
    x: MARGIN, y, size: FONT_SIZE_XS, font, color: COLOR_RED,
  })
  y -= LINE_HEIGHT * 1.8

  // Step 3
  page.drawText('3.', { x: MARGIN, y, size: FONT_SIZE, font: fontBold, color: COLOR_RED })
  y = await drawWrappedText(
    page,
    'Confirm that the SSN on all your W-2(s) is correct.',
    MARGIN + 16, y, contentWidth - 16, font
  )
  y -= LINE_HEIGHT * 0.2

  page.drawText('3.1.', { x: MARGIN + 20, y, size: FONT_SIZE_SM, font: fontBold, color: COLOR_RED })
  y = await drawWrappedText(
    page,
    "If you don't have your W-2(s) or your SSN on your payment document(s) is incorrect, then you'll need to obtain an updated W-2 from your employer(s).",
    MARGIN + 46, y, contentWidth - 46, font, FONT_SIZE_SM
  )
  y -= LINE_HEIGHT * 1.5

  // Step 4 – Mail
  page.drawText('4.', { x: MARGIN, y, size: FONT_SIZE, font: fontBold, color: COLOR_RED })
  y = await drawWrappedText(
    page,
    'Mail your Illinois state return with all necessary supporting documents and attachments as soon as possible using the United States Post Office certified mail service to:',
    MARGIN + 16, y, contentWidth - 16, font, FONT_SIZE_SM
  )
  y -= LINE_HEIGHT * 0.5

  drawAddressCard(page, MARGIN + 16, y, contentWidth / 2 + 10,
    'Via USPS Mail:',
    ['Illinois Department of Revenue', 'PO BOX 19027', 'Springfield, IL 62794-9027', 'USA'],
    fontBold, font
  )

  drawPageNumber(page, font, pageNum++)

  // ─────────────────────────────────────────
  // PAGE 3: FAQ
  // ─────────────────────────────────────────
  page = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT])
  drawPageHeader(page, fontBold, font)
  y = PAGE_HEIGHT - 80

  page.drawText('Illinois State Tax Return — Frequently Asked Questions', {
    x: MARGIN, y, size: FONT_SIZE_HEADING, font: fontBold, color: COLOR_PRIMARY,
  })
  y -= LINE_HEIGHT * 2

  const faqs = [
    {
      q: 'How long will it take to process my Illinois return?',
      a: 'The Illinois Department of Revenue typically processes returns within 8–12 weeks. You can check the status at mytax.illinois.gov.',
    },
    {
      q: 'What is the filing deadline for Illinois?',
      a: 'Illinois state tax returns must be filed by April 18th. Late filing can result in penalties and interest.',
    },
    {
      q: 'What is Schedule NR?',
      a: 'Schedule NR (Nonresident and Part-Year Resident Computation of Illinois Tax) is used to calculate the portion of income taxable by Illinois if you were a nonresident or part-year resident.',
    },
    {
      q: 'What is Schedule IL-WIT?',
      a: 'Schedule IL-WIT (Illinois Income Tax Withholding) reports the amount of Illinois income tax withheld from your wages or other payments during the year.',
    },
    {
      q: 'Which W-2 copy do I attach to my Illinois return?',
      a: 'Attach Copy 2 (the state copy) of your W-2 forms to your Illinois return. This is different from the federal return, which uses Copy B.',
    },
  ]

  for (const { q, a } of faqs) {
    if (y < 100) {
      page = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT])
      drawPageHeader(page, fontBold, font)
      y = PAGE_HEIGHT - 80
    }
    page.drawRectangle({ x: MARGIN, y: y - 2, width: 3, height: 14, color: COLOR_PRIMARY })
    page.drawText(q, { x: MARGIN + 10, y, size: FONT_SIZE, font: fontBold, color: COLOR_DARK })
    y -= LINE_HEIGHT * 1.1
    y = await drawWrappedText(page, a, MARGIN + 10, y, contentWidth - 10, font)
    y -= LINE_HEIGHT * 1.5
  }

  drawPageNumber(page, font, pageNum++)

  // ─────────────────────────────────────────
  // PAGE 4: FILING COPY cover page — full blue background
  // ─────────────────────────────────────────
  page = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT])

  page.drawRectangle({ x: 0, y: 0, width: PAGE_WIDTH, height: PAGE_HEIGHT, color: COLOR_PRIMARY })

  page.drawRectangle({
    x: 0, y: PAGE_HEIGHT / 2 - 80, width: PAGE_WIDTH, height: 280,
    color: COLOR_PRIMARY_DARK, opacity: 0.15,
  })

  const coverWarning = 'Instruction page only. Do not mail with your tax return.'
  const coverWarningW = font.widthOfTextAtSize(coverWarning, FONT_SIZE_XS)
  page.drawText(coverWarning, {
    x: PAGE_WIDTH - MARGIN - coverWarningW,
    y: PAGE_HEIGHT - 36,
    size: FONT_SIZE_XS,
    font: fontBold,
    color: COLOR_WHITE,
  })

  // Brand
  const brandText = 'f1taxmate'
  const brandW = fontBold.widthOfTextAtSize(brandText, 36)
  page.drawText(brandText, {
    x: (PAGE_WIDTH - brandW) / 2,
    y: PAGE_HEIGHT - 160,
    size: 36,
    font: fontBold,
    color: COLOR_WHITE,
  })

  const dividerW = 120
  page.drawLine({
    start: { x: (PAGE_WIDTH - dividerW) / 2, y: PAGE_HEIGHT - 185 },
    end: { x: (PAGE_WIDTH + dividerW) / 2, y: PAGE_HEIGHT - 185 },
    thickness: 1,
    color: COLOR_WHITE,
  })

  // Title
  const titleLine1 = 'Illinois State Tax Return'
  const t1W = fontBold.widthOfTextAtSize(titleLine1, 28)
  page.drawText(titleLine1, {
    x: (PAGE_WIDTH - t1W) / 2,
    y: PAGE_HEIGHT - 240,
    size: 28,
    font: fontBold,
    color: COLOR_WHITE,
  })

  // "for"
  const forText = 'for'
  const forW = font.widthOfTextAtSize(forText, 20)
  page.drawText(forText, {
    x: (PAGE_WIDTH - forW) / 2,
    y: PAGE_HEIGHT - 275,
    size: 20,
    font,
    color: COLOR_WHITE,
  })

  // User name
  const nameW = fontBold.widthOfTextAtSize(userName, 20)
  page.drawText(userName, {
    x: (PAGE_WIDTH - nameW) / 2,
    y: PAGE_HEIGHT - 330,
    size: 20,
    font: fontBold,
    color: COLOR_WHITE,
  })

  // Year
  const yearText = '2025'
  const yearW = font.widthOfTextAtSize(yearText, 18)
  page.drawText(yearText, {
    x: (PAGE_WIDTH - yearW) / 2,
    y: PAGE_HEIGHT - 360,
    size: 18,
    font,
    color: COLOR_WHITE,
  })

  page.drawLine({
    start: { x: (PAGE_WIDTH - dividerW) / 2, y: PAGE_HEIGHT - 400 },
    end: { x: (PAGE_WIDTH + dividerW) / 2, y: PAGE_HEIGHT - 400 },
    thickness: 1,
    color: COLOR_WHITE,
  })

  const filingCopyText = 'STATE FILING COPY'
  const fcW = fontBold.widthOfTextAtSize(filingCopyText, 13)
  page.drawText(filingCopyText, {
    x: (PAGE_WIDTH - fcW) / 2,
    y: PAGE_HEIGHT - 440,
    size: 13,
    font: fontBold,
    color: COLOR_WHITE,
  })

  const signText = 'SIGN AND MAIL TO THE ILLINOIS DEPARTMENT OF REVENUE'
  const stW = fontBold.widthOfTextAtSize(signText, 10)
  page.drawText(signText, {
    x: (PAGE_WIDTH - stW) / 2,
    y: PAGE_HEIGHT - 460,
    size: 10,
    font: fontBold,
    color: COLOR_WHITE,
  })

  // Footer
  const footerY = 46
  page.drawText('F1TaxMate', { x: MARGIN, y: footerY + 14, size: FONT_SIZE_SM, font: fontBold, color: COLOR_WHITE })
  page.drawText('f1taxmate.com', { x: MARGIN, y: footerY, size: FONT_SIZE_SM, font, color: COLOR_WHITE })
}

/**
 * Create the Illinois state package: instruction pages + IL-1040 + Schedule IL-WIT + Schedule NR.
 */
export async function createIllinoisPackage(
  formData: FormData,
  taxResult: TaxCalculationResult
): Promise<ArrayBuffer> {
  const doc = await PDFDocument.create()
  await addIllinoisExplanationPages(doc, formData, taxResult)

  const [il1040Buf, scheduleWITBuf, scheduleNRBuf] = await Promise.all([
    fillFormIL1040(formData, taxResult),
    fillFormIL1040ScheduleILWIT(formData, taxResult),
    fillFormIL1040ScheduleNR(formData, taxResult),
  ])

  const pdfIL1040 = await PDFDocument.load(il1040Buf)
  const pdfWIT = await PDFDocument.load(scheduleWITBuf)
  const pdfNR = await PDFDocument.load(scheduleNRBuf)

  for (const pdf of [pdfIL1040, pdfWIT, pdfNR]) {
    const n = pdf.getPageCount()
    if (n > 0) {
      const pages = await doc.copyPages(pdf, pdf.getPageIndices())
      pages.forEach((p) => doc.addPage(p))
    }
  }

  const bytes = await doc.save()
  return bytes.buffer.slice(0) as ArrayBuffer
}