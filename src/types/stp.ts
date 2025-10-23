// src/types/stp.ts
export interface StpPayeeRecord {
  // Employee identification
  tfn: string; // Tax File Number
  employmentStartDate?: string; // YYYY-MM-DD
  employmentEndDate?: string; // YYYY-MM-DD if terminated

  // Name details
  familyName: string;
  givenName: string;
  otherGivenName?: string;

  // Address (optional for employees)
  addressLine1?: string;
  addressLine2?: string;
  suburb?: string;
  state?: string;
  postcode?: string;

  // Employment details (STP Phase 2)
  countryCode: string; // Default: AU
  employmentBasis: 'F' | 'P' | 'C' | 'L' | 'D'; // Full/Part/Casual/Labour/Death

  // Pay period details
  paymentDate: string; // YYYY-MM-DD

  // Income breakdown (STP Phase 2 - disaggregated)
  grossOrdinaryTimeEarnings: number; // Regular wages/salary
  grossOvertimeEarnings?: number;
  grossBonuses?: number;
  grossCommissions?: number;
  grossDirectorsCommissions?: number;
  grossAllowances?: number;
  grossOtherEarnings?: number;

  // Total gross (sum of above)
  grossPayment: number;

  // PAYG withholding
  paygWithheld: number;

  // Tax treatment
  taxTreatmentCode: 'R' | 'F' | 'H' | 'N'; // Regular/Foreign resident/WHM/No TFN quoted
  taxFreeThresholdClaimed: boolean;
  helpDebt: boolean;
  financialSupplementDebt: boolean;

  // Superannuation
  superContribution: number;
  superGuaranteeAmount: number;

  // YTD totals
  ytdGross: number;
  ytdPaygWithheld: number;
  ytdSuper: number;

  // Leave balances (optional)
  annualLeaveAccrued?: number; // Hours
  personalLeaveAccrued?: number; // Hours

  // Union fees (optional)
  unionFees?: number;

  // Foreign employment income (if applicable)
  foreignEmploymentIncome?: number;
}

export interface StpPayerRecord {
  // Business identification
  abn: string;
  businessName: string;
  branchNumber?: string; // 001, 002, etc.

  // Contact details
  contactName?: string;
  contactPhone?: string;
  contactEmail?: string;

  // Address
  addressLine1: string;
  addressLine2?: string;
  suburb: string;
  state: string;
  postcode: string;
}

export interface StpReport {
  // Report metadata
  reportId: string; // Unique identifier
  reportType: 'update' | 'full_file_replacement';
  reportingPeriodStartDate: string; // YYYY-MM-DD
  reportingPeriodEndDate: string; // YYYY-MM-DD
  paymentDate: string; // YYYY-MM-DD

  // Payer details
  payer: StpPayerRecord;

  // Payees (employees)
  payees: StpPayeeRecord[];

  // Totals
  totalGross: number;
  totalPaygWithheld: number;
  totalSuper: number;
  totalEmployees: number;

  // Metadata
  createdAt: string;
  financialYear: string; // e.g. "2024-25"
}

export interface StpReportDb {
  id: string;
  org_id: string;
  payroll_run_id: string;
  report_type: 'update' | 'full_file_replacement';
  lodgement_method: 'manual' | 'api' | 'ssp';
  lodgement_status: 'pending' | 'lodged' | 'accepted' | 'rejected';
  submission_key?: string;
  stp_identifier?: string;
  lodged_at?: string;
  report_data: StpReport;
  csv_data?: string;
  error_message?: string;
  error_code?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface StpValidationError {
  field: string;
  message: string;
  severity: 'error' | 'warning';
}

export interface StpValidationResult {
  valid: boolean;
  errors: StpValidationError[];
  warnings: StpValidationError[];
}
