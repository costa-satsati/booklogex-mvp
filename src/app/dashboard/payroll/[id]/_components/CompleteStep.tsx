// src/app/dashboard/payroll/[id]/_components/CompleteStep.tsx
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Download,
  Mail,
  Send,
  CheckCircle2,
  FileText,
  Loader2,
  AlertCircle,
  XCircle,
} from 'lucide-react';
import { format } from 'date-fns';
import { formatCurrency } from '@/lib/tax-calculator';
import { downloadAllPayslips, downloadEmployeePayslip } from '@/lib/payslip-generator';
import { notify } from '@/lib/notify';
import { calculateYTD } from '@/lib/ytd-calculator';
import type { PayrollRun, PayrollItem } from '@/types/payroll';
import type { Organisation } from '@/types/organisation';
import type { Employee } from '@/types/employee';
import type { StpReport, StpValidationResult } from '@/types/stp';
import { generateStpReport } from '@/lib/stp/stp-generator';
import { validateStpReport, isStpReady } from '@/lib/stp/stp-validator';
import { downloadStpCsv } from '@/lib/stp/stp-csv-exporter';
import { downloadStpJson } from '@/lib/stp/stp-json-exporter';
import { saveStpReport } from '@/lib/stp/stp-storage';
import { supabase } from '@/lib/supabaseClient';

interface Props {
  payrollRun: PayrollRun;
  payrollItems: PayrollItem[];
  OrgContext: Organisation | null;
  onBackToDashboard: () => void;
}

export default function CompleteStep({
  payrollRun,
  payrollItems,
  OrgContext,
  onBackToDashboard,
}: Props) {
  const [downloadingAll, setDownloadingAll] = useState(false);
  const [downloadingIndividual, setDownloadingIndividual] = useState<string | null>(null);
  const [isSendingBatch, setIsSendingBatch] = useState(false);
  const [sendingStates, setSendingStates] = useState<Record<string, boolean>>({});
  const [batchResults, setBatchResults] = useState<{
    total: number;
    sent: number;
    failed: number;
    skipped: number;
    results: Array<{
      name: string;
      email: string;
      success: boolean;
      error?: string;
      skipped?: boolean;
      skipReason?: string;
    }>;
  } | null>(null);
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [generatingStp, setGeneratingStp] = useState(false);
  const [stpReport, setStpReport] = useState<StpReport | null>(null);
  const [stpValidation, setStpValidation] = useState<StpValidationResult | null>(null);
  const [showStpModal, setShowStpModal] = useState(false);

  const totals = payrollItems.reduce(
    (acc, item) => ({
      gross: acc.gross + item.gross,
      tax: acc.tax + item.tax,
      super: acc.super + item.super,
      net: acc.net + item.net,
    }),
    { gross: 0, tax: 0, super: 0, net: 0 }
  );

  const processingId = `PR-${format(new Date(payrollRun.created_at), 'yyyyMMdd')}-${payrollRun.id.slice(0, 6).toUpperCase()}`;

  const handleDownloadAll = async () => {
    if (!OrgContext) {
      notify.error('Settings Required', 'Please complete your organisation settings first');
      return;
    }

    setDownloadingAll(true);
    try {
      await downloadAllPayslips(payrollRun, payrollItems, OrgContext);
      notify.success(
        'Payslips Downloaded',
        `${payrollItems.length} payslip(s) downloaded successfully`
      );
    } catch (error) {
      console.error('Error downloading payslips:', error);
      notify.error(
        'Download Failed',
        error instanceof Error ? error.message : 'Failed to download payslips'
      );
    } finally {
      setDownloadingAll(false);
    }
  };

  const handleDownloadIndividual = async (item: PayrollItem) => {
    if (!item.employees) return;

    if (!OrgContext) {
      notify.error('Settings Required', 'Please complete your organisation settings first');
      return;
    }

    setDownloadingIndividual(item.id);
    try {
      const employee = item.employees as Employee;
      const ytdTotals = await calculateYTD(employee.id);
      await downloadEmployeePayslip(payrollRun, item, employee, OrgContext, ytdTotals);
      notify.success('Payslip Downloaded', `${employee.full_name}'s payslip downloaded`);
    } catch (error) {
      console.error('Error downloading payslip:', error);
      notify.error(
        'Download Failed',
        error instanceof Error ? error.message : 'Failed to download payslip'
      );
    } finally {
      setDownloadingIndividual(null);
    }
  };

  const handleSendPayslip = async (payrollItem: PayrollItem) => {
    const employee = payrollItem.employees as unknown as Employee;

    if (!employee?.email) {
      notify.error('No Email Address', 'This employee does not have an email address on file');
      return;
    }

    if (!OrgContext) {
      notify.error('Settings Required', 'Please complete your organisation settings first');
      return;
    }

    setSendingStates((prev) => ({ ...prev, [payrollItem.id]: true }));

    try {
      const response = await fetch('/api/email/send-payslip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          payrollRunId: payrollRun.id,
          payrollItemId: payrollItem.id,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send email');
      }

      notify.success('Payslip Sent', `Email sent to ${employee.full_name} at ${employee.email}`);
    } catch (error) {
      console.error('Error sending payslip:', error);
      notify.error(
        'Send Failed',
        error instanceof Error ? error.message : 'Failed to send payslip'
      );
    } finally {
      setSendingStates((prev) => ({ ...prev, [payrollItem.id]: false }));
    }
  };

  const handleSendAllPayslips = async () => {
    if (!OrgContext) {
      notify.error('Settings Required', 'Please complete your organisation settings first');
      return;
    }

    // Check if any employees have email addresses
    const employeesWithEmail = payrollItems.filter(
      (item) => (item.employees as unknown as Employee)?.email
    );

    if (employeesWithEmail.length === 0) {
      notify.error('No Email Addresses', 'None of the employees have email addresses on file');
      return;
    }

    setIsSendingBatch(true);
    setBatchResults(null);

    try {
      const response = await fetch('/api/email/send-batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          payrollRunId: payrollRun.id,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send emails');
      }

      setBatchResults(data);
      setShowBatchModal(true);

      if (data.sent > 0) {
        notify.success('Payslips Sent', `Successfully sent ${data.sent} of ${data.total} payslips`);
      }

      if (data.failed > 0) {
        notify.warning(
          'Some Failed',
          `${data.failed} payslip(s) failed to send. Check the results for details.`
        );
      }
    } catch (error) {
      console.error('Error sending batch emails:', error);
      notify.error('Batch Send Failed', 'Failed to send payslips via email');
    } finally {
      setIsSendingBatch(false);
    }
  };

  const handleGenerateStpReport = async () => {
    if (!OrgContext) {
      notify.error('Settings Required', 'Please complete your organisation settings first');
      return;
    }

    // Check if STP ready
    const readyCheck = isStpReady(OrgContext);
    if (!readyCheck.ready) {
      notify.error('Missing Information', `Please complete: ${readyCheck.missing.join(', ')}`);
      return;
    }

    setGeneratingStp(true);
    try {
      // Calculate YTD for each employee
      const ytdMap = new Map();
      for (const item of payrollItems) {
        const employee = item.employees as unknown as Employee;
        if (employee) {
          const ytd = await calculateYTD(employee.id);
          ytdMap.set(employee.id, ytd);
        }
      }

      // Generate report
      const report = await generateStpReport(payrollRun, payrollItems, OrgContext, ytdMap);

      // Validate report
      const validation = validateStpReport(report);

      setStpReport(report);
      setStpValidation(validation);
      setShowStpModal(true);

      if (!validation.valid) {
        notify.error(
          'Validation Failed',
          `${validation.errors.length} error(s) found. Please review.`
        );
      } else if (validation.warnings.length > 0) {
        notify.warning(
          'Validation Warnings',
          `${validation.warnings.length} warning(s) found. Review recommended.`
        );
      } else {
        notify.success('STP Report Generated', 'Ready to download and lodge');
      }
    } catch (error) {
      console.error('Error generating STP report:', error);
      notify.error(
        'Generation Failed',
        error instanceof Error ? error.message : 'Failed to generate STP report'
      );
    } finally {
      setGeneratingStp(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Settings Warning */}
      {!OrgContext && (
        <div className="bg-amber-50 border-2 border-amber-300 rounded-lg p-6 flex items-start gap-4">
          <AlertCircle className="h-6 w-6 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-amber-900 mb-2">Organisation Settings Required</h3>
            <p className="text-sm text-amber-700 mb-3">
              To download or email payslips, please complete your organisation settings first. This
              includes your business name, ABN, and contact details that will appear on payslips.
            </p>
            <Button
              onClick={() => (window.location.href = '/dashboard/settings')}
              size="sm"
              className="bg-amber-600 hover:bg-amber-700"
            >
              Go to Settings
            </Button>
          </div>
        </div>
      )}

      {/* Success Banner */}
      <div className="bg-green-50 border-2 border-green-300 rounded-lg p-8 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
          <CheckCircle2 className="h-8 w-8 text-green-600" />
        </div>
        <h2 className="text-2xl font-bold text-green-900 mb-2">
          Payroll Successfully Finalized ✨
        </h2>
        <p className="text-green-700 text-lg">
          {payrollItems.length} employee{payrollItems.length !== 1 ? 's' : ''} will be paid on{' '}
          {payrollRun.pay_date
            ? format(new Date(payrollRun.pay_date), 'd MMMM yyyy')
            : 'the scheduled date'}
        </p>
      </div>

      {/* Processing Details */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white border rounded-lg p-5">
          <div className="text-sm text-gray-600 mb-2">Processing ID</div>
          <div className="font-mono font-bold text-gray-900 text-lg">{processingId}</div>
          <div className="text-xs text-gray-500 mt-2">
            {format(new Date(payrollRun.created_at), 'h:mm a, d MMM yyyy')}
          </div>
        </div>
        <div className="bg-white border rounded-lg p-5">
          <div className="text-sm text-gray-600 mb-2">Payment Date</div>
          <div className="font-bold text-gray-900 text-lg">
            {payrollRun.pay_date ? format(new Date(payrollRun.pay_date), 'd MMMM yyyy') : 'Not set'}
          </div>
          <div className="text-xs text-gray-500 mt-2">
            {payrollRun.pay_date
              ? `${Math.ceil(
                  (new Date(payrollRun.pay_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
                )} days from now`
              : ''}
          </div>
        </div>
        <div className="bg-white border rounded-lg p-5">
          <div className="text-sm text-gray-600 mb-2">Total Net Pay</div>
          <div className="font-bold text-gray-900 text-lg">{formatCurrency(totals.net)}</div>
          <div className="text-xs text-gray-500 mt-2">To be transferred</div>
        </div>
      </div>

      {/* Payment Breakdown */}
      <div className="bg-white border rounded-lg p-6">
        <h3 className="font-semibold text-gray-900 mb-4">Payment Summary</h3>
        <div className="space-y-3">
          <div className="flex justify-between pb-3 border-b">
            <span className="text-gray-600">Gross Wages</span>
            <span className="font-semibold text-gray-900">{formatCurrency(totals.gross)}</span>
          </div>
          <div className="flex justify-between pb-3 border-b">
            <span className="text-gray-600">PAYG Tax Withheld</span>
            <span className="font-semibold text-gray-900">{formatCurrency(totals.tax)}</span>
          </div>
          <div className="flex justify-between pb-3 border-b">
            <span className="text-gray-600">Net to Employees</span>
            <span className="font-semibold text-gray-900">{formatCurrency(totals.net)}</span>
          </div>
          <div className="flex justify-between pb-3 border-b bg-blue-50 p-3 rounded">
            <span className="text-gray-600">Employer Super (11.5%)</span>
            <span className="font-semibold text-gray-900">{formatCurrency(totals.super)}</span>
          </div>
          <div className="flex justify-between pt-3 text-lg font-bold bg-green-50 p-3 rounded border border-green-200">
            <span>Total Cost to Business</span>
            <span className="text-green-900">{formatCurrency(totals.gross + totals.super)}</span>
          </div>
        </div>
      </div>

      {/* What Happens Next */}
      <div className="bg-white border rounded-lg p-6">
        <h3 className="font-semibold text-gray-900 mb-4">What Happens Next</h3>
        <div className="space-y-3">
          <div className="flex gap-4 items-start">
            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 font-bold text-blue-600 text-sm">
              1
            </div>
            <div>
              <div className="font-medium text-gray-900">STP automatically lodged</div>
              <div className="text-sm text-gray-600">
                Real-time payroll report sent to ATO within 24 hours
              </div>
            </div>
          </div>
          <div className="flex gap-4 items-start">
            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 font-bold text-blue-600 text-sm">
              2
            </div>
            <div>
              <div className="font-medium text-gray-900">Super contributions tracked</div>
              <div className="text-sm text-gray-600">
                {formatCurrency(totals.super)} due by end of quarter
              </div>
            </div>
          </div>
          <div className="flex gap-4 items-start">
            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 font-bold text-blue-600 text-sm">
              3
            </div>
            <div>
              <div className="font-medium text-gray-900">PAYG tax recorded</div>
              <div className="text-sm text-gray-600">
                {formatCurrency(totals.tax)} withheld and tracked for BAS reporting
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Payslips Section - Download & Email */}
      <div className="bg-white border rounded-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <FileText className="h-5 w-5 text-blue-600" />
              Payslips
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              Download PDFs or email directly to employees
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={handleDownloadAll}
              disabled={downloadingAll || !OrgContext}
              variant="outline"
              size="sm"
            >
              {downloadingAll ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Download className="mr-2 h-4 w-4" />
                  Download All
                </>
              )}
            </Button>
            <Button
              onClick={handleSendAllPayslips}
              disabled={isSendingBatch || !OrgContext}
              size="sm"
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isSendingBatch ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Email All
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Individual Employee Rows */}
        <div className="space-y-2">
          {payrollItems.map((item) => {
            const employee = item.employees as unknown as Employee;
            const isDownloading = downloadingIndividual === item.id;
            const isSending = sendingStates[item.id] || false;
            const hasEmail = !!employee?.email;

            return (
              <div
                key={item.id}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border hover:bg-blue-50/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-sm font-bold text-blue-600">
                    {employee?.full_name
                      ?.split(' ')
                      .map((n) => n[0])
                      .join('') || '??'}
                  </div>
                  <div>
                    <div className="font-medium text-gray-900">
                      {employee?.full_name || 'Unknown Employee'}
                    </div>
                    <div className="text-sm text-gray-600 flex items-center gap-2">
                      <span>Net: {formatCurrency(item.net)}</span>
                      {employee?.employment_type === 'contractor' && (
                        <span className="px-2 py-0.5 text-xs bg-purple-100 text-purple-700 rounded">
                          Contractor
                        </span>
                      )}
                      {hasEmail ? (
                        <span className="flex items-center gap-1 text-green-600">
                          <Mail className="h-3 w-3" />
                          <span className="text-xs">{employee.email}</span>
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-amber-600">
                          <AlertCircle className="h-3 w-3" />
                          <span className="text-xs">No email</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={() => handleDownloadIndividual(item)}
                    disabled={isDownloading || !OrgContext}
                    size="sm"
                    variant="outline"
                  >
                    {isDownloading ? (
                      <>
                        <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Download className="mr-2 h-3 w-3" />
                        Download
                      </>
                    )}
                  </Button>

                  <Button
                    onClick={() => handleSendPayslip(item)}
                    disabled={!hasEmail || isSending || !OrgContext}
                    size="sm"
                    variant="outline"
                    className="border-blue-200 hover:bg-blue-50"
                  >
                    {isSending ? (
                      <>
                        <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Send className="mr-2 h-3 w-3" />
                        Email
                      </>
                    )}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-900">
            <strong>💡 Tip:</strong> Payslips are generated as PDF files and can be downloaded or
            emailed directly to employees. Emails include payslip details and the PDF as an
            attachment.
          </p>
        </div>
      </div>

      {/* STP - Download */}
      <div className="bg-white border rounded-lg p-6">
        <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <FileText size={18} />
          Single Touch Payroll (STP)
        </h3>

        {payrollRun.stp_lodged ? (
          <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded">
            <CheckCircle2 className="text-green-600" size={20} />
            <div className="flex-1">
              <div className="font-medium text-green-900">STP Lodged</div>
              <div className="text-sm text-green-700">
                Reported to ATO on{' '}
                {payrollRun.stp_lodged_at
                  ? format(new Date(payrollRun.stp_lodged_at), 'd MMM yyyy, h:mm a')
                  : 'Unknown date'}
              </div>
            </div>
          </div>
        ) : (
          <>
            <p className="text-sm text-gray-600 mb-4">
              Generate STP report to lodge with the ATO. This is required every time you pay
              employees.
            </p>

            <div className="flex gap-2">
              <Button
                onClick={handleGenerateStpReport}
                disabled={generatingStp}
                variant="outline"
                size="sm"
                className="flex items-center gap-2"
              >
                {generatingStp ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <FileText className="h-4 w-4" />
                    Generate STP Report
                  </>
                )}
              </Button>
            </div>

            <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded text-sm text-blue-900">
              <strong>Note:</strong> STP must be lodged on or before pay day. You can lodge through
              the{' '}
              <a
                href="https://bp.ato.gov.au"
                target="_blank"
                rel="noopener noreferrer"
                className="underline"
              >
                ATO Business Portal
              </a>
              .
            </div>
          </>
        )}
      </div>

      {/* Batch Results Modal */}
      {showBatchModal && batchResults && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[80vh] overflow-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-900">Email Results</h3>
              <button
                onClick={() => setShowBatchModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XCircle className="h-6 w-6" />
              </button>
            </div>

            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="bg-blue-50 p-4 rounded-lg text-center border border-blue-200">
                <div className="text-3xl font-bold text-blue-900">{batchResults.total}</div>
                <div className="text-sm text-blue-600 font-medium">Total</div>
              </div>
              <div className="bg-green-50 p-4 rounded-lg text-center border border-green-200">
                <div className="text-3xl font-bold text-green-900">{batchResults.sent}</div>
                <div className="text-sm text-green-600 font-medium">Sent ✓</div>
              </div>
              <div className="bg-red-50 p-4 rounded-lg text-center border border-red-200">
                <div className="text-3xl font-bold text-red-900">{batchResults.failed}</div>
                <div className="text-sm text-red-600 font-medium">Failed</div>
              </div>
            </div>

            <div className="space-y-2 max-h-96 overflow-y-auto">
              {batchResults.results.map((result, idx: number) => (
                <div
                  key={idx}
                  className={`flex items-center justify-between p-3 rounded-lg border ${
                    result.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {result.success ? (
                      <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
                    )}
                    <div>
                      <div className="font-medium text-gray-900">{result.name}</div>
                      <div className="text-sm text-gray-600">
                        {result.success ? (
                          <span className="flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            {result.email}
                          </span>
                        ) : (
                          <span className="text-red-700">{result.error || 'Failed to send'}</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 flex gap-3">
              <Button onClick={() => setShowBatchModal(false)} className="flex-1">
                Close
              </Button>
              {batchResults.failed > 0 && (
                <Button
                  onClick={handleSendAllPayslips}
                  variant="outline"
                  className="flex-1 border-amber-300 hover:bg-amber-50"
                >
                  <Send className="mr-2 h-4 w-4" />
                  Retry Failed
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {showStpModal && stpReport && stpValidation && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-3xl w-full max-h-[90vh] overflow-auto">
            <h3 className="text-xl font-bold text-gray-900 mb-4">STP Report Generated</h3>

            {/* Validation Results */}
            {!stpValidation.valid && stpValidation.errors.length > 0 && (
              <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded">
                <div className="flex items-center gap-2 mb-2">
                  <XCircle className="text-red-600" size={20} />
                  <div className="font-semibold text-red-900">
                    {stpValidation.errors.length} Error(s) Found
                  </div>
                </div>
                <ul className="list-disc list-inside text-sm text-red-700 space-y-1">
                  {stpValidation.errors.map((error, i: number) => (
                    <li key={i}>{error.message}</li>
                  ))}
                </ul>
              </div>
            )}

            {stpValidation.valid && stpValidation.warnings.length > 0 && (
              <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded">
                <div className="flex items-center gap-2 mb-2">
                  <AlertCircle className="text-amber-600" size={20} />
                  <div className="font-semibold text-amber-900">
                    {stpValidation.warnings.length} Warning(s)
                  </div>
                </div>
                <ul className="list-disc list-inside text-sm text-amber-700 space-y-1">
                  {stpValidation.warnings.map((warning, i: number) => (
                    <li key={i}>{warning.message}</li>
                  ))}
                </ul>
              </div>
            )}

            {stpValidation.valid && stpValidation.warnings.length === 0 && (
              <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="text-green-600" size={20} />
                  <div className="font-semibold text-green-900">Report Valid - Ready to Lodge</div>
                </div>
              </div>
            )}

            {/* Report Summary */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="bg-blue-50 p-4 rounded-lg text-center">
                <div className="text-2xl font-bold text-blue-900">{stpReport.totalEmployees}</div>
                <div className="text-sm text-blue-600">Employees</div>
              </div>
              <div className="bg-green-50 p-4 rounded-lg text-center">
                <div className="text-2xl font-bold text-green-900">
                  {formatCurrency(stpReport.totalGross)}
                </div>
                <div className="text-sm text-green-600">Total Gross</div>
              </div>
              <div className="bg-purple-50 p-4 rounded-lg text-center">
                <div className="text-2xl font-bold text-purple-900">
                  {formatCurrency(stpReport.totalPaygWithheld)}
                </div>
                <div className="text-sm text-purple-600">PAYG Withheld</div>
              </div>
            </div>

            {/* Actions */}
            <div className="space-y-2">
              <Button
                onClick={() => {
                  downloadStpCsv(stpReport);
                  notify.success('CSV Downloaded', 'STP report downloaded as CSV');
                }}
                className="w-full flex items-center justify-center gap-2"
                disabled={!stpValidation.valid}
              >
                <Download size={18} />
                Download CSV for ATO Portal
              </Button>

              <Button
                onClick={() => {
                  downloadStpJson(stpReport);
                  notify.success('JSON Downloaded', 'STP report downloaded as JSON');
                }}
                variant="outline"
                className="w-full flex items-center justify-center gap-2"
              >
                <Download size={18} />
                Download JSON (Backup)
              </Button>

              <Button
                onClick={async () => {
                  const {
                    data: { user },
                  } = await supabase.auth.getUser();
                  if (!user) return;

                  const result = await saveStpReport(
                    stpReport,
                    payrollRun.id,
                    OrgContext!.id,
                    user.id
                  );

                  if (result.success) {
                    notify.success('Report Saved', 'STP report saved to database');
                    setShowStpModal(false);
                  } else {
                    notify.error('Save Failed', result.error || 'Failed to save report');
                  }
                }}
                variant="outline"
                className="w-full flex items-center justify-center gap-2"
              >
                <Send size={18} />
                Save Report (Mark as Ready to Lodge)
              </Button>
            </div>

            {/* Instructions */}
            <div className="mt-6 p-4 bg-gray-50 rounded text-sm text-gray-700">
              <div className="font-semibold mb-2">📋 How to Lodge:</div>
              <ol className="list-decimal list-inside space-y-1">
                <li>Download the CSV file above</li>
                <li>
                  Go to{' '}
                  <a
                    href="https://bp.ato.gov.au"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 underline"
                  >
                    ATO Business Portal
                  </a>
                </li>
                <li>Navigate to: Single Touch Payroll → Lodgements</li>
                <li>Upload the CSV file</li>
                <li>Review and submit to ATO</li>
                <li>Come back here and mark as lodged</li>
              </ol>
            </div>

            <Button onClick={() => setShowStpModal(false)} variant="ghost" className="w-full mt-4">
              Close
            </Button>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-3">
        <Button onClick={onBackToDashboard} variant="outline" className="flex-1">
          Back to Payroll Dashboard
        </Button>
        <Button className="flex-1 bg-blue-600 hover:bg-blue-700">
          <Send size={16} className="mr-2" />
          Share with Accountant
        </Button>
      </div>

      {/* Help Text */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
        <p className="text-sm text-blue-900">
          Need help? Contact support or visit our{' '}
          <a href="#" className="font-medium underline hover:text-blue-700">
            payroll guide
          </a>
        </p>
      </div>
    </div>
  );
}
