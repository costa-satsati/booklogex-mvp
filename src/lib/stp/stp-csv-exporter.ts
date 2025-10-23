// src/lib/stp/stp-csv-exporter.ts
import type { StpReport } from '@/types/stp';
import Papa from 'papaparse';
import { saveAs } from 'file-saver';

/**
 * Export STP report to CSV format
 * Creates a CSV that can be imported into ATO Business Portal
 */
export function exportStpToCsv(report: StpReport): string {
  const rows = report.payees.map((payee) => ({
    // Employee identification
    'Tax File Number': payee.tfn,
    'Given Name': payee.givenName,
    'Family Name': payee.familyName,
    'Other Given Name': payee.otherGivenName || '',

    // Employment details
    'Employment Start Date': payee.employmentStartDate || '',
    'Employment End Date': payee.employmentEndDate || '',
    'Employment Basis': getEmploymentBasisDescription(payee.employmentBasis),
    'Country Code': payee.countryCode,

    // Payment details
    'Payment Date': payee.paymentDate,

    // Income breakdown
    'Gross Ordinary Time Earnings': formatNumber(payee.grossOrdinaryTimeEarnings),
    'Gross Overtime': formatNumber(payee.grossOvertimeEarnings || 0),
    'Gross Bonuses': formatNumber(payee.grossBonuses || 0),
    'Gross Commissions': formatNumber(payee.grossCommissions || 0),
    'Gross Allowances': formatNumber(payee.grossAllowances || 0),
    'Gross Other': formatNumber(payee.grossOtherEarnings || 0),
    'Total Gross': formatNumber(payee.grossPayment),

    // Tax
    'PAYG Withheld': formatNumber(payee.paygWithheld),
    'Tax Treatment': getTaxTreatmentDescription(payee.taxTreatmentCode),
    'Tax Free Threshold Claimed': payee.taxFreeThresholdClaimed ? 'Yes' : 'No',
    'HELP Debt': payee.helpDebt ? 'Yes' : 'No',

    // Superannuation
    'Super Contribution': formatNumber(payee.superContribution),
    'Super Guarantee': formatNumber(payee.superGuaranteeAmount),

    // YTD totals
    'YTD Gross': formatNumber(payee.ytdGross),
    'YTD PAYG': formatNumber(payee.ytdPaygWithheld),
    'YTD Super': formatNumber(payee.ytdSuper),

    // Leave (optional)
    'Annual Leave Balance (hours)': formatNumber(payee.annualLeaveAccrued || 0, 1),
    'Personal Leave Balance (hours)': formatNumber(payee.personalLeaveAccrued || 0, 1),
  }));

  const csv = Papa.unparse(rows, {
    quotes: true,
    header: true,
  });

  return csv;
}

/**
 * Download STP report as CSV file
 */
export function downloadStpCsv(report: StpReport): void {
  const csv = exportStpToCsv(report);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const filename = `STP_Report_${report.reportingPeriodEndDate}_${report.reportId}.csv`;
  saveAs(blob, filename);
}

/**
 * Generate summary CSV with totals
 */
export function generateStpSummaryCsv(report: StpReport): string {
  const summary = [
    ['STP Report Summary'],
    [''],
    ['Report Details'],
    ['Report ID', report.reportId],
    ['Report Type', report.reportType],
    ['Financial Year', report.financialYear],
    ['Pay Period Start', report.reportingPeriodStartDate],
    ['Pay Period End', report.reportingPeriodEndDate],
    ['Payment Date', report.paymentDate],
    [''],
    ['Payer Details'],
    ['ABN', report.payer.abn],
    ['Business Name', report.payer.businessName],
    ['Contact Email', report.payer.contactEmail || ''],
    ['Contact Phone', report.payer.contactPhone || ''],
    [''],
    ['Totals'],
    ['Total Employees', report.totalEmployees.toString()],
    ['Total Gross', formatCurrency(report.totalGross)],
    ['Total PAYG Withheld', formatCurrency(report.totalPaygWithheld)],
    ['Total Super', formatCurrency(report.totalSuper)],
    [''],
    ['Employee Breakdown'],
    ['Name', 'TFN', 'Gross', 'Tax', 'Super', 'Net', 'Employment Basis'],
  ];

  report.payees.forEach((payee) => {
    const net = payee.grossPayment - payee.paygWithheld;
    summary.push([
      `${payee.givenName} ${payee.familyName}`,
      payee.tfn,
      formatCurrency(payee.grossPayment),
      formatCurrency(payee.paygWithheld),
      formatCurrency(payee.superContribution),
      formatCurrency(net),
      getEmploymentBasisDescription(payee.employmentBasis),
    ]);
  });

  const csv = Papa.unparse(summary, {
    quotes: false,
    header: false,
  });

  return csv;
}

// Helper functions
function formatNumber(value: number, decimals: number = 2): string {
  return value.toFixed(decimals);
}

function formatCurrency(value: number): string {
  return `$${value.toFixed(2)}`;
}

function getEmploymentBasisDescription(code: string): string {
  const descriptions: Record<string, string> = {
    F: 'Full-time',
    P: 'Part-time',
    C: 'Casual',
    L: 'Labour hire',
    D: 'Death beneficiary',
  };
  return descriptions[code] || code;
}

function getTaxTreatmentDescription(code: string): string {
  const descriptions: Record<string, string> = {
    R: 'Regular',
    F: 'Foreign resident',
    H: 'Working holiday maker',
    N: 'No TFN quoted',
  };
  return descriptions[code] || code;
}
