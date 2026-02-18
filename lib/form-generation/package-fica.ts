/**
 * FICA Tax Refund Package
 *
 * Single PDF: instruction pages (same styling as federal/8843/state) + Form 843 + Form 8316.
 * Used when the user had FICA withheld and is requesting a refund (F-1 exempt).
 */

import { PDFDocument, StandardFonts, rgb, PDFPage, PDFFont } from 'pdf-lib'
import { FormData } from '@/types/form'
import { TaxCalculationResult } from '../tax-calculation'
import { fillForm843 } from './forms/form843'
import { fillForm8316 } from './forms/form8316'

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
const COLOR_AMBER_LIGHT = rgb(254 / 255, 243 / 255, 199 / 255) // #fef3c7 amber-100
const COLOR_AMBER = rgb(217 / 255, 119 / 255, 6 / 255)         // #d97706 amber-600

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

/* ─── Drawing Helpers ─── */

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
      page.drawText(rows[r][c] || '', {
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

/**
 * Draw a warning/info box with accent bar and background color.
 * Returns Y position after the box.
 */
async function drawInfoBox(
  page: PDFPage,
  x: number,
  y: number,
  width: number,
  title: string,
  body: string,
  fontBold: PDFFont,
  font: PDFFont,
  bgColor: ReturnType<typeof rgb> = COLOR_PRIMARY_LIGHT,
  accentColor: ReturnType<typeof rgb> = COLOR_PRIMARY,
  titleColor: ReturnType<typeof rgb> = COLOR_DARK,
): Promise<number> {
  // Pre-calculate how tall the body text will be
  const innerWidth = width - 24
  const words = body.split(/\s+/)
  let lineCount = 1
  let testLine = ''
  for (const word of words) {
    const next = testLine ? `${testLine} ${word}` : word
    if (font.widthOfTextAtSize(next, FONT_SIZE_SM) > innerWidth && testLine) {
      lineCount++
      testLine = word
    } else {
      testLine = next
    }
  }
  const boxHeight = 16 + lineCount * LINE_HEIGHT + 12

  page.drawRectangle({ x, y: y - boxHeight, width, height: boxHeight, color: bgColor })
  page.drawRectangle({ x, y: y - boxHeight, width: 3, height: boxHeight, color: accentColor })

  page.drawText(title, {
    x: x + 12, y: y - 14, size: FONT_SIZE_SM, font: fontBold, color: titleColor,
  })

  await drawWrappedText(page, body, x + 12, y - 28, innerWidth, font, FONT_SIZE_SM)

  return y - boxHeight
}

/* ─── FICA helpers ─── */

function getFicaRefundAmount(formData: FormData): number {
  let total = 0
  const w2s = formData.incomeInfo.w2Forms || []
  for (const w2 of w2s) {
    total += (w2?.socialSecurityWithheld || 0) + (w2?.medicareWithheld || 0)
  }
  return Math.floor(total)
}

function getFicaBreakdown(formData: FormData): { ss: number; med: number } {
  let ss = 0
  let med = 0
  const w2s = formData.incomeInfo.w2Forms || []
  for (const w2 of w2s) {
    ss += w2?.socialSecurityWithheld || 0
    med += w2?.medicareWithheld || 0
  }
  return { ss: Math.floor(ss), med: Math.floor(med) }
}

/* ─── Explanation Pages ─── */

async function addFicaExplanationPages(
  doc: PDFDocument,
  formData: FormData,
  taxResult: TaxCalculationResult
): Promise<void> {
  const font = await doc.embedFont(StandardFonts.Helvetica)
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold)
  const fontItalic = await doc.embedFont(StandardFonts.HelveticaOblique)
  const contentWidth = PAGE_WIDTH - 2 * MARGIN

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

  const refundAmount = getFicaRefundAmount(formData)
  const { ss, med } = getFicaBreakdown(formData)
  const w2Count = formData.incomeInfo.w2Forms?.filter(
    (w2) => (w2?.socialSecurityWithheld || 0) + (w2?.medicareWithheld || 0) > 0
  ).length || 0

  let pageNum = 1

  // ─────────────────────────────────────────
  // PAGE 1: Instruction letter
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
  const letterBody = `This package contains your FICA (Social Security and Medicare) tax refund claim, prepared through F1TaxMate tax software. As an F-1 student, you are generally exempt from FICA taxes under IRC Section 3121(b)(19) for as long as you remain a nonresident alien. If your employer withheld FICA from your wages in error, you can request a refund from the IRS.`
  y = await drawWrappedText(page, letterBody, MARGIN, y, contentWidth, font)
  y -= LINE_HEIGHT * 1.5

  // Refund amount highlight box
  page.drawRectangle({
    x: MARGIN, y: y - 68, width: contentWidth, height: 68, color: COLOR_PRIMARY_LIGHT,
  })
  page.drawRectangle({
    x: MARGIN, y: y - 68, width: 3, height: 68, color: COLOR_PRIMARY,
  })
  page.drawText('Your FICA refund claim:', {
    x: MARGIN + 12, y: y - 16, size: FONT_SIZE_SM, font: fontBold, color: COLOR_DARK,
  })
  page.drawText(formatCurrency(refundAmount), {
    x: MARGIN + 12, y: y - 36, size: FONT_SIZE_HEADING, font: fontBold, color: COLOR_PRIMARY_DARK,
  })
  page.drawText(`(Social Security: ${formatCurrency(ss)}  +  Medicare: ${formatCurrency(med)})`, {
    x: MARGIN + 12, y: y - 54, size: FONT_SIZE_SM, font: fontItalic, color: COLOR_MUTED,
  })
  y -= 78

  y -= LINE_HEIGHT

  // Important warning box — mail separately
  y = await drawInfoBox(
    page, MARGIN, y, contentWidth,
    'Important — Mail Separately from Your Tax Return',
    'Form 843 and Form 8316 must be mailed separately to the IRS. Do NOT include them in the same envelope as your Form 1040-NR federal tax return or your state tax return. The FICA refund claim is a separate process handled by a different IRS department.',
    fontBold, font,
    COLOR_AMBER_LIGHT, COLOR_AMBER, COLOR_AMBER,
  )
  y -= LINE_HEIGHT * 1.5

  // What's in this package
  page.drawText('What is included in this package?', {
    x: MARGIN, y, size: FONT_SIZE_HEADING, font: fontBold, color: COLOR_PRIMARY,
  })
  y -= LINE_HEIGHT * 1.3

  y = drawTable(page, MARGIN, y,
    [
      { label: 'Document', width: 220 },
      { label: 'Purpose', width: contentWidth - 220 },
    ],
    [
      ['Form 843', 'Claim for Refund — requests the FICA refund amount'],
      ['Form 8316', 'Statement confirming employer did not refund FICA'],
    ],
    font, fontBold
  )
  y -= LINE_HEIGHT * 1.5

  // How do I file
  page.drawText('How do I file my FICA refund claim?', {
    x: MARGIN, y, size: FONT_SIZE_HEADING, font: fontBold, color: COLOR_PRIMARY,
  })
  y -= LINE_HEIGHT * 1.3

  // Two-column addresses
  const colLeftX = MARGIN
  const colRightX = MARGIN + contentWidth / 2 + 12
  const colW = contentWidth / 2 - 12

  let leftY = y
  leftY = await drawWrappedText(
    page,
    'Mail your signed forms with all attachments using the United States Post Office certified mail service to:',
    colLeftX, leftY, colW, font, FONT_SIZE_SM
  )

  let rightY = y
  rightY = await drawWrappedText(
    page,
    'If you want to use approved Private Delivery Service, please mail it to:',
    colRightX, rightY, colW, font, FONT_SIZE_SM
  )

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
  // PAGE 2: Checklist
  // ─────────────────────────────────────────
  page = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT])
  drawPageHeader(page, fontBold, font)
  y = PAGE_HEIGHT - 80

  page.drawText('FICA Refund', {
    x: MARGIN, y, size: FONT_SIZE_TITLE, font: fontBold, color: COLOR_DARK,
  })
  y -= LINE_HEIGHT * 2
  page.drawText('checklist', {
    x: MARGIN, y, size: FONT_SIZE_TITLE, font: fontBold, color: COLOR_DARK,
  })
  y -= LINE_HEIGHT * 2.5

  // Step 1: Sign forms
  page.drawText('1.', { x: MARGIN, y, size: FONT_SIZE, font: fontBold, color: COLOR_RED })
  y = await drawWrappedText(
    page,
    'Review and sign the following forms where indicated with a pen mark.',
    MARGIN + 16, y, contentWidth - 16, font
  )
  y -= LINE_HEIGHT * 0.5

  y = drawTable(page, MARGIN, y,
    [
      { label: 'Form', width: 160 },
      { label: 'Action', width: contentWidth - 160 },
    ],
    [
      ['Form 843', 'Sign and date on page 2'],
      ['Form 8316', 'Sign and date at the bottom of page 1'],
    ],
    font, fontBold
  )
  y -= LINE_HEIGHT * 1.5

  // Step 2: Attachments
  page.drawText('2.', { x: MARGIN, y, size: FONT_SIZE, font: fontBold, color: COLOR_RED })
  y = await drawWrappedText(
    page,
    'Gather and attach the following documents to your signed forms. All items must be included for the IRS to process your FICA refund:',
    MARGIN + 16, y, contentWidth - 16, font
  )
  y -= LINE_HEIGHT * 0.5

  y = drawTable(page, MARGIN, y,
    [
      { label: 'Attachment', width: 340 },
      { label: 'Qty', width: contentWidth - 340 },
    ],
    [
      ['W-2 form(s) showing FICA withheld (Copy B or C)', `${w2Count}`],
      ['Form 843 (signed)', '1'],
      ['Form 8316 (signed)', '1'],
      ['Copy of passport (photo page)', '1'],
      ['Copy of most recent I-20 or DS-2019', '1'],
      ['Copy of most recent I-94 record (from i94.cbp.dhs.gov)', '1'],
      ['Pay Dates List (see note below)', '1'],
    ],
    font, fontBold
  )
  y -= LINE_HEIGHT * 0.4
  y = await drawWrappedText(
    page,
    'Pay Dates List: On a blank sheet of paper, write "Pay Dates List" at the top and list all pay dates when FICA was withheld; attach it.',
    MARGIN, y, contentWidth, font, FONT_SIZE_XS
  )
  y -= LINE_HEIGHT * 0.6

  y = await drawWrappedText(
    page,
    '* W-2: Verify that Box 4 (Social Security) and Box 6 (Medicare) show the amounts you are claiming as a refund.',
    MARGIN, y, contentWidth, font, FONT_SIZE_XS, COLOR_RED
  )
  y -= LINE_HEIGHT * 1.8

  // Step 3: Employer statement
  page.drawText('3.', { x: MARGIN, y, size: FONT_SIZE, font: fontBold, color: COLOR_RED })
  y = await drawWrappedText(
    page,
    'If your employer provided a written statement confirming they cannot refund the FICA, attach it. If not, the pre-filled explanation on Form 8316 is sufficient — the IRS accepts this.',
    MARGIN + 16, y, contentWidth - 16, font
  )
  y -= LINE_HEIGHT * 1.5

  // Step 4: Do NOT mail with 1040-NR
  page.drawText('4.', { x: MARGIN, y, size: FONT_SIZE, font: fontBold, color: COLOR_RED })
  y = await drawWrappedText(
    page,
    'Mail this FICA refund package in a SEPARATE envelope. Do NOT include it with your Form 1040-NR federal return or your state return.',
    MARGIN + 16, y, contentWidth - 16, font
  )
  y -= LINE_HEIGHT * 1.5

  // Step 5: Where to mail
  page.drawText('5.', { x: MARGIN, y, size: FONT_SIZE, font: fontBold, color: COLOR_RED })

  const step5ColLeftX = MARGIN + 16
  const step5ColRightX = MARGIN + contentWidth / 2 + 12
  const step5ColW = contentWidth / 2 - 20

  let step5LeftY = y
  step5LeftY = await drawWrappedText(
    page,
    'Mail your complete FICA refund package using USPS Certified Mail to:',
    step5ColLeftX, step5LeftY, step5ColW, font, FONT_SIZE_SM
  )

  let step5RightY = y
  step5RightY = await drawWrappedText(
    page,
    'Or use an approved Private Delivery Service to:',
    step5ColRightX, step5RightY, step5ColW, font, FONT_SIZE_SM
  )

  const step5CardY = Math.min(step5LeftY, step5RightY) - 8
  const step5CardW = step5ColW

  drawAddressCard(page, step5ColLeftX, step5CardY, step5CardW,
    'Via USPS Certified Mail:',
    ['Department of the Treasury', 'Internal Revenue Service', 'Austin, TX 73301-0215, USA'],
    fontBold, font
  )

  drawAddressCard(page, step5ColRightX, step5CardY, step5CardW,
    'Via Private Delivery Service:',
    ['Austin – Internal Revenue', 'Submission Processing Center', '3651 S IH35,', 'Austin, TX 78741, USA'],
    fontBold, font
  )

  drawPageNumber(page, font, pageNum++)

  // ─────────────────────────────────────────
  // PAGE 3: FAQ
  // ─────────────────────────────────────────
  page = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT])
  drawPageHeader(page, fontBold, font)
  y = PAGE_HEIGHT - 80

  page.drawText('FICA Refund — Frequently Asked Questions', {
    x: MARGIN, y, size: FONT_SIZE_HEADING, font: fontBold, color: COLOR_PRIMARY,
  })
  y -= LINE_HEIGHT * 2

  const faqs = [
    {
      q: 'Why am I exempt from FICA taxes?',
      a: 'Under IRC Section 3121(b)(19), nonresident aliens on F-1 (or J-1) visas are exempt from Social Security and Medicare taxes for services performed as a student. This applies as long as you remain a nonresident alien (generally, fewer than 5 calendar years in the U.S. in F/J status).',
    },
    {
      q: 'What if my employer already refunded me?',
      a: 'If your employer reimbursed you for the erroneously withheld FICA, you should not file Form 843 for that amount. Only request a refund from the IRS for amounts your employer has not already returned to you.',
    },
    {
      q: 'How long until I get my FICA refund?',
      a: 'The IRS typically processes Form 843 refund claims within 6 to 12 weeks. Use certified mail so you have proof of filing date.',
    },
    {
      q: 'Do I file this with my 1040-NR?',
      a: 'No. Form 843 and Form 8316 are filed separately from your income tax return. Mail them in a separate envelope to the IRS address shown above. Your 1040-NR federal return is mailed separately.',
    },
    {
      q: 'What documents should I include in the envelope?',
      a: 'Include: signed Form 843, signed Form 8316, copy of your W-2(s) showing FICA withheld, copy of your passport photo page, copy of your I-20 (or DS-2019), and a printout of your I-94 record. Keep originals for your records.',
    },
    {
      q: 'Can I claim a FICA refund for prior years?',
      a: 'Yes. You can file Form 843 for FICA refunds for up to 3 years from the date the tax was paid. Each tax year requires a separate Form 843.',
    },
  ]

  for (const { q, a } of faqs) {
    if (y < 120) {
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
  // PAGE 4: FILING COPY cover / breaker page
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
  const titleLine1 = 'FICA Tax Refund Claim'
  const t1W = fontBold.widthOfTextAtSize(titleLine1, 28)
  page.drawText(titleLine1, {
    x: (PAGE_WIDTH - t1W) / 2,
    y: PAGE_HEIGHT - 230,
    size: 28,
    font: fontBold,
    color: COLOR_WHITE,
  })

  const subtitleText = 'Form 843 + Form 8316'
  const sub1W = font.widthOfTextAtSize(subtitleText, 16)
  page.drawText(subtitleText, {
    x: (PAGE_WIDTH - sub1W) / 2,
    y: PAGE_HEIGHT - 258,
    size: 16,
    font,
    color: COLOR_WHITE,
  })

  // "for"
  const forText = 'for'
  const forW = font.widthOfTextAtSize(forText, 20)
  page.drawText(forText, {
    x: (PAGE_WIDTH - forW) / 2,
    y: PAGE_HEIGHT - 300,
    size: 20,
    font,
    color: COLOR_WHITE,
  })

  // User name
  const nameW = fontBold.widthOfTextAtSize(userName, 20)
  page.drawText(userName, {
    x: (PAGE_WIDTH - nameW) / 2,
    y: PAGE_HEIGHT - 340,
    size: 20,
    font: fontBold,
    color: COLOR_WHITE,
  })

  // Year
  const yearText = '2025'
  const yearW = font.widthOfTextAtSize(yearText, 18)
  page.drawText(yearText, {
    x: (PAGE_WIDTH - yearW) / 2,
    y: PAGE_HEIGHT - 370,
    size: 18,
    font,
    color: COLOR_WHITE,
  })

  page.drawLine({
    start: { x: (PAGE_WIDTH - dividerW) / 2, y: PAGE_HEIGHT - 410 },
    end: { x: (PAGE_WIDTH + dividerW) / 2, y: PAGE_HEIGHT - 410 },
    thickness: 1,
    color: COLOR_WHITE,
  })

  const filingText = 'SIGN AND MAIL SEPARATELY TO THE IRS'
  const ftW = fontBold.widthOfTextAtSize(filingText, 12)
  page.drawText(filingText, {
    x: (PAGE_WIDTH - ftW) / 2,
    y: PAGE_HEIGHT - 445,
    size: 12,
    font: fontBold,
    color: COLOR_WHITE,
  })

  const separateText = 'DO NOT INCLUDE WITH YOUR 1040-NR OR STATE RETURN'
  const sepW = fontBold.widthOfTextAtSize(separateText, 10)
  page.drawText(separateText, {
    x: (PAGE_WIDTH - sepW) / 2,
    y: PAGE_HEIGHT - 465,
    size: 10,
    font: fontBold,
    color: COLOR_WHITE,
  })

  // Refund amount on cover
  const refundLabel = `Refund Amount: ${formatCurrency(refundAmount)}`
  const rlW = fontBold.widthOfTextAtSize(refundLabel, 14)
  page.drawText(refundLabel, {
    x: (PAGE_WIDTH - rlW) / 2,
    y: PAGE_HEIGHT - 510,
    size: 14,
    font: fontBold,
    color: COLOR_WHITE,
  })

  // Footer
  const footerY = 46
  page.drawText('F1TaxMate', { x: MARGIN, y: footerY + 14, size: FONT_SIZE_SM, font: fontBold, color: COLOR_WHITE })
  page.drawText('f1taxmate.com', { x: MARGIN, y: footerY, size: FONT_SIZE_SM, font, color: COLOR_WHITE })
}

/**
 * Create the FICA package: explanation pages + Form 843 + Form 8316 (single PDF).
 */
export async function createFicaPackage(
  formData: FormData,
  taxResult: TaxCalculationResult
): Promise<ArrayBuffer> {
  const doc = await PDFDocument.create()
  await addFicaExplanationPages(doc, formData, taxResult)

  const [f843Buf, f8316Buf] = await Promise.all([
    fillForm843(formData, taxResult),
    fillForm8316(formData),
  ])

  const pdf843 = await PDFDocument.load(f843Buf)
  const pdf8316 = await PDFDocument.load(f8316Buf)

  const num843 = pdf843.getPageCount()
  if (num843 === 0) throw new Error('Form 843 has no pages.')
  const arr843 = await doc.copyPages(pdf843, pdf843.getPageIndices())
  arr843.forEach((p) => doc.addPage(p))

  const num8316 = pdf8316.getPageCount()
  if (num8316 === 0) throw new Error('Form 8316 has no pages.')
  const arr8316 = await doc.copyPages(pdf8316, pdf8316.getPageIndices())
  arr8316.forEach((p) => doc.addPage(p))

  const bytes = await doc.save()
  return bytes.buffer.slice(0) as ArrayBuffer
}