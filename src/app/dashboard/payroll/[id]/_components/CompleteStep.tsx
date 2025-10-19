// src/app/dashboard/payroll/[id]/_components/CompleteStep.tsx
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Download, Send, CheckCircle2, FileText, Loader2, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { formatCurrency } from '@/lib/tax-calculator';
import { downloadAllPayslips, downloadEmployeePayslip } from '@/lib/payslip-generator';
import { notify } from '@/lib/notify';
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
      // Cast to Employee type - should have all fields from the query
      const employee = item.employees as Employee;
      await downloadEmployeePayslip(payrollRun, item, employee, OrgContext);
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

  return (
    <div className="space-y-6">
      {/* Settings Warning */}
      {!OrgContext && (
        <div className="bg-amber-50 border-2 border-amber-300 rounded-lg p-6 flex items-start gap-4">
          <AlertCircle className="h-6 w-6 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-amber-900 mb-2">Organisation Settings Required</h3>
            <p className="text-sm text-amber-700 mb-3">
              To download payslips, please complete your organisation settings first. This includes
              your business name, ABN, and contact details that will appear on payslips.
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
        <div className="bg-white border rounded-lg p-6 shadow-sm">
          <div className="text-sm text-gray-600 mb-2">Processing ID</div>
          <div className="font-mono font-bold text-gray-900 text-lg">{processingId}</div>
          <div className="text-xs text-gray-500 mt-3">
            {format(new Date(), 'h:mm a, d MMM yyyy')}
          </div>
        </div>

        <div className="bg-white border rounded-lg p-6 shadow-sm">
          <div className="text-sm text-gray-600 mb-2">Payment Date</div>
          <div className="font-bold text-gray-900 text-lg">
            {payrollRun.pay_date ? format(new Date(payrollRun.pay_date), 'd MMMM yyyy') : '—'}
          </div>
          <div className="text-xs text-gray-500 mt-3">
            {payrollRun.pay_date &&
              `${Math.ceil((new Date(payrollRun.pay_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24))} days from now`}
          </div>
        </div>

        <div className="bg-white border rounded-lg p-6 shadow-sm">
          <div className="text-sm text-gray-600 mb-2">Total Processed</div>
          <div className="font-bold text-gray-900 text-lg">{formatCurrency(totals.net)}</div>
          <div className="text-xs text-gray-500 mt-3">Net employee payments</div>
        </div>
      </div>

      {/* What Happens Next */}
      <div className="bg-white border rounded-lg p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">What Happens Next</h3>
        <div className="space-y-4">
          <div className="flex gap-4 items-start">
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 font-bold text-blue-600">
              1
            </div>
            <div>
              <div className="font-medium text-gray-900">Payslips ready to download</div>
              <div className="text-sm text-gray-600 mt-1">
                Download individual or all payslips below and distribute to employees
              </div>
            </div>
          </div>

          <div className="flex gap-4 items-start">
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 font-bold text-blue-600">
              2
            </div>
            <div>
              <div className="font-medium text-gray-900">STP automatically lodged</div>
              <div className="text-sm text-gray-600 mt-1">
                Real-time payroll report will be sent to the ATO within 24 hours
              </div>
            </div>
          </div>

          <div className="flex gap-4 items-start">
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 font-bold text-blue-600">
              3
            </div>
            <div>
              <div className="font-medium text-gray-900">Super contributions tracked</div>
              <div className="text-sm text-gray-600 mt-1">
                {formatCurrency(totals.super)} due by{' '}
                {payrollRun.pay_date
                  ? format(new Date(payrollRun.pay_date), '28 MMMM yyyy')
                  : '28th of next month'}{' '}
                (quarterly payment)
              </div>
            </div>
          </div>

          <div className="flex gap-4 items-start">
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 font-bold text-blue-600">
              4
            </div>
            <div>
              <div className="font-medium text-gray-900">PAYG tax recorded</div>
              <div className="text-sm text-gray-600 mt-1">
                {formatCurrency(totals.tax)} withheld and tracked for BAS reporting
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Financial Summary */}
      <div className="bg-white border rounded-lg p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Financial Summary</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <div className="text-sm text-gray-600">Gross Payroll</div>
            <div className="text-xl font-bold text-gray-900 mt-1">
              {formatCurrency(totals.gross)}
            </div>
          </div>
          <div>
            <div className="text-sm text-gray-600">PAYG Withheld</div>
            <div className="text-xl font-bold text-gray-900 mt-1">{formatCurrency(totals.tax)}</div>
          </div>
          <div>
            <div className="text-sm text-gray-600">Employer Super</div>
            <div className="text-xl font-bold text-gray-900 mt-1">
              {formatCurrency(totals.super)}
            </div>
          </div>
          <div>
            <div className="text-sm text-gray-600">Net Paid</div>
            <div className="text-xl font-bold text-green-700 mt-1">
              {formatCurrency(totals.net)}
            </div>
          </div>
        </div>
      </div>

      {/* Payslips Section */}
      <div className="bg-white border rounded-lg p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <FileText className="h-5 w-5 text-blue-600" />
            Employee Payslips
          </h3>
          <Button
            onClick={handleDownloadAll}
            disabled={downloadingAll}
            size="sm"
            className="bg-blue-600 hover:bg-blue-700"
          >
            {downloadingAll ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Download className="mr-2 h-4 w-4" />
                Download All ({payrollItems.length})
              </>
            )}
          </Button>
        </div>

        <div className="space-y-2">
          {payrollItems.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border hover:bg-blue-50 hover:border-blue-300 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-sm font-bold text-blue-600">
                  {item.employees?.full_name
                    ?.split(' ')
                    .map((n) => n[0])
                    .join('') || '??'}
                </div>
                <div>
                  <div className="font-medium text-gray-900">
                    {item.employees?.full_name || 'Unknown Employee'}
                  </div>
                  <div className="text-sm text-gray-600">
                    Net: {formatCurrency(item.net)}
                    {item.employees?.employment_type === 'contractor' && (
                      <span className="ml-2 px-2 py-0.5 text-xs bg-purple-100 text-purple-700 rounded">
                        Contractor
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <Button
                onClick={() => handleDownloadIndividual(item)}
                disabled={downloadingIndividual === item.id}
                size="sm"
                variant="outline"
              >
                {downloadingIndividual === item.id ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Download className="mr-2 h-4 w-4" />
                    Download
                  </>
                )}
              </Button>
            </div>
          ))}
        </div>

        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-900">
            <strong>💡 Tip:</strong> Payslips are generated as individual PDF files. You can email
            them to employees or share via your preferred method.
          </p>
        </div>
      </div>

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
