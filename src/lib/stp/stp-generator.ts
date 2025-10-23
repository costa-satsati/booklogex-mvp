// src/lib/stp/stp-generator.ts
import type { PayrollRun, PayrollItem } from '@/types/payroll';
import type { Organisation } from '@/types/organisation';
import type { Employee } from '@/types/employee';
import type { StpReport, StpPayeeRecord, StpPayerRecord } from '@/types/stp';
import { format, getYear } from 'date-fns';

/**
 * Generate STP report from payroll run
 */
export async function generateStpReport(
  payrollRun: PayrollRun,
  payrollItems: PayrollItem[],
  organisation: Organisation,
  ytdData?: Map<string, { gross: number; tax: number; super: number }>
): Promise<StpReport> {
  // Validate required data
  if (!organisation.abn) {
    throw new Error('ABN is required for STP reporting. Please update organisation settings.');
  }

  if (!organisation.name) {
    throw new Error('Business name is required for STP reporting.');
  }

  // Generate payer record
  const payer = generatePayerRecord(organisation);

  // Generate payee records
  const payees: StpPayeeRecord[] = [];

  for (const item of payrollItems) {
    const employee = item.employees as unknown as Employee;

    if (!employee) {
      console.warn(`Skipping payroll item ${item.id}: No employee data`);
      continue;
    }

    // Contractors with ABN are not included in STP
    if (employee.employment_type === 'contractor' && employee.abn) {
      continue;
    }

    try {
      const ytd = ytdData?.get(employee.id) || { gross: 0, tax: 0, super: 0 };
      const payeeRecord = generatePayeeRecord(employee, item, payrollRun, ytd);
      payees.push(payeeRecord);
    } catch (error) {
      console.error(`Error generating STP record for ${employee.full_name}:`, error);
      throw new Error(
        `Failed to generate STP record for ${employee.full_name}: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );
    }
  }

  if (payees.length === 0) {
    throw new Error('No eligible employees found for STP reporting');
  }

  // Calculate totals
  const totalGross = payees.reduce((sum, p) => sum + p.grossPayment, 0);
  const totalPaygWithheld = payees.reduce((sum, p) => sum + p.paygWithheld, 0);
  const totalSuper = payees.reduce((sum, p) => sum + p.superContribution, 0);

  // Determine financial year
  const payDate = new Date(payrollRun.pay_date || payrollRun.pay_period_end);
  const payYear = getYear(payDate);
  const payMonth = payDate.getMonth() + 1; // 1-12
  const financialYear =
    payMonth >= 7
      ? `${payYear}-${String(payYear + 1).slice(2)}`
      : `${payYear - 1}-${String(payYear).slice(2)}`;

  // Build report
  const report: StpReport = {
    reportId: `STP-${format(new Date(), 'yyyyMMdd-HHmmss')}-${payrollRun.id.slice(0, 8)}`,
    reportType: 'update',
    reportingPeriodStartDate: format(new Date(payrollRun.pay_period_start), 'yyyy-MM-dd'),
    reportingPeriodEndDate: format(new Date(payrollRun.pay_period_end), 'yyyy-MM-dd'),
    paymentDate: format(payDate, 'yyyy-MM-dd'),
    payer,
    payees,
    totalGross,
    totalPaygWithheld,
    totalSuper,
    totalEmployees: payees.length,
    createdAt: new Date().toISOString(),
    financialYear,
  };

  return report;
}

/**
 * Generate payer (employer) record
 */
function generatePayerRecord(organisation: Organisation): StpPayerRecord {
  return {
    abn: formatAbn(organisation.abn || ''),
    businessName: organisation.name || '',
    branchNumber: '001', // Default branch
    contactName: organisation.contact_email || undefined,
    contactPhone: organisation.contact_phone || undefined,
    contactEmail: organisation.contact_email || undefined,
    addressLine1: organisation.business_address?.split('\n')[0] || '',
    addressLine2: organisation.business_address?.split('\n')[1] || undefined,
    suburb: 'Melbourne', // TODO: Parse from address
    state: 'VIC', // TODO: Parse from address
    postcode: '3000', // TODO: Parse from address
  };
}

/**
 * Generate payee (employee) record
 */
function generatePayeeRecord(
  employee: Employee,
  item: PayrollItem,
  payrollRun: PayrollRun,
  ytd: { gross: number; tax: number; super: number }
): StpPayeeRecord {
  // Validate TFN
  if (!employee.tfn && employee.employment_type !== 'contractor') {
    throw new Error(`TFN is required for ${employee.full_name}`);
  }

  // Split name
  const nameParts = employee.full_name.split(' ');
  const givenName = nameParts[0] || '';
  const familyName = nameParts.slice(1).join(' ') || nameParts[0] || ''; // If only one name, use it as family name

  // Map employment type to STP basis code
  const employmentBasis = mapEmploymentBasis(employee.employment_type);

  // Determine tax treatment
  const taxTreatmentCode = determineTaxTreatmentCode(employee);

  // Calculate YTD (including this pay)
  const ytdGross = ytd.gross + item.gross;
  const ytdPaygWithheld = ytd.tax + item.tax;
  const ytdSuper = ytd.super + item.super;

  const payDate = new Date(payrollRun.pay_date || payrollRun.pay_period_end);

  return {
    // Identification
    tfn: formatTfn(employee.tfn || ''),
    employmentStartDate: employee.start_date
      ? format(new Date(employee.start_date), 'yyyy-MM-dd')
      : undefined,
    employmentEndDate: employee.end_date
      ? format(new Date(employee.end_date), 'yyyy-MM-dd')
      : undefined,

    // Name
    familyName,
    givenName,

    // Employment details
    countryCode: employee.country_code || 'AU',
    employmentBasis,

    // Pay period
    paymentDate: format(payDate, 'yyyy-MM-dd'),

    // Income breakdown (STP Phase 2)
    grossOrdinaryTimeEarnings: item.gross, // For now, all in ordinary time
    grossPayment: item.gross,

    // Tax withholding
    paygWithheld: item.tax,
    taxTreatmentCode,
    taxFreeThresholdClaimed: employee.tax_free_threshold ?? true,
    helpDebt: employee.help_debt ?? false,
    financialSupplementDebt: false,

    // Superannuation
    superContribution: item.super,
    superGuaranteeAmount: item.super, // Assume all super is SG

    // YTD
    ytdGross,
    ytdPaygWithheld,
    ytdSuper,

    // Leave balances (optional)
    annualLeaveAccrued: employee.annual_leave_hours,
    personalLeaveAccrued: employee.sick_leave_hours,
  };
}

/**
 * Map internal employment type to STP basis code
 */
function mapEmploymentBasis(type: string): 'F' | 'P' | 'C' | 'L' | 'D' {
  const mapping: Record<string, 'F' | 'P' | 'C' | 'L' | 'D'> = {
    full_time: 'F',
    part_time: 'P',
    casual: 'C',
    contractor: 'C', // Labour hire would be 'L'
  };

  return mapping[type.toLowerCase()] || 'F';
}

/**
 * Determine tax treatment code
 */
function determineTaxTreatmentCode(employee: Employee): 'R' | 'F' | 'H' | 'N' {
  if (!employee.tfn) return 'N'; // No TFN quoted
  if (employee.tax_scale_type === 'foreign_resident') return 'F';
  if (employee.tax_scale_type === 'working_holiday_maker') return 'H';
  return 'R'; // Regular
}

/**
 * Format ABN (remove spaces, ensure 11 digits)
 */
function formatAbn(abn: string): string {
  const cleaned = abn.replace(/\s/g, '');
  if (cleaned.length !== 11) {
    throw new Error(`Invalid ABN: ${abn}. Must be 11 digits.`);
  }
  return cleaned;
}

/**
 * Format TFN (remove spaces, ensure 9 digits)
 */
function formatTfn(tfn: string): string {
  const cleaned = tfn.replace(/\s/g, '');
  if (cleaned.length !== 9) {
    throw new Error(`Invalid TFN. Must be 9 digits.`);
  }
  return cleaned;
}
