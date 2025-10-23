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
