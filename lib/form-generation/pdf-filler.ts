/**
 * PDF Form Filler Utility
 * 
 * This module provides utilities for filling PDF forms using pdf-lib
 */

import { PDFDocument } from 'pdf-lib'
import { FormData } from '@/types/form'
import { TaxCalculationResult } from '../tax-calculation'

/**
 * Load a PDF form template from the public directory
 */
export async function loadPDFTemplate(filename: string): Promise<PDFDocument> {
  try {
    const response = await fetch(`/forms/${filename}`)
    if (!response.ok) {
      throw new Error(`Failed to load PDF template: ${filename}`)
    }
    const arrayBuffer = await response.arrayBuffer()
    return await PDFDocument.load(arrayBuffer)
  } catch (error) {
    console.error(`Error loading PDF template ${filename}:`, error)
    throw error
  }
}

/**
 * Get PDF form field value - handles different field types
 */
export function getFormField(
  form: PDFDocument,
  fieldName: string
): any {
  const formFields = form.getForm().getFields()
  const field = formFields.find((f) => f.getName() === fieldName)
  return field
}

/**
 * Set a text field value in the PDF form
 */
export function setTextField(
  form: PDFDocument,
  fieldName: string,
  value: string
): void {
  try {
    const field = getFormField(form, fieldName)
    if (field && 'setText' in field) {
      ;(field as any).setText(value || '')
    } else {
      console.warn(`Field ${fieldName} not found or not a text field`)
    }
  } catch (error) {
    console.warn(`Error setting field ${fieldName}:`, error)
  }
}

/**
 * Set a text field by trying multiple possible field names (e.g. when the PDF template uses different names).
 * Uses the first name that matches a text field.
 */
export function setTextFieldWithAlternateNames(
  form: PDFDocument,
  fieldNames: string[],
  value: string
): void {
  const str = value || ''
  for (const name of fieldNames) {
    try {
      const field = getFormField(form, name)
      if (field && 'setText' in field) {
        ;(field as any).setText(str)
        return
      }
    } catch {
      // try next name
    }
  }
  console.warn(`Field not found for any of: ${fieldNames.join(', ')}`)
}

/**
 * Set a checkbox field value in the PDF form
 */
export function setCheckboxField(
  form: PDFDocument,
  fieldName: string,
  checked: boolean
): void {
  try {
    const field = getFormField(form, fieldName)
    if (field && 'check' in field) {
      if (checked) {
        ;(field as any).check()
      } else {
        ;(field as any).uncheck()
      }
    } else {
      console.warn(`Field ${fieldName} not found or not a checkbox field`)
    }
  } catch (error) {
    console.warn(`Error setting checkbox ${fieldName}:`, error)
  }
}

/**
 * Select an option in a radio group (e.g. Form 8316: "Yes"/"No"/"Do not Know").
 * optionValue must match the PDF's export value (often "1", "2", "3").
 */
export function setRadioGroup(
  form: PDFDocument,
  fieldName: string,
  optionValue: string
): void {
  try {
    const radioGroup = form.getForm().getRadioGroup(fieldName)
    radioGroup.select(optionValue)
  } catch (error) {
    console.warn(`Error setting radio group ${fieldName}:`, error)
  }
}

/**
 * Format currency for PDF forms (remove $ and commas, keep 2 decimals)
 */
export function formatCurrencyForPDF(amount: number): string {
  return amount.toFixed(2)
}

/**
 * Format currency as whole dollars only (round down).
 * Use for forms that already show ".00" – e.g. Illinois IL-1040.
 */
export function formatCurrencyForPDFWholeOnly(amount: number): string {
  return String(Math.floor(amount))
}

/**
 * Format date for PDF forms (MM/DD/YYYY)
 */
export function formatDateForPDF(dateString: string): string {
  if (!dateString) return ''
  try {
    const date = new Date(dateString)
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const year = date.getFullYear()
    return `${month}/${day}/${year}`
  } catch {
    return ''
  }
}

/**
 * Format date for forms that use 2-digit year (mm/dd/yy), e.g. 1040-NR-O Line G
 */
export function formatDateForPDFShortYear(dateString: string): string {
  if (!dateString) return ''
  try {
    const date = new Date(dateString)
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const year = String(date.getFullYear()).slice(-2)
    return `${month}/${day}/${year}`
  } catch {
    return ''
  }
}

/**
 * Format date with dashes (MM-DD-YYYY) for Illinois and similar forms
 */
export function formatDateForPDFDashes(dateString: string): string {
  if (!dateString) return ''
  try {
    const date = new Date(dateString)
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const year = date.getFullYear()
    return `${month}-${day}-${year}`
  } catch {
    return ''
  }
}

/**
 * Extract year from date string (for Illinois forms that only need year)
 */
export function extractYear(dateString: string): string {
  if (!dateString) return ''
  try {
    const date = new Date(dateString)
    return String(date.getFullYear())
  } catch {
    return ''
  }
}

/**
 * Format phone number for PDF (extract area code and number)
 */
export function formatPhoneForPDF(phone: string): { areaCode: string; number: string } {
  if (!phone) return { areaCode: '', number: '' }
  const cleaned = phone.replace(/\D/g, '')
  if (cleaned.length >= 10) {
    return {
      areaCode: cleaned.slice(0, 3),
      number: cleaned.slice(3),
    }
  }
  return { areaCode: '', number: cleaned }
}

/**
 * Format SSN for PDF (XXX-XX-XXXX)
 */
export function formatSSN(ssn: string): string {
  if (!ssn) return ''
  const cleaned = ssn.replace(/\D/g, '')
  if (cleaned.length === 9) {
    return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 5)}-${cleaned.slice(5)}`
  }
  return cleaned
}

/**
 * Flatten form fields into the page content so the PDF is no longer editable.
 * Call before save when you want the final PDF to be read-only.
 */
export function flattenForm(pdf: PDFDocument): void {
  try {
    const form = pdf.getForm()
    form.flatten()
  } catch {
    // No form or already flattened
  }
}

/**
 * Get PDF as base64 string for download/email (flattened so not editable)
 */
export async function getPDFAsBase64(pdf: PDFDocument): Promise<string> {
  flattenForm(pdf)
  const pdfBytes = await pdf.save()
  const uint8Array = new Uint8Array(pdfBytes)
  const base64 = btoa(
    String.fromCharCode.apply(null, Array.from(uint8Array))
  )
  return base64
}

/**
 * Get PDF as ArrayBuffer for ZIP file (flattened so not editable)
 */
export async function getPDFAsArrayBuffer(pdf: PDFDocument): Promise<ArrayBuffer> {
  flattenForm(pdf)
  const pdfBytes = await pdf.save()
  return pdfBytes.buffer as ArrayBuffer
}
