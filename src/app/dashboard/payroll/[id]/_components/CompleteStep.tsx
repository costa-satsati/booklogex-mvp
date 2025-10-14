// src/app/dashboard/payroll/[id]/_components/CompleteStep.tsx
'use client';

import { Button } from '@/components/ui/button';
import { Download, Send, CheckCircle2 } from 'lucide-react';
import { format } from 'date-fns';
import { formatCurrency } from '@/lib/tax-calculator';
import type { PayrollRun, PayrollItem } from '@/types/payroll';

interface Props {
  payrollRun: PayrollRun;
  payrollItems: PayrollItem[];
  onBackToDashboard: () => void;
}

export default function CompleteStep({ payrollRun, payrollItems, onBackToDashboard }: Props) {
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

  return (
    <div className="space-y-6">
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
              <div className="font-medium text-gray-900">Payslips sent today</div>
              <div className="text-sm text-gray-600 mt-1">
                Digital copies will be emailed to each employee within the next hour
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

      {/* Documents */}
      <div className="bg-white border rounded-lg p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Your Documents</h3>
        <div className="space-y-2">
          {[
            { icon: '📋', title: 'Pay Run Summary Report', size: '240 KB' },
            { icon: '📊', title: 'STP Report (ATO)', size: '156 KB' },
            { icon: '💰', title: 'Payment Confirmation', size: '89 KB' },
            ...payrollItems.map((item, i) => ({
              icon: '📑',
              title: `${item.employees?.full_name || 'Employee'} Payslip`,
              size: '180 KB',
            })),
          ].map((doc, i) => (
            <button
              key={i}
              className="w-full flex items-center justify-between p-3 bg-gray-50 rounded border hover:bg-blue-50 hover:border-blue-300 transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">{doc.icon}</span>
                <div className="text-left">
                  <div className="font-medium text-gray-900 text-sm">{doc.title}</div>
                  <div className="text-xs text-gray-600">{doc.size}</div>
                </div>
              </div>
              <Download size={18} className="text-gray-400" />
            </button>
          ))}
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
          <a href="#" className="font-medium underline">
            payroll guide
          </a>
        </p>
      </div>
    </div>
  );
}
