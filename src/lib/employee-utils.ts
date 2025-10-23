// src/lib/employee-utils.ts

/**
 * Calculate hourly rate from base rate
 */
export function calculateHourlyRate(
  baseSalary: number,
  rateType: 'hourly' | 'daily' | 'annual',
  hoursPerWeek: number = 38
): number {
  switch (rateType) {
    case 'hourly':
      return baseSalary;
    case 'daily':
      // Assuming 8-hour day
      return baseSalary / 8;
    case 'annual':
      // Annual / 52 weeks / hours per week
      return baseSalary / 52 / hoursPerWeek;
    default:
      return 0;
  }
}

/**
 * Calculate annual salary from hourly rate
 */
export function calculateAnnualSalary(hourlyRate: number, hoursPerWeek: number = 38): number {
  return hourlyRate * hoursPerWeek * 52;
}

/**
 * Format display rate
 */
export function formatRate(
  baseSalary: number | undefined,
  rateType: 'hourly' | 'daily' | 'annual' | undefined
): string {
  if (!baseSalary) return 'No rate set';

  switch (rateType) {
    case 'hourly':
      return `$${baseSalary.toFixed(2)}/hr`;
    case 'daily':
      return `$${baseSalary.toFixed(2)}/day`;
    case 'annual':
      return `$${baseSalary.toLocaleString('en-AU', { maximumFractionDigits: 0 })}/year`;
    default:
      return `$${baseSalary.toLocaleString('en-AU')}`;
  }
}

/**
 * Validate Australian TFN
 */
export function validateTFN(tfn: string): boolean {
  // Remove spaces and hyphens
  const cleaned = tfn.replace(/[\s-]/g, '');

  // Must be 9 digits
  if (!/^\d{9}$/.test(cleaned)) return false;

  // TFN algorithm check
  const weights = [1, 4, 3, 7, 5, 8, 6, 9, 10];
  let sum = 0;

  for (let i = 0; i < 9; i++) {
    sum += parseInt(cleaned[i]) * weights[i];
  }

  return sum % 11 === 0;
}

/**
 * Format TFN for display
 */
export function formatTFN(tfn: string): string {
  const cleaned = tfn.replace(/[\s-]/g, '');
  if (cleaned.length !== 9) return tfn;
  return `${cleaned.slice(0, 3)} ${cleaned.slice(3, 6)} ${cleaned.slice(6)}`;
}

/**
 * Validate Australian phone number
 */
export function validatePhone(phone: string): boolean {
  // Remove spaces, hyphens, parentheses
  const cleaned = phone.replace(/[\s\-()]/g, '');

  // Australian mobile: 04XX XXX XXX (10 digits starting with 04)
  // Australian landline: 0X XXXX XXXX (10 digits starting with 02, 03, 07, 08)
  const mobilePattern = /^04\d{8}$/;
  const landlinePattern = /^0[2378]\d{8}$/;

  return mobilePattern.test(cleaned) || landlinePattern.test(cleaned);
}

/**
 * Format phone for display
 */
export function formatPhone(phone: string): string {
  const cleaned = phone.replace(/[\s\-()]/g, '');

  if (cleaned.length === 10) {
    // Mobile: 0412 345 678
    if (cleaned.startsWith('04')) {
      return `${cleaned.slice(0, 4)} ${cleaned.slice(4, 7)} ${cleaned.slice(7)}`;
    }
    // Landline: (02) 1234 5678
    return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 6)} ${cleaned.slice(6)}`;
  }

  return phone;
}

/**
 * Get default hours for employment type
 */
export function getDefaultHours(employmentType: string): number {
  switch (employmentType) {
    case 'full_time':
      return 38;
    case 'part_time':
      return 25;
    case 'casual':
      return 20;
    case 'contractor':
      return 38;
    default:
      return 38;
  }
}
