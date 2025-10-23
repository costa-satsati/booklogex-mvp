// src/lib/stp/stp-json-exporter.ts
import type { StpReport } from '@/types/stp';
import { saveAs } from 'file-saver';

/**
 * Export STP report to JSON format
 * Useful for debugging and future API integration
 */
export function exportStpToJson(report: StpReport): string {
  return JSON.stringify(report, null, 2);
}

/**
 * Download STP report as JSON file
 */
export function downloadStpJson(report: StpReport): void {
  const json = exportStpToJson(report);
  const blob = new Blob([json], { type: 'application/json;charset=utf-8;' });
  const filename = `STP_Report_${report.reportingPeriodEndDate}_${report.reportId}.json`;
  saveAs(blob, filename);
}

/**
 * Generate ATO-compatible JSON structure (for future API integration)
 */
export function generateAtoJsonPayload(report: StpReport): object {
  // This would be the actual ATO API format
  // For now, return simplified structure
  return {
    reportHeader: {
      reportId: report.reportId,
      reportType: report.reportType,
      reportingPeriod: {
        startDate: report.reportingPeriodStartDate,
        endDate: report.reportingPeriodEndDate,
      },
      paymentDate: report.paymentDate,
      financialYear: report.financialYear,
    },
    payer: {
      abn: report.payer.abn,
      businessName: report.payer.businessName,
      branchNumber: report.payer.branchNumber,
      contactDetails: {
        name: report.payer.contactName,
        phone: report.payer.contactPhone,
        email: report.payer.contactEmail,
      },
      address: {
        line1: report.payer.addressLine1,
        line2: report.payer.addressLine2,
        suburb: report.payer.suburb,
        state: report.payer.state,
        postcode: report.payer.postcode,
      },
    },
    payees: report.payees.map((payee) => ({
      identity: {
        tfn: payee.tfn,
        name: {
          given: payee.givenName,
          family: payee.familyName,
          other: payee.otherGivenName,
        },
      },
      employment: {
        startDate: payee.employmentStartDate,
        endDate: payee.employmentEndDate,
        basis: payee.employmentBasis,
        countryCode: payee.countryCode,
      },
      payment: {
        date: payee.paymentDate,
        income: {
          ordinaryTime: payee.grossOrdinaryTimeEarnings,
          overtime: payee.grossOvertimeEarnings,
          bonuses: payee.grossBonuses,
          commissions: payee.grossCommissions,
          allowances: payee.grossAllowances,
          other: payee.grossOtherEarnings,
          total: payee.grossPayment,
        },
        tax: {
          withheld: payee.paygWithheld,
          treatment: payee.taxTreatmentCode,
          taxFreeThreshold: payee.taxFreeThresholdClaimed,
          helpDebt: payee.helpDebt,
          sfssDebt: payee.financialSupplementDebt,
        },
        superannuation: {
          contribution: payee.superContribution,
          guarantee: payee.superGuaranteeAmount,
        },
      },
      yearToDate: {
        gross: payee.ytdGross,
        tax: payee.ytdPaygWithheld,
        super: payee.ytdSuper,
      },
      leave: {
        annual: payee.annualLeaveAccrued,
        personal: payee.personalLeaveAccrued,
      },
    })),
    totals: {
      employees: report.totalEmployees,
      gross: report.totalGross,
      tax: report.totalPaygWithheld,
      super: report.totalSuper,
    },
  };
}
