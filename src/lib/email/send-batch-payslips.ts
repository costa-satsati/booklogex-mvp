// src/lib/email/send-batch-payslips.ts
// CORRECTED VERSION - uses your existing type names

import { sendPayslipEmail, canSendPayslipEmail } from './send-payslip';
import { EMAIL_CONFIG } from './resend-client';
import type { PayrollRun, PayrollItem } from '@/types/payroll';
import type { Employee } from '@/types/employee';
import type { Organisation } from '@/types/organisation';

/**
 * Result for a single employee in batch send
 */
export interface BatchEmployeeResult {
  employee: Employee;
  success: boolean;
  messageId?: string;
  error?: string;
  skipped?: boolean;
  skipReason?: string;
}

/**
 * Overall result of batch sending
 */
export interface BatchSendResult {
  total: number;
  sent: number;
  failed: number;
  skipped: number;
  results: BatchEmployeeResult[];
  duration: number; // milliseconds
}

/**
 * Send payslips to all employees in a payroll run
 * Processes sequentially with delays to avoid rate limiting
 * UPDATED: Uses Organisation type
 */
export async function sendBatchPayslips(
  payrollRun: PayrollRun,
  payrollItems: PayrollItem[],
  pdfCache: Map<string, string>, // Map of employee_id -> base64 PDF
  orgSettings: Organisation,
  onProgress?: (sent: number, total: number) => void
): Promise<BatchSendResult> {
  const startTime = Date.now();

  const result: BatchSendResult = {
    total: payrollItems.length,
    sent: 0,
    failed: 0,
    skipped: 0,
    results: [],
    duration: 0,
  };

  // Process each payroll item sequentially
  for (let i = 0; i < payrollItems.length; i++) {
    const item = payrollItems[i];
    const employee = item.employees as Employee;

    // Validate employee data
    if (!employee) {
      result.failed++;
      result.results.push({
        employee: { full_name: 'Unknown', email: '' } as Employee,
        success: false,
        error: 'Employee data not found',
      });
      continue;
    }

    // Check if email can be sent
    const validation = canSendPayslipEmail(employee, orgSettings);
    if (!validation.canSend) {
      result.skipped++;
      result.results.push({
        employee,
        success: false,
        skipped: true,
        skipReason: validation.reason,
      });
      continue;
    }

    // Get PDF from cache
    const pdfBase64 = pdfCache.get(employee.id);
    if (!pdfBase64) {
      result.failed++;
      result.results.push({
        employee,
        success: false,
        error: 'PDF not generated',
      });
      continue;
    }

    // Send email
    try {
      const sendResult = await sendPayslipEmail({
        payrollRun,
        payrollItem: item,
        employee,
        orgSettings,
        pdfBase64,
      });

      if (sendResult.success) {
        result.sent++;
        result.results.push({
          employee,
          success: true,
          messageId: sendResult.messageId,
        });
      } else {
        result.failed++;
        result.results.push({
          employee,
          success: false,
          error: sendResult.error,
        });
      }
    } catch (error) {
      result.failed++;
      result.results.push({
        employee,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }

    // Report progress
    if (onProgress) {
      onProgress(i + 1, payrollItems.length);
    }

    // Add delay between emails to avoid rate limiting
    // Skip delay on last item
    if (i < payrollItems.length - 1) {
      await sleep(EMAIL_CONFIG.batchDelay);
    }
  }

  result.duration = Date.now() - startTime;

  return result;
}

/**
 * Generate a summary message for batch results
 */
export function getBatchSummaryMessage(result: BatchSendResult): string {
  const { total, sent, failed, skipped } = result;

  if (sent === total) {
    return `✅ Successfully sent all ${total} payslips`;
  }

  if (sent === 0) {
    return `❌ Failed to send any payslips (${failed} errors, ${skipped} skipped)`;
  }

  const parts: string[] = [];

  if (sent > 0) {
    parts.push(`✅ Sent ${sent} of ${total}`);
  }

  if (failed > 0) {
    parts.push(`❌ ${failed} failed`);
  }

  if (skipped > 0) {
    parts.push(`⚠️ ${skipped} skipped`);
  }

  return parts.join(', ');
}

/**
 * Get detailed error messages for failed sends
 */
export function getFailedEmailDetails(result: BatchSendResult): string[] {
  return result.results
    .filter((r) => !r.success && !r.skipped)
    .map((r) => `${r.employee.full_name}: ${r.error || 'Unknown error'}`);
}

/**
 * Get details of skipped emails
 */
export function getSkippedEmailDetails(result: BatchSendResult): string[] {
  return result.results
    .filter((r) => r.skipped)
    .map((r) => `${r.employee.full_name}: ${r.skipReason || 'Unknown reason'}`);
}

/**
 * Check if all employees have valid email addresses
 * UPDATED: Uses Organisation type
 */
export function validateAllEmployeeEmails(
  payrollItems: PayrollItem[],
  orgSettings: Organisation
): { valid: boolean; issues: string[] } {
  const issues: string[] = [];

  for (const item of payrollItems) {
    const employee = item.employees as Employee;

    if (!employee) {
      issues.push('Some employees have missing data');
      continue;
    }

    const validation = canSendPayslipEmail(employee, orgSettings);
    if (!validation.canSend) {
      issues.push(`${employee.full_name}: ${validation.reason}`);
    }
  }

  return {
    valid: issues.length === 0,
    issues,
  };
}

/**
 * Sleep for specified milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Estimate time to send all payslips
 */
export function estimateBatchDuration(itemCount: number): number {
  // Base time per email (average 1 second)
  const baseTime = 1000;

  // Delay between emails
  const delayTime = EMAIL_CONFIG.batchDelay;

  // Total estimated time
  return baseTime * itemCount + delayTime * (itemCount - 1);
}

/**
 * Format duration in human-readable format
 */
export function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);

  if (seconds < 60) {
    return `${seconds} second${seconds !== 1 ? 's' : ''}`;
  }

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  if (remainingSeconds === 0) {
    return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
  }

  return `${minutes} min ${remainingSeconds} sec`;
}
