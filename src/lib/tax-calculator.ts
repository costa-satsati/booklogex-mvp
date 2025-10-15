// src/lib/tax-calculator.ts
/**
 * Australian Tax Calculator (2024-25 FY)
 * Based on ATO tax tables
 */

interface TaxBracket {
  min: number;
  max: number;
  baseAmount: number;
  rate: number;
}

// ATO Tax Table 2024-25 (resident rates)
const TAX_BRACKETS: TaxBracket[] = [
  { min: 0, max: 18200, baseAmount: 0, rate: 0 },
  { min: 18201, max: 45000, baseAmount: 0, rate: 0.19 },
  { min: 45001, max: 120000, baseAmount: 5092, rate: 0.325 },
  { min: 120001, max: 180000, baseAmount: 29467, rate: 0.37 },
  { min: 180001, max: Infinity, baseAmount: 51667, rate: 0.45 },
];

// Medicare Levy
const MEDICARE_LEVY_RATE = 0.02;
const MEDICARE_LEVY_THRESHOLD = 26000; // Single, no dependents

// Super Guarantee Rate
const SUPER_GUARANTEE_RATE = 0.115; // 11.5% (2024-25)

/**
 * Calculate annual tax based on taxable income
 */
export function calculateAnnualTax(
  annualIncome: number,
  hasTaxFreeThreshold: boolean = true
): number {
  if (!hasTaxFreeThreshold) {
    // No tax-free threshold = tax on every dollar
    return annualIncome * 0.47; // Simplified flat rate
  }

  // Find applicable bracket
  const bracket = TAX_BRACKETS.find((b) => annualIncome >= b.min && annualIncome <= b.max);

  if (!bracket) return 0;

  // Calculate base tax
  const taxableAmount = annualIncome - bracket.min;
  const baseTax = bracket.baseAmount + taxableAmount * bracket.rate;

  // Add Medicare Levy (if above threshold)
  const medicareLevyAmount =
    annualIncome > MEDICARE_LEVY_THRESHOLD ? annualIncome * MEDICARE_LEVY_RATE : 0;

  return Math.max(0, baseTax + medicareLevyAmount);
}

/**
 * Calculate fortnightly PAYG tax withholding
 */
export function calculateFortnightlyTax(
  grossFortnightly: number,
  hasTaxFreeThreshold: boolean = true
): number {
  // Annualize the income (26 fortnights per year)
  const annualIncome = grossFortnightly * 26;

  // Calculate annual tax
  const annualTax = calculateAnnualTax(annualIncome, hasTaxFreeThreshold);

  // Return fortnightly amount
  return Math.round((annualTax / 26) * 100) / 100;
}

/**
 * Calculate weekly PAYG tax withholding
 */
export function calculateWeeklyTax(
  grossWeekly: number,
  hasTaxFreeThreshold: boolean = true
): number {
  const annualIncome = grossWeekly * 52;
  const annualTax = calculateAnnualTax(annualIncome, hasTaxFreeThreshold);
  return Math.round((annualTax / 52) * 100) / 100;
}

/**
 * Calculate monthly PAYG tax withholding
 */
export function calculateMonthlyTax(
  grossMonthly: number,
  hasTaxFreeThreshold: boolean = true
): number {
  const annualIncome = grossMonthly * 12;
  const annualTax = calculateAnnualTax(annualIncome, hasTaxFreeThreshold);
  return Math.round((annualTax / 12) * 100) / 100;
}

/**
 * Calculate superannuation contribution
 */
export function calculateSuper(
  grossAmount: number,
  superRate: number = SUPER_GUARANTEE_RATE
): number {
  return Math.round(grossAmount * superRate * 100) / 100;
}

/**
 * Calculate net pay
 */
export function calculateNetPay(gross: number, tax: number): number {
  return Math.round((gross - tax) * 100) / 100;
}

/**
 * Calculate gross pay from hourly rate
 */
export function calculateGrossFromHourly(
  hourlyRate: number,
  hours: number,
  payFrequency: 'weekly' | 'fortnightly' | 'monthly'
): number {
  const totalHours =
    payFrequency === 'fortnightly' ? hours * 2 : payFrequency === 'monthly' ? hours * 4.33 : hours;

  return Math.round(hourlyRate * totalHours * 100) / 100;
}

/**
 * Main payroll calculation function
 */
export interface PayrollCalculationInput {
  grossPay: number;
  payFrequency: 'weekly' | 'fortnightly' | 'monthly';
  hasTaxFreeThreshold?: boolean;
  superRate?: number;
}

export interface PayrollCalculationResult {
  gross: number;
  tax: number;
  super: number;
  net: number;
  totalCost: number; // gross + super
}

export function calculatePayroll(input: PayrollCalculationInput): PayrollCalculationResult {
  const {
    grossPay,
    payFrequency,
    hasTaxFreeThreshold = true,
    superRate = SUPER_GUARANTEE_RATE,
  } = input;

  // Calculate tax based on frequency
  let tax = 0;
  if (payFrequency === 'fortnightly') {
    tax = calculateFortnightlyTax(grossPay, hasTaxFreeThreshold);
  } else if (payFrequency === 'weekly') {
    tax = calculateWeeklyTax(grossPay, hasTaxFreeThreshold);
  } else {
    tax = calculateMonthlyTax(grossPay, hasTaxFreeThreshold);
  }

  // Calculate super
  const superAmount = calculateSuper(grossPay, superRate);

  // Calculate net
  const net = calculateNetPay(grossPay, tax);

  return {
    gross: grossPay,
    tax,
    super: superAmount,
    net,
    totalCost: grossPay + superAmount,
  };
}

/**
 * Validate TFN format (basic check)
 */
export function validateTFN(tfn: string): boolean {
  const cleaned = tfn.replace(/\s/g, '');
  return /^\d{9}$/.test(cleaned);
}

/**
 * Format currency for display
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
  }).format(amount);
}
