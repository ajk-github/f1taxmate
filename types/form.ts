export interface PersonalInfo {
  firstName: string
  lastName: string
  dateOfBirth: string
  phone: string
  email: string
  passportNumber: string
  visaType: string
  occupationType: 'Student'
  usAddress: {
    address: string
    addressLine2?: string
    city: string
    state: string
    county?: string
    zipCode: string
  }
  foreignAddress: {
    addressLine1: string
    addressLine2?: string
    city: string
    stateProvince?: string
    postalCode?: string
    country: string
  }
}

export interface UniversityInfo {
  universityName: string
  universityAddress: {
    address: string
    addressLine2?: string
    city: string
    state: string
    zipCode: string
  }
  universityContactNumber: string
  issAdvisorName: string
  issAdvisorAddress: {
    address: string
    addressLine2?: string
    city: string
    state: string
    zipCode: string
  }
  issAdvisorContactNumber: string
  sameAsUniversity: boolean
}

export interface Visit {
  visaType: string
  entryDate: string
  exitDate?: string
}

export interface ResidencyInfo {
  dateOfFirstVisit: string
  visits: Visit[]
  hasFiledTaxReturnBefore: boolean
  /** When hasFiledTaxReturnBefore is true */
  yearFiled?: string
  formUsed?: string
}

export interface W2Form {
  wages: number
  federalTaxWithheld: number
  stateTaxWithheld: number
  socialSecurityWithheld: number // Box 4 - Social Security tax withheld
  medicareWithheld: number // Box 6 - Medicare tax withheld
  ein: string
}

export interface Form1099INT {
  interestIncome: number
  federalTaxWithheld: number
  stateTaxWithheld: number
  payerTin: string
  incomeTypeDescription: string
}

export interface Form1099MISC {
  otherIncome: number
  federalTaxWithheld: number
  stateTaxWithheld: number
  payerTin: string
  incomeTypeDescription: string
}

/** State where US income was earned. Only Illinois state filing is supported. */
export type IncomeState = 'Illinois' | 'Other'

/** One per W-2 that had FICA withheld; used on Form 8316 Question 9. */
export interface FICAEmployerEntry {
  employerName: string
  employerAddress: string
}

export interface IncomeInfo {
  hadUSIncome: boolean
  /** State where income was earned. Used to show Illinois state return option only when Illinois. */
  incomeState?: IncomeState
  ssn?: string
  w2Forms: W2Form[]
  form1099INT: Form1099INT[]
  form1099MISC: Form1099MISC[]
  /** Employer name and address for each W-2 with FICA withheld (same order as w2Forms with FICA). Used on Form 8316. */
  ficaEmployerInfo?: FICAEmployerEntry[]
  bankDetails: {
    accountNumber: string
    routingNumber: string
    accountType: 'checking' | 'savings'
  }
}

export interface FormData {
  personalInfo: PersonalInfo
  universityInfo: UniversityInfo
  residencyInfo: ResidencyInfo
  incomeInfo: IncomeInfo
}
