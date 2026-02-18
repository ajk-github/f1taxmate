/**
 * Generate blank, field-numbered PDFs for Form 843 and Form 8316.
 * Draws a small number next to each form field (all types) for mapping.
 * Output: public/forms/numbered-fields/f843_numbered.pdf, f8316_numbered.pdf + _mapping.json
 *
 * Run with: node scripts/number-fica-pdfs.mjs
 */

import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const inputDir = path.join(__dirname, '..', 'public', 'forms', 'FICA_forms')
const outputDir = path.join(__dirname, '..', 'public', 'forms', 'numbered-fields')

const FICA_PDFS = ['f843.pdf', 'f8316.pdf']

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true })
}

async function drawNumberOnField(doc, page, widget, number, font, color) {
  const rect = widget.getRectangle()
  const label = String(number)
  const size = 7
  page.drawText(label, {
    x: rect.x - 14,
    y: rect.y + rect.height - 4,
    size,
    font,
    color: color,
  })
}

async function numberFicaPdf(filename) {
  const filePath = path.join(inputDir, filename)
  const baseName = path.basename(filename, '.pdf')
  const outputPath = path.join(outputDir, `${baseName}_numbered.pdf`)
  const mappingPath = path.join(outputDir, `${baseName}_mapping.json`)

  if (!fs.existsSync(filePath)) {
    console.log(`⚠️  File not found: ${filename}`)
    return null
  }

  try {
    console.log(`\nProcessing ${filename}...`)

    const pdfBytes = fs.readFileSync(filePath)
    const pdfDoc = await PDFDocument.load(pdfBytes)
    const form = pdfDoc.getForm()
    const fields = form.getFields()

    // Stable order: sort by full name
    fields.sort((a, b) => a.getName().localeCompare(b.getName()))

    const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
    const color = rgb(0.7, 0, 0)
    const mapping = []
    let drawn = 0

    for (let i = 0; i < fields.length; i++) {
      const field = fields[i]
      const num = i + 1
      const fieldName = field.getName()
      const fieldType = field.constructor.name

      try {
        const acroField = field.acroField
        const widgets = acroField.getWidgets()
        if (!widgets || widgets.length === 0) {
          mapping.push({ number: num, name: fieldName, type: fieldType, drawn: false })
          continue
        }
        const widget = widgets[0]
        const widgetRef = pdfDoc.context.getObjectRef(widget.dict)
        if (!widgetRef) {
          mapping.push({ number: num, name: fieldName, type: fieldType, drawn: false })
          continue
        }
        const page = pdfDoc.findPageForAnnotationRef(widgetRef)
        if (!page) {
          mapping.push({ number: num, name: fieldName, type: fieldType, drawn: false })
          continue
        }
        drawNumberOnField(pdfDoc, page, widget, num, font, color)
        mapping.push({ number: num, name: fieldName, type: fieldType, drawn: true })
        drawn++
      } catch (err) {
        console.warn(`  ⚠️  Field ${fieldName}:`, err.message)
        mapping.push({ number: num, name: fieldName, type: fieldType, drawn: false, error: err.message })
      }
    }

    form.flatten()
    const outBytes = await pdfDoc.save()
    fs.writeFileSync(outputPath, outBytes)

    const mappingOut = {
      filename,
      totalFields: fields.length,
      fieldsNumbered: drawn,
      fields: mapping,
    }
    fs.writeFileSync(mappingPath, JSON.stringify(mappingOut, null, 2))

    console.log(`  ✅ Created: ${baseName}_numbered.pdf`)
    console.log(`  📝 Mapping: ${baseName}_mapping.json (${fields.length} fields, ${drawn} numbers drawn)`)

    return { filename, outputPath, mappingPath, totalFields: fields.length, drawn }
  } catch (error) {
    console.error(`  ❌ Error: ${error.message}`)
    return null
  }
}

async function main() {
  console.log('='.repeat(60))
  console.log('FICA PDF Field Numbering (843 & 8316)')
  console.log('='.repeat(60))
  console.log(`\nInput:  ${inputDir}`)
  console.log(`Output: ${outputDir}`)

  const results = []
  for (const name of FICA_PDFS) {
    const result = await numberFicaPdf(name)
    if (result) results.push(result)
  }

  console.log('\n' + '='.repeat(60))
  console.log('SUMMARY')
  console.log('='.repeat(60))
  results.forEach((r) => {
    console.log(`  ${r.filename} → ${path.basename(r.outputPath)} (${r.drawn} numbers drawn)`)
  })
  console.log(`\n✅ Numbered PDFs and mappings saved to: ${outputDir}`)
}

main().catch(console.error)
