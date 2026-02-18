/**
 * Federal Tax Return Package
 *
 * Single PDF: explanation pages (f1taxmate.com theme, Sprintax-style layout)
 *   + f1040nr + f1040nro (filled) + f8843.
 * No watermark. User data (income, tax, refund) from formData and taxResult.
 */

import {
  PDFDocument,
  StandardFonts,
  rgb,
  PDFPage,
  PDFFont,
} from 'pdf-lib'
import { FormData } from '@/types/form'
import { TaxCalculationResult } from '../tax-calculation'
import { fillForm1040NR } from './forms/form1040nr'
import { fillForm1040NRO } from './forms/form1040nro'
import { fillForm8843 } from './forms/form8843'

/* ─── Constants ─── */
const PAGE_WIDTH = 612
const PAGE_HEIGHT = 792
const MARGIN = 50
const LINE_HEIGHT = 15
const FONT_SIZE = 10
const FONT_SIZE_SM = 9
const FONT_SIZE_XS = 8
const FONT_SIZE_TITLE = 26
const FONT_SIZE_HEADING = 14
const FONT_SIZE_SUBHEADING = 11

// f1taxmate.com blue-and-white theme
const COLOR_PRIMARY = rgb(14 / 255, 165 / 255, 233 / 255)    // #0ea5e9
const COLOR_PRIMARY_DARK = rgb(2 / 255, 132 / 255, 199 / 255) // #0284c7
const COLOR_PRIMARY_LIGHT = rgb(224 / 255, 242 / 255, 254 / 255) // #e0f2fe  very light blue tint
const COLOR_DARK = rgb(15 / 255, 23 / 255, 42 / 255)           // #0f172a slate-900
const COLOR_TEXT = rgb(0.22, 0.22, 0.22)
const COLOR_MUTED = rgb(0.5, 0.5, 0.5)
const COLOR_RED = rgb(220 / 255, 38 / 255, 38 / 255)           // #dc2626 red-600
const COLOR_WHITE = rgb(1, 1, 1)
const COLOR_LIGHT_BG = rgb(0.97, 0.97, 0.97)
const COLOR_BORDER = rgb(0.84, 0.84, 0.84)

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

/* ─── Drawing Helpers ─── */

/** Draw page header: brand left + thin blue accent line + warning right */
function drawPageHeader(
  page: PDFPage,
  fontBold: PDFFont,
  font: PDFFont,
): void {
  const y = PAGE_HEIGHT - 36
  // Brand
  page.drawText('f1taxmate', { x: MARGIN, y, size: 18, font: fontBold, color: COLOR_PRIMARY })
  // Instruction warning (right-aligned, red/bold)
  const warningText = 'Instruction page only. Do not mail with your tax return.'
  const warningWidth = fontBold.widthOfTextAtSize(warningText, FONT_SIZE_XS)
  page.drawText(warningText, {
    x: PAGE_WIDTH - MARGIN - warningWidth,
    y: y + 3,
    size: FONT_SIZE_XS,
    font: fontBold,
    color: COLOR_RED,
  })
  // Thin blue accent line under header
  page.drawLine({
    start: { x: MARGIN, y: y - 10 },
    end: { x: PAGE_WIDTH - MARGIN, y: y - 10 },
    thickness: 1.5,
    color: COLOR_PRIMARY,
  })
}

/** Draw page number at bottom right */
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

/** Draw wrapped text and return the new Y position */
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

/**
 * Draw a table with a colored header row.
 * Returns the Y position after the table.
 */
function drawTable(
  page: PDFPage,
  x: number,
  y: number,
  columns: { label: string; width: number }[],
  rows: string[][],
  font: PDFFont,
  fontBold: PDFFont,
  options?: {
    headerBg?: ReturnType<typeof rgb>
    headerColor?: ReturnType<typeof rgb>
    fontSize?: number
    rowHeight?: number
  }
): number {
  const opts = {
    headerBg: COLOR_PRIMARY,
    headerColor: COLOR_WHITE,
    fontSize: FONT_SIZE,
    rowHeight: 24,
    ...options,
  }
  const totalWidth = columns.reduce((s, c) => s + c.width, 0)

  // Header row
  page.drawRectangle({
    x,
    y: y - opts.rowHeight,
    width: totalWidth,
    height: opts.rowHeight,
    color: opts.headerBg,
  })
  let colX = x
  for (const col of columns) {
    page.drawText(col.label, {
      x: colX + 10,
      y: y - opts.rowHeight + 8,
      size: opts.fontSize,
      font: fontBold,
      color: opts.headerColor,
    })
    colX += col.width
  }
  let currentY = y - opts.rowHeight

  // Data rows
  for (let r = 0; r < rows.length; r++) {
    const rowY = currentY - opts.rowHeight
    // Alternating light tint
    if (r % 2 === 0) {
      page.drawRectangle({
        x, y: rowY, width: totalWidth, height: opts.rowHeight, color: COLOR_WHITE,
      })
    } else {
      page.drawRectangle({
        x, y: rowY, width: totalWidth, height: opts.rowHeight, color: COLOR_LIGHT_BG,
      })
    }
    // Row border
    page.drawLine({
      start: { x, y: currentY }, end: { x: x + totalWidth, y: currentY },
      thickness: 0.4, color: COLOR_BORDER,
    })
    colX = x
    for (let c = 0; c < columns.length; c++) {
      page.drawText(rows[r][c] || '', {
        x: colX + 10, y: rowY + 8, size: opts.fontSize, font, color: COLOR_TEXT,
      })
      colX += columns[c].width
    }
    currentY = rowY
  }
  // Bottom border
  page.drawLine({
    start: { x, y: currentY }, end: { x: x + totalWidth, y: currentY },
    thickness: 0.4, color: COLOR_BORDER,
  })

  return currentY
}

/**
 * Draw a labeled address card with a title above, blue left-accent bar,
 * light-blue background, and content inside.
 * Returns the Y position after the card.
 */
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

  // Title label above the card (e.g. "Via USPS Certified Mail:")
  page.drawText(title, {
    x, y, size: FONT_SIZE_SM, font: fontBold, color: COLOR_PRIMARY_DARK,
  })
  const cardTop = y - titleH

  const boxHeight = padding * 2 + lines.length * lineH
  const cardBottom = cardTop - boxHeight

  // Light blue background fill
  page.drawRectangle({
    x, y: cardBottom, width, height: boxHeight, color: COLOR_PRIMARY_LIGHT,
  })
  // Left accent bar
  page.drawRectangle({
    x, y: cardBottom, width: 3, height: boxHeight, color: COLOR_PRIMARY,
  })
  // Outer border
  page.drawRectangle({
    x, y: cardBottom, width, height: boxHeight,
    borderColor: COLOR_PRIMARY, borderWidth: 1,
  })

  // Address text
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

/* ─── Main Explanation Pages ─── */

async function addExplanationPages(
  doc: PDFDocument,
  formData: FormData,
  taxResult: TaxCalculationResult
): Promise<void> {
  const font = await doc.embedFont(StandardFonts.Helvetica)
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold)
  const fontItalic = await doc.embedFont(StandardFonts.HelveticaOblique)
  const contentWidth = PAGE_WIDTH - 2 * MARGIN

  const grossIncome = calculateGrossIncome(formData)
  const standardDeduction = 15750
  const taxableIncome = Math.max(0, grossIncome - standardDeduction)
  const federalWithheld = calculateFederalTaxWithheld(formData)
  const refund = taxResult.federalTax.refund
  const amountOwed = taxResult.federalTax.amountOwed || 0
  const filingStatus = 'Other single nonresident alien'
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
  // PAGE 1: Main instruction page
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
  const letterBody = `Enclosed please find two copies of your 2025 federal income tax return, which you prepared through F1TaxMate tax software. File one copy with the Internal Revenue Service and retain the second copy for your records.`
  y = await drawWrappedText(page, letterBody, MARGIN, y, contentWidth, font, FONT_SIZE, COLOR_TEXT)
  y -= LINE_HEIGHT * 1.8

  // ── Tax Summary ──
  page.drawText('Tax Summary', {
    x: MARGIN, y, size: FONT_SIZE_HEADING, font: fontBold, color: COLOR_PRIMARY,
  })
  y -= LINE_HEIGHT * 1.3

  // Tax Summary table — clean bordered rows, alternating bg, no colored header
  const tableX = MARGIN
  const tableW = contentWidth
  const tableRowH = 23
  const col1W = 260
  const summaryRows = [
    ['Filing Status', filingStatus],
    ['Gross Income', formatCurrency(grossIncome)],
    ['Federal Adjusted Gross Income', formatCurrency(grossIncome)],
    ['Federal Taxable Income', formatCurrency(taxableIncome)],
    ['Refund Amount', refund > 0 ? formatCurrency(refund) : `(${formatCurrency(amountOwed)})`],
  ]

  let tableY = y
  for (let i = 0; i < summaryRows.length; i++) {
    const rowY = tableY - tableRowH
    // Alternating row background
    page.drawRectangle({
      x: tableX, y: rowY, width: tableW, height: tableRowH,
      color: i % 2 === 0 ? COLOR_WHITE : COLOR_LIGHT_BG,
    })
    // Top border
    page.drawLine({
      start: { x: tableX, y: tableY }, end: { x: tableX + tableW, y: tableY },
      thickness: 0.4, color: COLOR_BORDER,
    })
    // Label (left, italic)
    page.drawText(summaryRows[i][0], {
      x: tableX + 10, y: rowY + 8, size: FONT_SIZE, font: fontItalic, color: COLOR_TEXT,
    })
    // Value (right column, bold)
    page.drawText(summaryRows[i][1], {
      x: tableX + col1W + 10, y: rowY + 8, size: FONT_SIZE, font: fontBold, color: COLOR_DARK,
    })
    // Vertical divider
    page.drawLine({
      start: { x: tableX + col1W, y: tableY }, end: { x: tableX + col1W, y: rowY },
      thickness: 0.4, color: COLOR_BORDER,
    })
    tableY = rowY
  }
  // Borders: bottom, left, right
  page.drawLine({ start: { x: tableX, y: tableY }, end: { x: tableX + tableW, y: tableY }, thickness: 0.4, color: COLOR_BORDER })
  page.drawLine({ start: { x: tableX, y }, end: { x: tableX, y: tableY }, thickness: 0.4, color: COLOR_BORDER })
  page.drawLine({ start: { x: tableX + tableW, y }, end: { x: tableX + tableW, y: tableY }, thickness: 0.4, color: COLOR_BORDER })

  y = tableY - 6

  // Note below table
  page.drawText('* We have attached instructions detailing how to file your tax return with the IRS.', {
    x: MARGIN, y, size: FONT_SIZE_XS, font, color: COLOR_RED,
  })
  y -= LINE_HEIGHT * 2

  // ── How much is my refund? ──
  page.drawText('How much is my refund?', {
    x: MARGIN, y, size: FONT_SIZE_HEADING, font: fontBold, color: COLOR_PRIMARY,
  })
  y -= LINE_HEIGHT * 1.2
  if (refund > 0) {
    // Inline highlight for the refund amount
    const refundLine1 = `Your federal tax refund is `
    const refundAmount = `${formatCurrency(refund)}`
    const refundLine2 = `. This will be deposited directly into your checking account.`
    const w1 = font.widthOfTextAtSize(refundLine1, FONT_SIZE)
    const wAmt = fontBold.widthOfTextAtSize(refundAmount, FONT_SIZE)
    page.drawText(refundLine1, { x: MARGIN, y, size: FONT_SIZE, font, color: COLOR_TEXT })
    page.drawText(refundAmount, { x: MARGIN + w1, y, size: FONT_SIZE, font: fontBold, color: COLOR_PRIMARY_DARK })
    page.drawText(refundLine2, { x: MARGIN + w1 + wAmt, y, size: FONT_SIZE, font, color: COLOR_TEXT })
    y -= LINE_HEIGHT
  } else if (amountOwed > 0) {
    y = await drawWrappedText(
      page,
      `You owe ${formatCurrency(amountOwed)} to the IRS. Please include payment with your return.`,
      MARGIN, y, contentWidth, font
    )
  } else {
    y = await drawWrappedText(page, 'You have no refund or amount owed.', MARGIN, y, contentWidth, font)
  }
  y -= LINE_HEIGHT * 1.8

  // ── How do I file my tax return? ──
  page.drawText('How do I file my tax return?', {
    x: MARGIN, y, size: FONT_SIZE_HEADING, font: fontBold, color: COLOR_PRIMARY,
  })
  y -= LINE_HEIGHT * 1.3

  // Two-column layout for mailing instructions
  const colLeftX = MARGIN
  const colRightX = MARGIN + contentWidth / 2 + 12
  const colW = contentWidth / 2 - 12

  let leftY = y
  leftY = await drawWrappedText(
    page,
    'Your tax return must be received by April 15th. However, we recommend you mail your federal return as soon as possible using the United States Post Office certified mail service to:',
    colLeftX, leftY, colW, font, FONT_SIZE_SM
  )

  let rightY = y
  rightY = await drawWrappedText(
    page,
    'If you want to use approved Private Delivery Service, please mail it to:',
    colRightX, rightY, colW, font, FONT_SIZE_SM
  )

  // Address cards with clear labels
  const cardY = Math.min(leftY, rightY) - 8
  const cardW = colW - 4

  drawAddressCard(page, colLeftX, cardY, cardW,
    'Via USPS Certified Mail:',
    ['Department of the Treasury', 'Internal Revenue Service', 'Austin, TX 73301-0215, USA'],
    fontBold, font
  )

  drawAddressCard(page, colRightX, cardY, cardW,
    'Via Private Delivery Service:',
    ['Austin – Internal Revenue', 'Submission Processing Center', '3651 S IH35,', 'Austin, TX 78741, USA'],
    fontBold, font
  )

  drawPageNumber(page, font, pageNum++)

  // ─────────────────────────────────────────
  // PAGE 2: When will I receive my refund?
  // ─────────────────────────────────────────
  page = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT])
  drawPageHeader(page, fontBold, font)
  y = PAGE_HEIGHT - 80

  page.drawText('When will I receive my refund?', {
    x: MARGIN, y, size: FONT_SIZE_HEADING, font: fontBold, color: COLOR_PRIMARY,
  })
  y -= LINE_HEIGHT * 1.5

  const refundText = `The IRS typically takes 4–6 weeks to process your return. You can check the status at any time using "Where's My Refund?" at www.IRS.gov, or call the IRS TeleTax System at 800-829-4477 or the Refund Hotline at 800-829-1954. When you call or go online, have ready: the SSN/ITIN on your return, your filing status, and the exact refund amount.`
  y = await drawWrappedText(page, refundText, MARGIN, y, contentWidth, font)

  drawPageNumber(page, font, pageNum++)

  // ─────────────────────────────────────────
  // PAGE 3: Checklist
  // ─────────────────────────────────────────
  page = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT])
  drawPageHeader(page, fontBold, font)
  y = PAGE_HEIGHT - 80

  // Title block
  page.drawText('Federal Tax Return', {
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
      ['1040-NR', 'Sign on page 2'],
      ['8843', 'No need to sign when attached to 1040-NR'],
    ],
    font, fontBold
  )
  y -= LINE_HEIGHT * 1.5

  // Step 2
  page.drawText('2.', { x: MARGIN, y, size: FONT_SIZE, font: fontBold, color: COLOR_RED })
  y = await drawWrappedText(
    page,
    'Attach copies of all your income and tax withholding statements showing the US income sources you used to prepare your tax return:',
    MARGIN + 16, y, contentWidth - 16, font
  )
  y -= LINE_HEIGHT * 0.5

  y = drawTable(page, MARGIN, y,
    [
      { label: 'Income Document', width: 300 },
      { label: 'Quantity', width: contentWidth - 300 },
    ],
    [
      ['W-2 form(s), Copy B *', `${w2Count}`],
    ],
    font, fontBold
  )
  y -= LINE_HEIGHT * 0.6

  page.drawText('* – If there is a difference between copies B and C, please attach Copy C to your Federal tax return.', {
    x: MARGIN, y, size: FONT_SIZE_XS, font, color: COLOR_RED,
  })
  y -= LINE_HEIGHT * 1.8

  // Step 3
  page.drawText('3.', { x: MARGIN, y, size: FONT_SIZE, font: fontBold, color: COLOR_RED })
  y = await drawWrappedText(
    page,
    'Confirm that the SSN on all your W2(s) is correct.',
    MARGIN + 16, y, contentWidth - 16, font
  )
  y -= LINE_HEIGHT * 0.2

  page.drawText('3.1.', { x: MARGIN + 20, y, size: FONT_SIZE_SM, font: fontBold, color: COLOR_RED })
  y = await drawWrappedText(
    page,
    "If you don't have your W2(s) or your SSN on your payment document(s) is incorrect, then you'll need to obtain an updated W2 from your employer(s).",
    MARGIN + 46, y, contentWidth - 46, font, FONT_SIZE_SM
  )
  y -= LINE_HEIGHT * 1.5

  // Step 4 – Mail instructions with labeled address cards
  page.drawText('4.', { x: MARGIN, y, size: FONT_SIZE, font: fontBold, color: COLOR_RED })

  const step4ColLeftX = MARGIN + 16
  const step4ColRightX = MARGIN + contentWidth / 2 + 12
  const step4ColW = contentWidth / 2 - 20

  let step4LeftY = y
  step4LeftY = await drawWrappedText(
    page,
    'We recommend you mail your federal return with all necessary supporting documents and attachments as soon as possible using the United States Post Office certified mail service to:',
    step4ColLeftX, step4LeftY, step4ColW, font, FONT_SIZE_SM
  )

  let step4RightY = y
  step4RightY = await drawWrappedText(
    page,
    'If you want to use approved Private Delivery Service, please mail it to:',
    step4ColRightX, step4RightY, step4ColW, font, FONT_SIZE_SM
  )

  const step4CardY = Math.min(step4LeftY, step4RightY) - 8
  const step4CardW = step4ColW

  drawAddressCard(page, step4ColLeftX, step4CardY, step4CardW,
    'Via USPS Certified Mail:',
    ['Department of the Treasury', 'Internal Revenue Service', 'Austin, TX 73301-0215, USA'],
    fontBold, font
  )

  drawAddressCard(page, step4ColRightX, step4CardY, step4CardW,
    'Via Private Delivery Service:',
    ['Austin – Internal Revenue', 'Submission Processing Center', '3651 S IH35,', 'Austin, TX 78741, USA'],
    fontBold, font
  )

  drawPageNumber(page, font, pageNum++)

  // ─────────────────────────────────────────
  // PAGE 4: FAQ
  // ─────────────────────────────────────────
  page = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT])
  drawPageHeader(page, fontBold, font)
  y = PAGE_HEIGHT - 80

  page.drawText('Federal Tax Return — Frequently Asked Questions', {
    x: MARGIN, y, size: FONT_SIZE_HEADING, font: fontBold, color: COLOR_PRIMARY,
  })
  y -= LINE_HEIGHT * 2

  const faqs = [
    { q: 'How long will it take to process my return?', a: 'The IRS typically takes 4–6 weeks. Exact timelines are set by the IRS.' },
    { q: 'What is the April 15th deadline?', a: 'All tax returns for the prior year must be filed by April 15th. Late filing can result in penalties and interest.' },
    { q: 'What is a W-2 form?', a: 'The W-2 shows wages and tax withheld. You receive it from your employer(s) by January. Attach Copy B to your return.' },
    { q: "What if I don't have a Social Security Number?", a: 'You may need an ITIN (Individual Taxpayer Identification Number). See IRS instructions for applying.' },
  ]
  for (const { q, a } of faqs) {
    if (y < 100) {
      page = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT])
      drawPageHeader(page, fontBold, font)
      y = PAGE_HEIGHT - 80
    }
    // Question with small blue accent bar to the left
    page.drawRectangle({ x: MARGIN, y: y - 2, width: 3, height: 14, color: COLOR_PRIMARY })
    page.drawText(q, { x: MARGIN + 10, y, size: FONT_SIZE, font: fontBold, color: COLOR_DARK })
    y -= LINE_HEIGHT * 1.1
    y = await drawWrappedText(page, a, MARGIN + 10, y, contentWidth - 10, font)
    y -= LINE_HEIGHT * 1.5
  }

  drawPageNumber(page, font, pageNum++)

  // ─────────────────────────────────────────
  // PAGE 5: FEDERAL FILING COPY cover page
  //   — Full blue background, centered text, modern layout
  // ─────────────────────────────────────────
  page = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT])

  // Full-page blue background
  page.drawRectangle({ x: 0, y: 0, width: PAGE_WIDTH, height: PAGE_HEIGHT, color: COLOR_PRIMARY })

  // Subtle darker band across the middle
  page.drawRectangle({
    x: 0, y: PAGE_HEIGHT / 2 - 80, width: PAGE_WIDTH, height: 280,
    color: COLOR_PRIMARY_DARK, opacity: 0.15,
  })

  // "Instruction page only" at top right in white
  const coverWarning = 'Instruction page only. Do not mail with your tax return.'
  const coverWarningW = font.widthOfTextAtSize(coverWarning, FONT_SIZE_XS)
  page.drawText(coverWarning, {
    x: PAGE_WIDTH - MARGIN - coverWarningW,
    y: PAGE_HEIGHT - 36,
    size: FONT_SIZE_XS,
    font: fontBold,
    color: COLOR_WHITE,
  })

  // Brand name
  const brandText = 'f1taxmate'
  const brandW = fontBold.widthOfTextAtSize(brandText, 36)
  page.drawText(brandText, {
    x: (PAGE_WIDTH - brandW) / 2,
    y: PAGE_HEIGHT - 160,
    size: 36,
    font: fontBold,
    color: COLOR_WHITE,
  })

  // Thin white divider line
  const dividerW = 120
  page.drawLine({
    start: { x: (PAGE_WIDTH - dividerW) / 2, y: PAGE_HEIGHT - 185 },
    end: { x: (PAGE_WIDTH + dividerW) / 2, y: PAGE_HEIGHT - 185 },
    thickness: 1,
    color: COLOR_WHITE,
  })

  // "Federal Tax Return"
  const titleLine1 = 'Federal Tax Return'
  const t1W = fontBold.widthOfTextAtSize(titleLine1, 30)
  page.drawText(titleLine1, {
    x: (PAGE_WIDTH - t1W) / 2,
    y: PAGE_HEIGHT - 240,
    size: 30,
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

  // Thin white divider
  page.drawLine({
    start: { x: (PAGE_WIDTH - dividerW) / 2, y: PAGE_HEIGHT - 400 },
    end: { x: (PAGE_WIDTH + dividerW) / 2, y: PAGE_HEIGHT - 400 },
    thickness: 1,
    color: COLOR_WHITE,
  })

  // Filing copy text
  const filingCopyText = 'FEDERAL FILING COPY'
  const fcW = fontBold.widthOfTextAtSize(filingCopyText, 13)
  page.drawText(filingCopyText, {
    x: (PAGE_WIDTH - fcW) / 2,
    y: PAGE_HEIGHT - 440,
    size: 13,
    font: fontBold,
    color: COLOR_WHITE,
  })

  const signText = 'SIGN AND MAIL TO THE INTERNAL REVENUE SERVICE'
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

function calculateGrossIncome(formData: FormData): number {
  let total = 0
  formData.incomeInfo.w2Forms?.forEach((w2) => { total += w2?.wages || 0 })
  formData.incomeInfo.form1099INT?.forEach((f) => { total += f?.interestIncome || 0 })
  formData.incomeInfo.form1099MISC?.forEach((f) => { total += f?.otherIncome || 0 })
  return total
}

function calculateFederalTaxWithheld(formData: FormData): number {
  let total = 0
  formData.incomeInfo.w2Forms?.forEach((w2) => { total += w2?.federalTaxWithheld || 0 })
  formData.incomeInfo.form1099INT?.forEach((f) => { total += f?.federalTaxWithheld || 0 })
  formData.incomeInfo.form1099MISC?.forEach((f) => { total += f?.federalTaxWithheld || 0 })
  return total
}

/**
 * Create the full federal package: explanation pages + f1040nr + f1040nro (blank) + f8843.
 */
export async function createFederalPackage(
  formData: FormData,
  taxResult: TaxCalculationResult
): Promise<ArrayBuffer> {
  const doc = await PDFDocument.create()
  await addExplanationPages(doc, formData, taxResult)

  const [f1040nrBuf, f1040nroBuf, f8843Buf] = await Promise.all([
    fillForm1040NR(formData, taxResult),
    fillForm1040NRO(formData),
    fillForm8843(formData),
  ])

  const pdf1040nr = await PDFDocument.load(f1040nrBuf)
  const pdf1040nro = await PDFDocument.load(f1040nroBuf)
  const pdf8843 = await PDFDocument.load(f8843Buf)

  const num1040nr = pdf1040nr.getPageCount()
  if (num1040nr === 0) throw new Error('Form 1040-NR has no pages.')
  const arr1040nr = await doc.copyPages(pdf1040nr, pdf1040nr.getPageIndices())
  arr1040nr.forEach((p) => doc.addPage(p))

  const num1040nro = pdf1040nro.getPageCount()
  if (num1040nro > 0) {
    const arr1040nro = await doc.copyPages(pdf1040nro, pdf1040nro.getPageIndices())
    arr1040nro.forEach((p) => doc.addPage(p))
  } else {
    const placeHolder = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT])
    const phFont = await doc.embedFont(StandardFonts.Helvetica)
    placeHolder.drawText('Form 1040-NR (Schedule O) — To be processed.', {
      x: MARGIN,
      y: PAGE_HEIGHT / 2 - 20,
      size: FONT_SIZE,
      font: phFont,
      color: COLOR_MUTED,
    })
  }

  const num8843 = pdf8843.getPageCount()
  if (num8843 === 0) throw new Error('Form 8843 has no pages.')
  const arr8843 = await doc.copyPages(pdf8843, pdf8843.getPageIndices())
  arr8843.forEach((p) => doc.addPage(p))

  const bytes = await doc.save()
  return bytes.buffer.slice(0) as ArrayBuffer
}