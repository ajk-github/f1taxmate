/**
 * Form Generation Module
 *
 * - Form 8843: Statement for Exempt Individuals
 * - Federal package: explanation pages + f1040nr + f1040nro + f8843 (single PDF)
 * - Form IL-1040: Illinois Individual Income Tax Return
 * - FICA package: instruction pages + Form 843 + Form 8316 (single PDF)
 */

import { FormData } from '@/types/form'
import { TaxCalculationResult } from '../tax-calculation'
import JSZip from 'jszip'
import { fillForm1040NR } from './forms/form1040nr'
import { fillForm843 } from './forms/form843'
import { fillForm8316 } from './forms/form8316'
import { fillFormIL1040 } from './forms/formIL1040'
import { fillFormIL1040ScheduleNR } from './forms/formIL1040ScheduleNR'
import { fillFormIL1040ScheduleILWIT } from './forms/formIL1040ScheduleILWIT'
import { fillForm8843 } from './forms/form8843'
import { createFederalPackage } from './federal-package'
import { create8843Package } from './package-8843'
import { createFicaPackage } from './package-fica'
import { createIllinoisPackage } from './package-illinois'

export interface GeneratedForms {
  form8843?: ArrayBuffer
  form1040Federal?: ArrayBuffer
  form1040State?: ArrayBuffer
  form1040StateScheduleNR?: ArrayBuffer
  form1040StateScheduleILWIT?: ArrayBuffer
  form843?: ArrayBuffer
  form8316?: ArrayBuffer
}

/**
 * Generate all required tax forms based on form data and tax calculation results
 */
export async function generateTaxForms(
  formData: FormData,
  taxResult: TaxCalculationResult
): Promise<GeneratedForms> {
  const forms: GeneratedForms = {}

  // Generate Form 8843 (always needed for F1 students)
  if (taxResult.federalTax.forms.form8843) {
    try {
      forms.form8843 = await fillForm8843(formData)
    } catch (error) {
      console.warn('Form 8843 not available:', error)
      // Continue without Form 8843 if template not available
    }
  }

  // Generate Form 1040-NR Federal
  if (taxResult.federalTax.forms.form1040) {
    forms.form1040Federal = await fillForm1040NR(formData, taxResult)
  }

  // Generate Form IL-1040 State (Illinois), Schedule NR, and Schedule IL-WIT
  if (taxResult.stateTax.forms.form1040) {
    forms.form1040State = await fillFormIL1040(formData, taxResult)
    forms.form1040StateScheduleNR = await fillFormIL1040ScheduleNR(formData, taxResult)
    forms.form1040StateScheduleILWIT = await fillFormIL1040ScheduleILWIT(formData, taxResult)
  }

  // Generate Form 843 and Form 8316 (if FICA taxes were wrongly paid)
  if (taxResult.federalTax.forms.form832) {
    forms.form843 = await fillForm843(formData, taxResult)
    forms.form8316 = await fillForm8316(formData)
  }

  return forms
}

/**
 * Create a ZIP file containing all generated forms
 */
export async function createFormsZip(
  forms: GeneratedForms
): Promise<Blob> {
  const zip = new JSZip()

  if (forms.form8843) {
    zip.file('Form_8843.pdf', forms.form8843)
  }
  if (forms.form1040Federal) {
    zip.file('Form_1040-NR.pdf', forms.form1040Federal)
  }
  if (forms.form1040State) {
    zip.file('Form_IL-1040.pdf', forms.form1040State)
  }
  if (forms.form1040StateScheduleNR) {
    zip.file('Form_IL-1040-Schedule-NR.pdf', forms.form1040StateScheduleNR)
  }
  if (forms.form1040StateScheduleILWIT) {
    zip.file('Form_IL-1040-Schedule-IL-WIT.pdf', forms.form1040StateScheduleILWIT)
  }
  if (forms.form843) {
    zip.file('Form_843.pdf', forms.form843)
  }
  if (forms.form8316) {
    zip.file('Form_8316.pdf', forms.form8316)
  }

  return await zip.generateAsync({ type: 'blob' })
}

/**
 * Build a ZIP containing only the forms for the paid products.
 * Federal product yields one PDF: Federal_Tax_Return_2025.pdf (instructions + f1040nr + f1040nro + f8843).
 * FICA product yields one PDF: FICA_Refund_2025.pdf (instructions + Form 843 + Form 8316).
 */
export async function createZipFromPaidProducts(
  paidProductIds: string[],
  formData: FormData,
  taxResult: TaxCalculationResult
): Promise<Blob> {
  const zip = new JSZip()
  const hasFederal = paidProductIds.includes('federal')
  const has8843Only = paidProductIds.includes('form8843')
  const hasIllinois = paidProductIds.includes('illinois')
  const hasFica = paidProductIds.includes('fica')

  if (hasFederal) {
    const federalBuf = await createFederalPackage(formData, taxResult)
    zip.file('Federal_Tax_Return_2025.pdf', federalBuf)
  }

  if (has8843Only) {
    const package8843 = await create8843Package(formData)
    zip.file('Form_8843_2025.pdf', package8843)
  }

  if (hasIllinois) {
    const illinoisBuf = await createIllinoisPackage(formData, taxResult)
    zip.file('Illinois_State_Return_2025.pdf', illinoisBuf)
  }

  if (hasFica) {
    const ficaBuf = await createFicaPackage(formData, taxResult)
    zip.file('FICA_Refund_2025.pdf', ficaBuf)
  }

  return await zip.generateAsync({ type: 'blob' })
}

// Form generation functions are now in separate files:
// - lib/form-generation/forms/form8843.ts
// - lib/form-generation/forms/form1040nr.ts
// - lib/form-generation/forms/formIL1040.ts
// - lib/form-generation/forms/form843.ts
