/**
 * Email Template Data Interface
 */
export interface PayslipEmailData {
  employeeName: string;
  businessName: string;
  payPeriodEnd: string;
  netPay: string;
  grossPay: string;
  taxWithheld: string;
}

/**
 * Generate professional HTML email template for payslip
 */
export function generatePayslipEmailHTML(data: PayslipEmailData): string {
  const { employeeName, businessName, payPeriodEnd, netPay, grossPay, taxWithheld } = data;

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="x-apple-disable-message-reformatting">
  <title>Your Payslip - ${payPeriodEnd}</title>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
  <style>
    /* Reset styles */
    body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { -ms-interpolation-mode: bicubic; border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; }
    
    /* Base styles */
    body {
      margin: 0 !important;
      padding: 0 !important;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333333;
      background-color: #f5f7fa;
    }
    
    /* Container */
    .email-container {
      max-width: 600px;
      margin: 0 auto;
      background-color: #ffffff;
    }
    
    /* Header */
    .header {
      background: linear-gradient(135deg, #2563eb 0%, #1e40af 100%);
      padding: 32px 24px;
      text-align: center;
    }
    
    .header h1 {
      margin: 0;
      font-size: 24px;
      font-weight: 700;
      color: #ffffff;
      letter-spacing: -0.5px;
    }
    
    .header p {
      margin: 8px 0 0 0;
      font-size: 14px;
      color: #bfdbfe;
    }
    
    /* Content */
    .content {
      padding: 32px 24px;
    }
    
    .greeting {
      font-size: 16px;
      color: #1f2937;
      margin: 0 0 16px 0;
    }
    
    .intro-text {
      font-size: 14px;
      color: #4b5563;
      margin: 0 0 24px 0;
      line-height: 1.7;
    }
    
    /* Payment summary card */
    .payment-card {
      background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
      border: 2px solid #2563eb;
      border-radius: 12px;
      padding: 24px;
      margin: 24px 0;
    }
    
    .payment-row {
      display: flex;
      justify-content: space-between;
      padding: 12px 0;
      border-bottom: 1px solid #bfdbfe;
    }
    
    .payment-row:last-child {
      border-bottom: none;
      padding-top: 16px;
      margin-top: 8px;
    }
    
    .payment-label {
      font-size: 14px;
      color: #1e40af;
      font-weight: 500;
    }
    
    .payment-value {
      font-size: 14px;
      color: #1e3a8a;
      font-weight: 600;
    }
    
    .net-pay-label {
      font-size: 16px;
      color: #1e40af;
      font-weight: 700;
    }
    
    .net-pay-value {
      font-size: 20px;
      color: #1e3a8a;
      font-weight: 800;
    }
    
    /* Info sections */
    .info-section {
      background-color: #f9fafb;
      border-left: 4px solid #2563eb;
      border-radius: 8px;
      padding: 16px 20px;
      margin: 20px 0;
    }
    
    .info-section h3 {
      margin: 0 0 12px 0;
      font-size: 14px;
      font-weight: 700;
      color: #1f2937;
    }
    
    .info-section ul {
      margin: 0;
      padding-left: 20px;
    }
    
    .info-section li {
      font-size: 13px;
      color: #4b5563;
      margin: 6px 0;
      line-height: 1.6;
    }
    
    /* Important notice */
    .important-notice {
      background-color: #fef3c7;
      border: 1px solid #fbbf24;
      border-radius: 8px;
      padding: 16px;
      margin: 20px 0;
    }
    
    .important-notice strong {
      color: #92400e;
      font-size: 14px;
    }
    
    .important-notice p {
      margin: 8px 0 0 0;
      font-size: 13px;
      color: #78350f;
      line-height: 1.6;
    }
    
    /* Attachment notice */
    .attachment-notice {
      background-color: #e0f2fe;
      border: 2px dashed #0284c7;
      border-radius: 8px;
      padding: 16px;
      margin: 24px 0;
      text-align: center;
    }
    
    .attachment-notice .icon {
      font-size: 32px;
      margin-bottom: 8px;
    }
    
    .attachment-notice p {
      margin: 0;
      font-size: 14px;
      color: #075985;
      font-weight: 600;
    }
    
    /* Footer */
    .footer {
      background-color: #f9fafb;
      padding: 24px;
      border-top: 1px solid #e5e7eb;
      text-align: center;
    }
    
    .footer p {
      margin: 8px 0;
      font-size: 12px;
      color: #6b7280;
      line-height: 1.5;
    }
    
    .footer .confidential {
      font-weight: 600;
      color: #dc2626;
      margin-top: 16px;
    }
    
    /* Button */
    .button {
      display: inline-block;
      background-color: #2563eb;
      color: #ffffff !important;
      text-decoration: none;
      padding: 12px 24px;
      border-radius: 8px;
      margin: 16px 0;
      font-weight: 600;
      font-size: 14px;
    }
    
    /* Mobile responsive */
    @media only screen and (max-width: 600px) {
      .content {
        padding: 24px 16px;
      }
      
      .payment-card {
        padding: 16px;
      }
      
      .header h1 {
        font-size: 20px;
      }
      
      .net-pay-value {
        font-size: 18px;
      }
    }
  </style>
</head>
<body>
  <div class="email-container">
    <!-- Header -->
    <div class="header">
      <h1>📄 Your Payslip is Ready</h1>
      <p>Pay period ending ${payPeriodEnd}</p>
    </div>
    
    <!-- Content -->
    <div class="content">
      <p class="greeting">Hi ${employeeName},</p>
      
      <p class="intro-text">
        Your payslip for the pay period ending <strong>${payPeriodEnd}</strong> is attached to this email.
        Below is a summary of your payment details.
      </p>
      
      <!-- Payment Summary Card -->
      <div class="payment-card">
        <div class="payment-row">
          <span class="payment-label">Gross Pay</span>
          <span class="payment-value">${grossPay}</span>
        </div>
        <div class="payment-row">
          <span class="payment-label">Tax Withheld (PAYG)</span>
          <span class="payment-value">${taxWithheld}</span>
        </div>
        <div class="payment-row">
          <span class="net-pay-label">Net Pay</span>
          <span class="net-pay-value">${netPay}</span>
        </div>
      </div>
      
      <!-- Attachment Notice -->
      <div class="attachment-notice">
        <div class="icon">📎</div>
        <p>Your detailed payslip PDF is attached to this email</p>
      </div>
      
      <!-- What's Included -->
      <div class="info-section">
        <h3>What's Included in Your Payslip:</h3>
        <ul>
          <li>Complete earnings breakdown</li>
          <li>Tax withholding (PAYG) details</li>
          <li>Superannuation contributions</li>
          <li>Year-to-date summaries</li>
          <li>Leave balances (if applicable)</li>
          <li>Payment and employer information</li>
        </ul>
      </div>
      
      <!-- Important Notice -->
      <div class="important-notice">
        <strong>⚠️ Important: Keep This Payslip</strong>
        <p>
          Save this payslip for your records. You may need it for tax returns, 
          loan/rental applications, Centrelink claims, or superannuation tracking.
        </p>
      </div>
      
      <!-- What to Do -->
      <div class="info-section">
        <h3>What You Should Do:</h3>
        <ul>
          <li>Download and save the attached PDF to a secure location</li>
          <li>Verify your payment details are correct</li>
          <li>Check your bank account for the net payment</li>
          <li>Review your year-to-date totals</li>
          <li>Contact your employer if you have any questions</li>
        </ul>
      </div>
    </div>
    
    <!-- Footer -->
    <div class="footer">
      <p>This email was sent by <strong>${businessName}</strong> via BookLogex</p>
      <p>Automated payroll processing for Australian businesses</p>
      <p class="confidential">
        ⚠️ CONFIDENTIAL: This email contains your personal financial information.<br>
        Please store it securely and do not forward to others.
      </p>
      <p style="margin-top: 16px;">
        Questions about your payslip? Contact your employer directly.
      </p>
    </div>
  </div>
</body>
</html>
  `.trim();
}

/**
 * Generate plain text version of email for clients that don't support HTML
 */
export function generatePayslipEmailText(data: PayslipEmailData): string {
  const { employeeName, businessName, payPeriodEnd, netPay, grossPay, taxWithheld } = data;

  return `
YOUR PAYSLIP IS READY
Pay Period Ending: ${payPeriodEnd}

Hi ${employeeName},

Your payslip for the pay period ending ${payPeriodEnd} is attached to this email.

PAYMENT SUMMARY
===============
Gross Pay:        ${grossPay}
Tax Withheld:     ${taxWithheld}
NET PAY:          ${netPay}

YOUR PAYSLIP PDF IS ATTACHED
The attached PDF contains your complete payslip including:
- Detailed earnings breakdown
- Tax withholding (PAYG) information
- Superannuation contributions
- Year-to-date summaries
- Leave balances (if applicable)
- Payment and employer details

IMPORTANT: KEEP THIS PAYSLIP
Save this payslip for your records. You may need it for:
- Tax return preparation
- Loan or rental applications
- Centrelink claims
- Superannuation tracking

WHAT YOU SHOULD DO:
1. Download and save the attached PDF securely
2. Verify your payment details are correct
3. Check your bank account for the net payment
4. Review your year-to-date totals
5. Contact your employer if you have questions

---
This email was sent by ${businessName} via BookLogex
Automated payroll processing for Australian businesses

CONFIDENTIAL: This email contains your personal financial information.
Please store it securely and do not forward to others.

Questions? Contact your employer directly.
  `.trim();
}

/**
 * Generate email subject line
 */
export function generatePayslipSubject(businessName: string, payPeriodEnd: string): string {
  return `Payslip - ${payPeriodEnd} - ${businessName}`;
}

/**
 * Generate filename for PDF attachment
 */
export function generatePayslipFilename(employeeName: string, payPeriodEnd: string): string {
  // Sanitize employee name (remove special characters, replace spaces with hyphens)
  const sanitizedName = employeeName
    .replace(/[^a-zA-Z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();

  // Format date for filename (YYYY-MM-DD)
  const dateStr = payPeriodEnd.replace(/\s+/g, '-');

  return `Payslip-${sanitizedName}-${dateStr}.pdf`;
}
