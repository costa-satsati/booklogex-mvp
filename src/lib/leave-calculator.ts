// src/lib/leave-calculator.ts
import type { Employee } from '@/types/employee';

/**
 * Australian leave entitlements and calculations
 */

// Standard entitlements (hours per year)
export const LEAVE_ENTITLEMENTS = {
  ANNUAL_LEAVE_FULL_TIME: 152, // 4 weeks × 38 hours
  ANNUAL_LEAVE_PART_TIME_RATE: 4, // 4 weeks per year
  SICK_LEAVE_FULL_TIME: 76, // 10 days × 7.6 hours
  SICK_LEAVE_PART_TIME_RATE: 10, // 10 days per year
  PERSONAL_LEAVE_FULL_TIME: 76, // Same as sick leave
  LONG_SERVICE_LEAVE_WEEKS: 8.67, // After 10 years
  LONG_SERVICE_LEAVE_YEARS: 10,
} as const;

/**
 * Calculate annual leave accrual per pay period
 */
export function calculateAnnualLeaveAccrual(
  employee: Employee,
  payFrequency: 'weekly' | 'fortnightly' | 'monthly'
): number {
  const hoursPerWeek = employee.hours_per_week || 38;

  // Annual entitlement based on employment type
  let annualHours: number;

  if (employee.employment_type === 'full_time') {
    annualHours = LEAVE_ENTITLEMENTS.ANNUAL_LEAVE_FULL_TIME;
  } else if (employee.employment_type === 'part_time') {
    // Pro-rata based on hours worked
    annualHours = (hoursPerWeek / 38) * LEAVE_ENTITLEMENTS.ANNUAL_LEAVE_FULL_TIME;
  } else {
    // Casual and contractors don't accrue leave
    return 0;
  }

  // Calculate accrual per pay period
  switch (payFrequency) {
    case 'weekly':
      return annualHours / 52;
    case 'fortnightly':
      return annualHours / 26;
    case 'monthly':
      return annualHours / 12;
    default:
      return 0;
  }
}

/**
 * Calculate sick/personal leave accrual per pay period
 */
export function calculateSickLeaveAccrual(
  employee: Employee,
  payFrequency: 'weekly' | 'fortnightly' | 'monthly'
): number {
  const hoursPerWeek = employee.hours_per_week || 38;

  // Only full-time and part-time employees accrue sick leave
  if (!['full_time', 'part_time'].includes(employee.employment_type)) {
    return 0;
  }

  // Annual entitlement
  const annualHours =
    employee.employment_type === 'full_time'
      ? LEAVE_ENTITLEMENTS.SICK_LEAVE_FULL_TIME
      : (hoursPerWeek / 38) * LEAVE_ENTITLEMENTS.SICK_LEAVE_FULL_TIME;

  // Calculate accrual per pay period
  switch (payFrequency) {
    case 'weekly':
      return annualHours / 52;
    case 'fortnightly':
      return annualHours / 26;
    case 'monthly':
      return annualHours / 12;
    default:
      return 0;
  }
}

/**
 * Calculate long service leave eligibility
 */
export function calculateLongServiceLeave(employee: Employee, yearsOfService: number): number {
  // Long service leave accrues after 10 years (varies by state)
  if (yearsOfService < LEAVE_ENTITLEMENTS.LONG_SERVICE_LEAVE_YEARS) {
    return 0;
  }

  const hoursPerWeek = employee.hours_per_week || 38;
  const weeksEntitled = LEAVE_ENTITLEMENTS.LONG_SERVICE_LEAVE_WEEKS;

  return weeksEntitled * hoursPerWeek;
}

/**
 * Calculate years of service from start date
 */
export function calculateYearsOfService(startDate: string | Date): number {
  const start = new Date(startDate);
  const now = new Date();
  const diffMs = now.getTime() - start.getTime();
  const diffYears = diffMs / (1000 * 60 * 60 * 24 * 365.25);
  return Math.floor(diffYears * 10) / 10; // Round to 1 decimal
}

/**
 * Convert hours to days (for display)
 */
export function hoursToDays(hours: number, hoursPerDay: number = 7.6): number {
  return Math.round((hours / hoursPerDay) * 10) / 10;
}

/**
 * Convert days to hours
 */
export function daysToHours(days: number, hoursPerDay: number = 7.6): number {
  return days * hoursPerDay;
}

/**
 * Format leave balance for display
 */
export function formatLeaveBalance(hours: number, hoursPerDay: number = 7.6): string {
  const days = hoursToDays(hours, hoursPerDay);
  return `${hours.toFixed(1)}h (${days.toFixed(1)} days)`;
}

/**
 * Calculate leave loading (17.5% in Australia)
 */
export function calculateLeaveLoading(baseAmount: number, loadingRate: number = 17.5): number {
  return baseAmount * (loadingRate / 100);
}

/**
 * Check if employee is eligible for leave type
 */
export function isEligibleForLeave(
  employee: Employee,
  leaveType: 'annual' | 'sick' | 'personal' | 'long_service'
): boolean {
  const employmentType = employee.employment_type;

  // Casual and contractors don't get leave
  if (['casual', 'contractor'].includes(employmentType)) {
    return false;
  }

  // Long service leave requires 10 years
  if (leaveType === 'long_service') {
    const yearsOfService = employee.start_date ? calculateYearsOfService(employee.start_date) : 0;
    return yearsOfService >= LEAVE_ENTITLEMENTS.LONG_SERVICE_LEAVE_YEARS;
  }

  // Full-time and part-time eligible for all other leave
  return ['full_time', 'part_time'].includes(employmentType);
}
