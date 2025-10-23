import { Resend } from 'resend';

// Validate API key exists
if (!process.env.RESEND_API_KEY) {
  throw new Error('RESEND_API_KEY is not defined in environment variables');
}

// Initialize Resend client
export const resend = new Resend(process.env.RESEND_API_KEY);

// Email configuration
export const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';

// Development mode - sends to test email instead of actual recipients
export const isDevelopment = 
  process.env.NODE_ENV === 'development' || 
  process.env.RESEND_TEST_MODE === 'true';

// Test email address for development
export const TEST_EMAIL = 'delivered@resend.dev';

/**
 * Get the recipient email address
 * In development, returns test email
 * In production, returns actual employee email
 */
export function getRecipientEmail(employeeEmail: string): string {
  return isDevelopment ? TEST_EMAIL : employeeEmail;
}

/**
 * Email sending configuration
 */
export const EMAIL_CONFIG = {
  maxRetries: 3,
  retryDelay: 1000, // 1 second
  batchDelay: 100, // 100ms between emails
  maxAttachmentSize: 25 * 1024 * 1024, // 25MB (Resend limit)
} as const;

/**
 * Log email event
 */
export function logEmailEvent(
  event: 'attempt' | 'success' | 'error',
  details: {
    recipient?: string;
    error?: string;
    messageId?: string;
  }
) {
  const timestamp = new Date().toISOString();
  const mode = isDevelopment ? 'DEV' : 'PROD';
  
  console.log(`[Email ${mode}] ${event.toUpperCase()} - ${timestamp}`, details);
}
