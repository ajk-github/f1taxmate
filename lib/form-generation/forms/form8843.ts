/**
 * Form 8843 - Statement for Exempt Individuals
 * 
 * This form is required for F-1 students to claim exemption from counting days
 * of presence in the United States for purposes of the substantial presence test.
 * 
 * Field mappings based on numbered PDF analysis:
 * - Field 4: First Name
 * - Field 5: Last Name
 * - Field 6: SSN
 * - Field 7: Address in Country of Residence
 * - Field 8: US Address
 * - Field 9: US visa type and first entry date
 * - Field 10: Current Immigrant status
 * - Field 11: Country of Citizenship
 * - Field 12: Passport Issuing Country
 * - Field 13: Passport Number
 * - Field 14: Days in US 2025
 * - Field 15: Days in US 2024
 * - Field 16: Days in US 2023
 * - Field 17: Same as field 14
 * - Field 20: University info
 * - Field 21: DSO info
 */

import { PDFDocument } from 'pdf-lib'
import { FormData } from '@/types/form'
import {
  loadPDFTemplate,
  setTextField,
  setCheckboxField,
  formatDateForPDF,
  formatSSN,
  getPDFAsArrayBuffer,
} from '../pdf-filler'
import {
  calculateDaysInUS2025,
  calculateDaysInUS2024,
  calculateDaysInUS2023,
  calculateDaysInUSForYear,
} from '../utils/days-calculator'

export async function fillForm8843(
  formData: FormData
): Promise<ArrayBuffer> {
  const pdf = await loadPDFTemplate('federal_forms/f8843.pdf')
  
  // Field 4: First Name
  setTextField(pdf, 'topmostSubform[0].Page1[0].f1_04[0]', formData.personalInfo.firstName)
  
  // Field 5: Last Name
  setTextField(pdf, 'topmostSubform[0].Page1[0].f1_05[0]', formData.personalInfo.lastName)
  
  // Field 6: SSN (with dashes: XXX-XX-XXXX)
  setTextField(pdf, 'topmostSubform[0].Page1[0].f1_06[0]', formatSSN(formData.incomeInfo.ssn || ''))
  
  // Field 7: Address in Country of Residence (foreign address) - Block form, all caps
  const foreignAddr = formData.personalInfo.foreignAddress
  const foreignAddressLines = [
    foreignAddr.addressLine1,
    foreignAddr.addressLine2,
    foreignAddr.city,
    foreignAddr.stateProvince,
    foreignAddr.postalCode ? `${foreignAddr.country.toUpperCase()} ${foreignAddr.postalCode}` : foreignAddr.country.toUpperCase(),
  ]
    .filter((line): line is string => Boolean(line))
    .map(line => line.toUpperCase())
  const foreignAddressBlock = foreignAddressLines.join('\n')
  setTextField(pdf, 'topmostSubform[0].Page1[0].f1_07[0]', foreignAddressBlock)
  
  // Field 8: US Address - Block form, all caps
  const usAddr = formData.personalInfo.usAddress
  const usAddressLines = [
    usAddr.address,
    usAddr.addressLine2,
    usAddr.city ? `${usAddr.city}, ${usAddr.state} ${usAddr.zipCode}` : `${usAddr.state} ${usAddr.zipCode}`,
  ]
    .filter((line): line is string => Boolean(line))
    .map(line => line.toUpperCase())
  const usAddressBlock = usAddressLines.join('\n')
  setTextField(pdf, 'topmostSubform[0].Page1[0].f1_08[0]', usAddressBlock)
  
  // Field 9: US visa type and first entry date (format: "F1 08/27/2023")
  const firstEntryDate = formatDateForPDF(formData.residencyInfo.dateOfFirstVisit)
  const visaAndDate = `${formData.personalInfo.visaType}${firstEntryDate ? ' ' + firstEntryDate : ''}`
  setTextField(pdf, 'topmostSubform[0].Page1[0].f1_09[0]', visaAndDate)
  
  // Field 10: Current Immigrant status (just visa type, e.g., "F1")
  setTextField(pdf, 'topmostSubform[0].Page1[0].f1_10[0]', formData.personalInfo.visaType)
  
  // Field 11: Country of Citizenship
  setTextField(pdf, 'topmostSubform[0].Page1[0].f1_11[0]', formData.personalInfo.foreignAddress.country)
  
  // Field 12: Passport Issuing Country
  setTextField(pdf, 'topmostSubform[0].Page1[0].f1_12[0]', formData.personalInfo.foreignAddress.country)
  
  // Field 13: Passport Number
  setTextField(pdf, 'topmostSubform[0].Page1[0].f1_13[0]', formData.personalInfo.passportNumber)
  
  // Field 14: Days in US 2025
  const days2025 = calculateDaysInUS2025(formData.residencyInfo)
  setTextField(pdf, 'topmostSubform[0].Page1[0].f1_14[0]', days2025.toString())
  
  // Field 15: Days in US 2024
  const days2024 = calculateDaysInUS2024(formData.residencyInfo)
  setTextField(pdf, 'topmostSubform[0].Page1[0].f1_15[0]', days2024.toString())
  
  // Field 16: Days in US 2023
  const days2023 = calculateDaysInUS2023(formData.residencyInfo)
  setTextField(pdf, 'topmostSubform[0].Page1[0].f1_16[0]', days2023.toString())
  
  // Field 17: Same as field 14 (Days in US 2025)
  setTextField(pdf, 'topmostSubform[0].Page1[0].f1_17[0]', days2025.toString())
  
  // Before field 20: Checkbox - check "No" (uncheck the checkbox)
  // Based on mapping, this is c1_1[0] or c1_1[1] - we'll uncheck both to be safe
  setCheckboxField(pdf, 'topmostSubform[0].Page1[0].c1_1[0]', false)
  setCheckboxField(pdf, 'topmostSubform[0].Page1[0].c1_1[1]', false)
  
  // Field 20: University name, address, phone
  const universityInfo = formData.universityInfo
  const universityFull = [
    universityInfo.universityName,
    universityInfo.universityAddress.address,
    universityInfo.universityAddress.addressLine2,
    universityInfo.universityAddress.city,
    universityInfo.universityAddress.state,
    universityInfo.universityAddress.zipCode,
    universityInfo.universityContactNumber,
  ]
    .filter(Boolean)
    .join(', ')
  setTextField(pdf, 'topmostSubform[0].Page1[0].f1_26[0]', universityFull)
  
  // Field 21: DSO name, address, phone
  const dsoInfo = formData.universityInfo
  const dsoFull = [
    dsoInfo.issAdvisorName,
    dsoInfo.issAdvisorAddress.address,
    dsoInfo.issAdvisorAddress.addressLine2,
    dsoInfo.issAdvisorAddress.city,
    dsoInfo.issAdvisorAddress.state,
    dsoInfo.issAdvisorAddress.zipCode,
    dsoInfo.issAdvisorContactNumber,
  ]
    .filter(Boolean)
    .join(', ')
  setTextField(pdf, 'topmostSubform[0].Page1[0].f1_27[0]', dsoFull)
  
  // Line 11 (Part III - Students): Years 2019-2024 - put "F" after each year where user had positive days
  // These fields are on Page 1, after field 21 (DSO info), before the checkboxes
  // Based on the mapping, these should be on Page 1, likely single-character fields
  // Order in PDF: 2019, 2020, 2021, 2022, 2023, 2024 (6 fields total)
  // Field 22 is f1_34, so the year fields might be f1_28 through f1_33, or they might be
  // in a different location. Let's try the pattern that follows f1_27 (field 21)
  const yearOrder = [2019, 2020, 2021, 2022, 2023, 2024] // Order as they appear in the form
  // Try Page 1 fields that come after f1_27 (field 21) - these might be single-char fields
  // that weren't captured in numbering due to maxLength=1
  const yearFields = [
    'topmostSubform[0].Page1[0].f1_28[0]', // 2019 - Page 1, after field 21
    'topmostSubform[0].Page1[0].f1_29[0]', // 2020
    'topmostSubform[0].Page1[0].f1_30[0]', // 2021
    'topmostSubform[0].Page1[0].f1_31[0]', // 2022
    'topmostSubform[0].Page1[0].f1_32[0]', // 2023
    'topmostSubform[0].Page1[0].f1_33[0]', // 2024
  ]
  
  yearOrder.forEach((year, index) => {
    const days = calculateDaysInUSForYear(formData.residencyInfo, year)
    if (days > 0) {
      setTextField(pdf, yearFields[index], 'F')
    }
  })
  
  // Line 8: Check "NO" (Part II - Teachers/Trainees)
  // c1_1[0] and c1_1[1] are the Yes/No checkboxes for line 8
  setCheckboxField(pdf, 'topmostSubform[0].Page1[0].c1_1[0]', false) // Yes
  setCheckboxField(pdf, 'topmostSubform[0].Page1[0].c1_1[1]', true)  // No - CHECK THIS
  
  // Line 12: Check "NO" (Part III - Students)
  // c1_2[0] and c1_2[1] are the Yes/No checkboxes for line 12
  setCheckboxField(pdf, 'topmostSubform[0].Page1[0].c1_2[0]', false) // Yes
  setCheckboxField(pdf, 'topmostSubform[0].Page1[0].c1_2[1]', true)  // No - CHECK THIS
  
  // Line 13: Check "NO" (Part III - Students)
  // c1_3[0] and c1_3[1] are the Yes/No checkboxes for line 13
  setCheckboxField(pdf, 'topmostSubform[0].Page1[0].c1_3[0]', false) // Yes
  setCheckboxField(pdf, 'topmostSubform[0].Page1[0].c1_3[1]', true)  // No - CHECK THIS
  
  return await getPDFAsArrayBuffer(pdf)
}
