/**
 * Utility functions to calculate days spent in the US for different tax years
 * 
 * Rules:
 * - Include the day arrived
 * - Exclude the day departed
 * - Only count days within the specified tax year
 */

import { ResidencyInfo, Visit } from '@/types/form'

/**
 * Calculate days in US for a specific tax year
 * @param residencyInfo - Residency information with visits
 * @param year - Tax year (e.g., 2025, 2024, 2023)
 * @returns Number of days in US during that year
 */
export function calculateDaysInUSForYear(
  residencyInfo: ResidencyInfo,
  year: number
): number {
  let totalDays = 0
  const taxYearStart = new Date(`${year}-01-01`)
  const taxYearEnd = new Date(`${year}-12-31`)

  // Process all visits
  residencyInfo.visits.forEach((visit) => {
    if (visit.entryDate) {
      const entry = new Date(visit.entryDate)
      entry.setHours(0, 0, 0, 0) // Normalize to start of day
      
      // If no exit date, assume still in US (use end of tax year or today, whichever is earlier)
      const exit = visit.exitDate ? new Date(visit.exitDate) : (new Date() < taxYearEnd ? new Date() : taxYearEnd)
      exit.setHours(0, 0, 0, 0) // Normalize to start of day

      // Only count days within the tax year
      const startDate = entry > taxYearStart ? entry : taxYearStart
      const endDate = exit < taxYearEnd ? exit : taxYearEnd

      if (startDate <= endDate) {
        // Calculate difference in days
        // Include the day arrived, exclude the day departed
        // Example: Entry Jan 1, Exit Jan 2 = 1 day (Jan 1 only, Jan 2 excluded)
        const diffTime = endDate.getTime() - startDate.getTime()
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
        
        // If exit date is provided and it's within the year, exclude the departure day
        if (visit.exitDate && exit <= taxYearEnd && exit >= taxYearStart) {
          // We have an exit date within the year
          // diffDays gives us the number of full 24-hour periods
          // Example: Jan 1 to Jan 2 = 1 day difference, but we want to count Jan 1 only
          // So we use diffDays directly (which is 1 in this case, representing Jan 1)
          totalDays += diffDays
        } else {
          // No exit date or exit is after year end - include all days up to and including endDate
          // Example: Jan 1 to Dec 31 = 364 days difference, but we want 365 days (including both)
          totalDays += diffDays + 1
        }
      }
    }
  })

  return totalDays
}

/**
 * Calculate days in US for 2025
 */
export function calculateDaysInUS2025(residencyInfo: ResidencyInfo): number {
  return calculateDaysInUSForYear(residencyInfo, 2025)
}

/**
 * Calculate days in US for 2024
 */
export function calculateDaysInUS2024(residencyInfo: ResidencyInfo): number {
  return calculateDaysInUSForYear(residencyInfo, 2024)
}

/**
 * Calculate days in US for 2023
 */
export function calculateDaysInUS2023(residencyInfo: ResidencyInfo): number {
  return calculateDaysInUSForYear(residencyInfo, 2023)
}

/**
 * Check if user had positive days in US for a specific year
 * Used for determining which years to mark with "F" in Form 8843
 */
export function hadDaysInUSForYear(
  residencyInfo: ResidencyInfo,
  year: number
): boolean {
  return calculateDaysInUSForYear(residencyInfo, year) > 0
}
