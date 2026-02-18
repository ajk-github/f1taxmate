/**
 * Form 8843 Package (no income filing)
 *
 * Single PDF: explanation pages (same styling as federal package) + filled Form 8843.
 * Used when the user files only Form 8843 (no US income).
 */

import { PDFDocument, StandardFonts, rgb, PDFPage, PDFFont } from 'pdf-lib'
import { FormData } from '@/types/form'
import { fillForm8843 } from './forms/form8843'

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

  // Header row
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

/* ─── Explanation Pages ─── */

async function add8843ExplanationPages(doc: PDFDocument, formData: FormData): Promise<void> {
  const font = await doc.embedFont(StandardFonts.Helvetica)
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold)
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
  const letterBody = `Enclosed please find two copies of your Form 8843 (Statement for Exempt Individuals) for 2025, which you prepared through F1TaxMate tax software. File one copy with the Internal Revenue Service and retain the second copy for your records.`
  y = await drawWrappedText(page, letterBody, MARGIN, y, contentWidth, font)
  y -= LINE_HEIGHT * 1.5

  // Important note about 8843-only filing
  page.drawRectangle({
    x: MARGIN, y: y - 58, width: contentWidth, height: 58,
    color: COLOR_PRIMARY_LIGHT,
  })
  page.drawRectangle({
    x: MARGIN, y: y - 58, width: 3, height: 58,
    color: COLOR_PRIMARY,
  })
  page.drawText('Important:', {
    x: MARGIN + 12, y: y - 14, size: FONT_SIZE_SM, font: fontBold, color: COLOR_DARK,
  })
  y = await drawWrappedText(
    page,
    'Form 8843 is required for all nonresident aliens present in the U.S. under F, J, M, or Q visa status, even if you had no U.S. income. It must be filed by June 15th (or April 15th if you had income). Since you had no U.S. income, you only need to file Form 8843.',
    MARGIN + 12, y - 28, contentWidth - 24, font, FONT_SIZE_SM
  )
  y -= 18

  y -= LINE_HEIGHT * 2

  // ── How do I file my Form 8843? ──
  page.drawText('How do I file my Form 8843?', {
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
    'Mail your signed Form 8843 as soon as possible using the United States Post Office certified mail service to:',
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

  page.drawText('Form 8843', {
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
    'Review and sign the following form where indicated with a pen mark.',
    MARGIN + 16, y, contentWidth - 16, font
  )
  y -= LINE_HEIGHT * 0.5

  y = drawTable(page, MARGIN, y,
    [
      { label: 'Form', width: 200 },
      { label: 'Action', width: contentWidth - 200 },
    ],
    [
      ['8843', 'Sign on page 2'],
    ],
    font, fontBold
  )
  y -= LINE_HEIGHT * 1.5

  // Step 2
  page.drawText('2.', { x: MARGIN, y, size: FONT_SIZE, font: fontBold, color: COLOR_RED })
  y = await drawWrappedText(
    page,
    'Since you had no U.S. income, you do not need to attach any W-2 or income documents. Only Form 8843 is required.',
    MARGIN + 16, y, contentWidth - 16, font
  )
  y -= LINE_HEIGHT * 1.5

  // Step 3
  page.drawText('3.', { x: MARGIN, y, size: FONT_SIZE, font: fontBold, color: COLOR_RED })
  y = await drawWrappedText(
    page,
    'Verify that all personal information on Form 8843 is correct, including your visa type, days of presence, and academic institution details.',
    MARGIN + 16, y, contentWidth - 16, font
  )
  y -= LINE_HEIGHT * 1.5

  // Step 4 – Mail instructions
  page.drawText('4.', { x: MARGIN, y, size: FONT_SIZE, font: fontBold, color: COLOR_RED })

  const step4ColLeftX = MARGIN + 16
  const step4ColRightX = MARGIN + contentWidth / 2 + 12
  const step4ColW = contentWidth / 2 - 20

  let step4LeftY = y
  step4LeftY = await drawWrappedText(
    page,
    'Mail your signed Form 8843 as soon as possible using the United States Post Office certified mail service to:',
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
  // PAGE 3: FAQ
  // ─────────────────────────────────────────
  page = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT])
  drawPageHeader(page, fontBold, font)
  y = PAGE_HEIGHT - 80

  page.drawText('Form 8843 — Frequently Asked Questions', {
    x: MARGIN, y, size: FONT_SIZE_HEADING, font: fontBold, color: COLOR_PRIMARY,
  })
  y -= LINE_HEIGHT * 2

  const faqs = [
    {
      q: 'What is Form 8843?',
      a: 'Form 8843 is a statement required by the IRS for all nonresident aliens present in the U.S. under an exempt visa status (F, J, M, or Q). It declares your exempt status and the number of days you were present in the U.S.',
    },
    {
      q: 'Do I need to file Form 8843 if I had no income?',
      a: 'Yes. Form 8843 must be filed regardless of whether you had any U.S. income. It is used to exclude days of presence for the substantial presence test.',
    },
    {
      q: 'When is Form 8843 due?',
      a: 'If you had no U.S. income, Form 8843 is due by June 15th. If you had U.S. income, it is due by April 15th (attached to your 1040-NR).',
    },
    {
      q: 'Do I need to sign Form 8843?',
      a: 'Yes. When Form 8843 is filed by itself (not attached to a 1040-NR), you must sign and date it on page 2.',
    },
    {
      q: 'Where do I mail Form 8843?',
      a: 'Mail it to the IRS at: Department of the Treasury, Internal Revenue Service, Austin, TX 73301-0215, USA.',
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

  // Full-page blue background
  page.drawRectangle({ x: 0, y: 0, width: PAGE_WIDTH, height: PAGE_HEIGHT, color: COLOR_PRIMARY })

  // Subtle darker band
  page.drawRectangle({
    x: 0, y: PAGE_HEIGHT / 2 - 80, width: PAGE_WIDTH, height: 280,
    color: COLOR_PRIMARY_DARK, opacity: 0.15,
  })

  // Warning at top right
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

  // Thin white divider
  const dividerW = 120
  page.drawLine({
    start: { x: (PAGE_WIDTH - dividerW) / 2, y: PAGE_HEIGHT - 185 },
    end: { x: (PAGE_WIDTH + dividerW) / 2, y: PAGE_HEIGHT - 185 },
    thickness: 1,
    color: COLOR_WHITE,
  })

  // Title
  const titleLine1 = 'Form 8843'
  const t1W = fontBold.widthOfTextAtSize(titleLine1, 30)
  page.drawText(titleLine1, {
    x: (PAGE_WIDTH - t1W) / 2,
    y: PAGE_HEIGHT - 230,
    size: 30,
    font: fontBold,
    color: COLOR_WHITE,
  })

  const subtitleText = 'Statement for Exempt Individuals'
  const stW2 = font.widthOfTextAtSize(subtitleText, 16)
  page.drawText(subtitleText, {
    x: (PAGE_WIDTH - stW2) / 2,
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

  // Thin white divider
  page.drawLine({
    start: { x: (PAGE_WIDTH - dividerW) / 2, y: PAGE_HEIGHT - 410 },
    end: { x: (PAGE_WIDTH + dividerW) / 2, y: PAGE_HEIGHT - 410 },
    thickness: 1,
    color: COLOR_WHITE,
  })

  // Filing instruction
  const filingCopyText = 'FILING COPY'
  const fcW = fontBold.widthOfTextAtSize(filingCopyText, 13)
  page.drawText(filingCopyText, {
    x: (PAGE_WIDTH - fcW) / 2,
    y: PAGE_HEIGHT - 445,
    size: 13,
    font: fontBold,
    color: COLOR_WHITE,
  })

  const signText = 'SIGN AND MAIL TO THE INTERNAL REVENUE SERVICE'
  const stW = fontBold.widthOfTextAtSize(signText, 10)
  page.drawText(signText, {
    x: (PAGE_WIDTH - stW) / 2,
    y: PAGE_HEIGHT - 465,
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
 * Create the 8843-only package: explanation pages + filled Form 8843.
 */
export async function create8843Package(formData: FormData): Promise<ArrayBuffer> {
  const doc = await PDFDocument.create()
  await add8843ExplanationPages(doc, formData)

  const f8843Buf = await fillForm8843(formData)
  const pdf8843 = await PDFDocument.load(f8843Buf)
  const num8843 = pdf8843.getPageCount()
  if (num8843 === 0) throw new Error('Form 8843 has no pages.')
  const arr8843 = await doc.copyPages(pdf8843, pdf8843.getPageIndices())
  arr8843.forEach((p) => doc.addPage(p))

  const bytes = await doc.save()
  return bytes.buffer.slice(0) as ArrayBuffer
}