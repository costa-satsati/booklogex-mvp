// src/lib/email/send-payslip.ts
// CORRECTED VERSION - uses your existing type names

import { resend, getRecipientEmail, EMAIL_CONFIG, logEmailEvent } from './resend-client';
import {
  generatePayslipEmailHTML,
  generatePayslipEmailText,
  generatePayslipSubject,
  generatePayslipFilename,
  type PayslipEmailData,
} from './email-templates';
import type { PayrollRun, PayrollItem } from '@/types/payroll';
import type { Employee } from '@/types/employee';
import type { Organisation } from '@/types/organisation';

/**
 * Result of sending a payslip email
 */
export interface SendPayslipResult {
  success: boolean;
  messageId?: string;
  error?: string;
  retries?: number;
}

/**
 * Parameters for sending a payslip email
 * UPDATED: Uses Organisation instead of OrganisationSettings
 */
export interface SendPayslipEmailParams {
  payrollRun: PayrollRun;
  payrollItem: PayrollItem;
  employee: Employee;
  orgSettings: Organisation; // Your type name
  pdfBase64: string; // Base64 encoded PDF
}

/**
 * Send a single payslip email to an employee
 * Includes retry logic for transient failures
 */
export async function sendPayslipEmail({
  payrollRun,
  payrollItem,
  employee,
  orgSettings,
  pdfBase64,
}: SendPayslipEmailParams): Promise<SendPayslipResult> {
  // Validate required data
  if (!employee.email) {
    return {
      success: false,
      error: 'Employee has no email address',
    };
  }

  if (!orgSettings.name) {
    return {
      success: false,
      error: 'Business name is required in organisation settings',
    };
  }

  if (!pdfBase64) {
    return {
      success: false,
      error: 'PDF data is required',
    };
  }

  // Prepare email data
  const emailData: PayslipEmailData = {
    employeeName: employee.full_name || 'Employee',
    businessName: orgSettings.name,
    payPeriodEnd: new Date(payrollRun.pay_period_end).toLocaleDateString('en-AU', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }),
    netPay: new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: 'AUD',
      minimumFractionDigits: 2,
    }).format(payrollItem.net || 0),
    grossPay: new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: 'AUD',
      minimumFractionDigits: 2,
    }).format(payrollItem.gross || 0),
    taxWithheld: new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: 'AUD',
      minimumFractionDigits: 2,
    }).format(payrollItem.tax || 0),
  };

  const recipientEmail = getRecipientEmail(employee.email);
  const subject = generatePayslipSubject(emailData.businessName, emailData.payPeriodEnd);
  const filename = generatePayslipFilename(employee.full_name, emailData.payPeriodEnd);

  // Retry logic
  let lastError: string | undefined;
  for (let attempt = 1; attempt <= EMAIL_CONFIG.maxRetries; attempt++) {
    try {
      logEmailEvent('attempt', {
        recipient: recipientEmail,
      });

      // Send email using Resend
      const result = await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev',
        to: recipientEmail,
        subject: subject,
        html: generatePayslipEmailHTML(emailData),
        text: generatePayslipEmailText(emailData),
        attachments: [
          {
            filename: filename,
            content: pdfBase64,
          },
        ],
        // Add tags for tracking
        tags: [
          { name: 'type', value: 'payslip' },
          { name: 'org_id', value: orgSettings.id || 'unknown' },
          { name: 'payroll_run_id', value: payrollRun.id || 'unknown' },
        ],
      });

      // Check for Resend API errors
      if (result.error) {
        lastError = result.error.message;
        logEmailEvent('error', {
          recipient: recipientEmail,
          error: lastError,
        });

        // If it's a permanent error, don't retry
        if (isPermanentError(result.error)) {
          return {
            success: false,
            error: lastError,
            retries: attempt,
          };
        }

        // Wait before retrying
        if (attempt < EMAIL_CONFIG.maxRetries) {
          await sleep(EMAIL_CONFIG.retryDelay * attempt);
          continue;
        }
      } else {
        // Success!
        logEmailEvent('success', {
          recipient: recipientEmail,
          messageId: result.data?.id,
        });

        return {
          success: true,
          messageId: result.data?.id,
          retries: attempt,
        };
      }
    } catch (error) {
      lastError = error instanceof Error ? error.message : 'Unknown error';
      logEmailEvent('error', {
        recipient: recipientEmail,
        error: lastError,
      });

      // Wait before retrying
      if (attempt < EMAIL_CONFIG.maxRetries) {
        await sleep(EMAIL_CONFIG.retryDelay * attempt);
        continue;
      }
    }
  }

  // All retries failed
  return {
    success: false,
    error: lastError || 'Failed to send email after multiple retries',
    retries: EMAIL_CONFIG.maxRetries,
  };
}

/**
 * Check if an error is permanent (shouldn't retry)
 */
function isPermanentError(error: unknown): boolean {
  const permanentErrors = [
    'invalid_email',
    'invalid_from',
    'missing_required_field',
    'validation_error',
  ];

  const errorMessage = error instanceof Error ? error.message?.toLowerCase() : '';
  return permanentErrors.some((e) => errorMessage.includes(e));
}

/**
 * Sleep for specified milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Validate email address format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate that all required data is present for sending email
 * UPDATED: Uses Organisation type
 */
export function canSendPayslipEmail(
  employee: Employee,
  orgSettings: Organisation
): { canSend: boolean; reason?: string } {
  if (!employee.email) {
    return { canSend: false, reason: 'Employee has no email address' };
  }

  if (!isValidEmail(employee.email)) {
    return { canSend: false, reason: 'Employee email address is invalid' };
  }

  if (!orgSettings.name) {
    return { canSend: false, reason: 'Business name is required in organisation settings' };
  }

  return { canSend: true };
}
