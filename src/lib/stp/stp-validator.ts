// src/lib/stp/stp-validator.ts
import type { StpReport, StpValidationResult, StpValidationError } from '@/types/stp';
import type { Organisation } from '@/types/organisation';

/**
 * Validate STP report before lodgement
 */
export function validateStpReport(report: StpReport): StpValidationResult {
  const errors: StpValidationError[] = [];
  const warnings: StpValidationError[] = [];

  // Validate payer details
  if (!report.payer.abn || report.payer.abn.length !== 11) {
    errors.push({
      field: 'payer.abn',
      message: 'ABN must be exactly 11 digits',
      severity: 'error',
    });
  }

  if (!report.payer.businessName) {
    errors.push({
      field: 'payer.businessName',
      message: 'Business name is required',
      severity: 'error',
    });
  }

  if (
    !report.payer.addressLine1 ||
    !report.payer.suburb ||
    !report.payer.state ||
    !report.payer.postcode
  ) {
    warnings.push({
      field: 'payer.address',
      message: 'Complete business address is recommended',
      severity: 'warning',
    });
  }

  // Validate each payee
  report.payees.forEach((payee, index) => {
    const prefix = `payee[${index}]`;

    // TFN validation
    if (!payee.tfn || payee.tfn.length !== 9) {
      errors.push({
        field: `${prefix}.tfn`,
        message: `${payee.givenName} ${payee.familyName}: TFN must be exactly 9 digits`,
        severity: 'error',
      });
    }

    // Name validation
    if (!payee.givenName || !payee.familyName) {
      errors.push({
        field: `${prefix}.name`,
        message: `${payee.givenName} ${payee.familyName}: Given name and family name are required`,
        severity: 'error',
      });
    }

    // Income validation
    if (payee.grossPayment <= 0) {
      warnings.push({
        field: `${prefix}.grossPayment`,
        message: `${payee.givenName} ${payee.familyName}: Gross payment is zero or negative`,
        severity: 'warning',
      });
    }

    // Tax withholding validation
    if (payee.paygWithheld < 0) {
      errors.push({
        field: `${prefix}.paygWithheld`,
        message: `${payee.givenName} ${payee.familyName}: PAYG withheld cannot be negative`,
        severity: 'error',
      });
    }

    // Super validation
    if (payee.superContribution < 0) {
      errors.push({
        field: `${prefix}.superContribution`,
        message: `${payee.givenName} ${payee.familyName}: Super contribution cannot be negative`,
        severity: 'error',
      });
    }

    // YTD validation
    if (payee.ytdGross < payee.grossPayment) {
      errors.push({
        field: `${prefix}.ytdGross`,
        message: `${payee.givenName} ${payee.familyName}: YTD gross cannot be less than current payment`,
        severity: 'error',
      });
    }

    // Employment basis validation
    if (!['F', 'P', 'C', 'L', 'D'].includes(payee.employmentBasis)) {
      errors.push({
        field: `${prefix}.employmentBasis`,
        message: `${payee.givenName} ${payee.familyName}: Invalid employment basis code`,
        severity: 'error',
      });
    }

    // Date validations
    try {
      new Date(payee.paymentDate);
    } catch {
      errors.push({
        field: `${prefix}.paymentDate`,
        message: `${payee.givenName} ${payee.familyName}: Invalid payment date`,
        severity: 'error',
      });
    }
  });

  // Validate totals match
  const calculatedGross = report.payees.reduce((sum, p) => sum + p.grossPayment, 0);
  const calculatedTax = report.payees.reduce((sum, p) => sum + p.paygWithheld, 0);
  const calculatedSuper = report.payees.reduce((sum, p) => sum + p.superContribution, 0);

  if (Math.abs(calculatedGross - report.totalGross) > 0.01) {
    errors.push({
      field: 'totalGross',
      message: 'Total gross does not match sum of individual payments',
      severity: 'error',
    });
  }

  if (Math.abs(calculatedTax - report.totalPaygWithheld) > 0.01) {
    warnings.push({
      field: 'totalPaygWithheld',
      message: 'Total PAYG does not match sum of individual withholdings',
      severity: 'warning',
    });
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Check if organisation is ready for STP
 */
export function isStpReady(organisation: Organisation): { ready: boolean; missing: string[] } {
  const missing: string[] = [];

  if (!organisation.abn || organisation.abn.length !== 11) {
    missing.push('Valid ABN (11 digits)');
  }

  if (!organisation.name) {
    missing.push('Business name');
  }

  if (!organisation.business_address) {
    missing.push('Business address');
  }

  return {
    ready: missing.length === 0,
    missing,
  };
}
