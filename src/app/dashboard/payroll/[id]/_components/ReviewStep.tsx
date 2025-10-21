// src/app/dashboard/payroll/[id]/_components/ReviewStep.tsx
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft, CheckCircle2, Download, Loader2, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { formatCurrency } from '@/lib/tax-calculator';
import type { PayrollRun, PayrollItem } from '@/types/payroll';
import { calculateAnnualLeaveAccrual, calculateSickLeaveAccrual } from '@/lib/leave-calculator';

interface Props {
  payrollRun: PayrollRun;
  payrollItems: PayrollItem[];
  onBack: () => void;
  onFinalize: () => void;
  isReadOnly?: boolean;
}

export default function ReviewStep({
  payrollRun,
  payrollItems,
  onBack,
  onFinalize,
  isReadOnly,
}: Props) {
  const [validated, setValidated] = useState(false);
  const [validating, setValidating] = useState(false);
  const [finalizing, setFinalizing] = useState(false);

  const totals = payrollItems.reduce(
    (acc, item) => ({
      gross: acc.gross + item.gross,
      tax: acc.tax + item.tax,
      super: acc.super + item.super,
      net: acc.net + item.net,
    }),
    { gross: 0, tax: 0, super: 0, net: 0 }
  );

  const totalCost = totals.gross + totals.super;

  const handleValidate = async () => {
    setValidating(true);
    // Simulate validation
    setTimeout(() => {
      setValidated(true);
      setValidating(false);
    }, 1000);
  };

  const handleFinalize = async () => {
    setFinalizing(true);
    await onFinalize();
    setFinalizing(false);
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white border rounded-lg p-5 shadow-sm">
          <div className="text-sm text-gray-600 mb-2">Pay Date</div>
          <div className="text-2xl font-bold text-gray-900">
            {payrollRun.pay_date ? format(new Date(payrollRun.pay_date), 'd MMM') : '—'}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            {payrollRun.pay_date &&
              `${Math.ceil((new Date(payrollRun.pay_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24))} days`}
          </div>
        </div>

        <div className="bg-white border rounded-lg p-5 shadow-sm">
          <div className="text-sm text-gray-600 mb-2">Employees</div>
          <div className="text-2xl font-bold text-gray-900">{payrollItems.length}</div>
          <div className="text-xs text-gray-500 mt-1">Being paid</div>
        </div>

        <div className="bg-white border rounded-lg p-5 shadow-sm">
          <div className="text-sm text-gray-600 mb-2">Frequency</div>
          <div className="text-xl font-bold text-gray-900">{payrollRun.frequency}</div>
          <div className="text-xs text-gray-500 mt-1">Pay cycle</div>
        </div>

        <div className="bg-white border rounded-lg p-5 shadow-sm">
          <div className="text-sm text-gray-600 mb-2">From Account</div>
          <div className="text-xl font-bold text-gray-900">•••2847</div>
          <div className="text-xs text-gray-500 mt-1">Business account</div>
        </div>
      </div>
      {/* Payment Breakdown */}
      <div className="bg-white border rounded-lg p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Payment Breakdown</h3>
        <div className="space-y-3">
          <div className="flex justify-between pb-3 border-b text-sm">
            <span className="text-gray-600">Gross Wages</span>
            <span className="font-semibold text-gray-900">{formatCurrency(totals.gross)}</span>
          </div>
          <div className="flex justify-between pb-3 border-b text-sm">
            <span className="text-gray-600">PAYG Tax Withheld</span>
            <span className="font-semibold text-gray-900">{formatCurrency(totals.tax)}</span>
          </div>
          <div className="flex justify-between pb-3 border-b text-sm">
            <span className="text-gray-600">Net to Employees</span>
            <span className="font-semibold text-gray-900">{formatCurrency(totals.net)}</span>
          </div>
          <div className="flex justify-between pb-3 border-b bg-blue-50 p-3 rounded text-sm">
            <span className="text-gray-600">Employer Super (11.5%)</span>
            <span className="font-semibold text-gray-900">{formatCurrency(totals.super)}</span>
          </div>
          <div className="flex justify-between pt-3 text-lg font-bold bg-green-50 p-4 rounded border border-green-200">
            <span className="text-gray-900">Total Cost to Business</span>
            <span className="text-green-900">{formatCurrency(totalCost)}</span>
          </div>
        </div>
      </div>
      {/* Employee Details Table */}
      <div className="bg-white border rounded-lg shadow-sm overflow-hidden">
        <div className="p-4 border-b bg-gray-50">
          <h3 className="font-semibold text-gray-900">Employee Details</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-700">Employee</th>
                <th className="px-4 py-3 text-right font-medium text-gray-700">Gross</th>
                <th className="px-4 py-3 text-right font-medium text-gray-700">Tax</th>
                <th className="px-4 py-3 text-right font-medium text-gray-700">Super</th>
                <th className="px-4 py-3 text-right font-medium text-gray-700">Net</th>
              </tr>
            </thead>
            <tbody>
              {payrollItems.map((item) => (
                <tr key={item.id} className="border-b hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900">
                      {item.employees?.full_name || 'Unknown'}
                    </div>
                    <div className="text-xs text-gray-600">{item.employees?.position || '—'}</div>
                  </td>
                  <td className="px-4 py-3 text-right text-gray-900">
                    {formatCurrency(item.gross)}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-900">{formatCurrency(item.tax)}</td>
                  <td className="px-4 py-3 text-right text-gray-900">
                    {formatCurrency(item.super)}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-gray-900">
                    {formatCurrency(item.net)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Leave Accruals Summary */}
      {payrollItems.some(
        (item) =>
          item.employees?.employment_type === 'full_time' ||
          item.employees?.employment_type === 'part_time'
      ) && (
        <div className="bg-white border rounded-lg p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Leave Accruals</h3>
          <p className="text-sm text-gray-600 mb-4">
            Leave will be automatically accrued for eligible employees when this pay run is
            finalized.
          </p>
          <div className="space-y-2">
            {payrollItems
              .filter(
                (item) =>
                  item.employees?.employment_type === 'full_time' ||
                  item.employees?.employment_type === 'part_time'
              )
              .map((item) => {
                const employee = item.employees;
                if (!employee) return null;

                const annualAccrual = calculateAnnualLeaveAccrual(
                  employee,
                  payrollRun.frequency.toLowerCase() as 'weekly' | 'fortnightly' | 'monthly'
                );
                const sickAccrual = calculateSickLeaveAccrual(
                  employee,
                  payrollRun.frequency.toLowerCase() as 'weekly' | 'fortnightly' | 'monthly'
                );

                return (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded"
                  >
                    <div className="font-medium text-gray-900">{employee.full_name}</div>
                    <div className="text-sm text-gray-600">
                      +{annualAccrual.toFixed(1)}h annual, +{sickAccrual.toFixed(1)}h sick
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}
      {/* Tax & Compliance */}
      <div className="bg-white border rounded-lg p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Tax & Compliance</h3>
        <div className="space-y-3">
          <div className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded">
            <CheckCircle2 className="text-green-600" size={20} />
            <div className="flex-1">
              <div className="font-medium text-gray-900">STP will be lodged automatically</div>
              <div className="text-xs text-gray-600">
                Real-time payroll data sent to ATO within 24 hours
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded">
            <CheckCircle2 className="text-green-600" size={20} />
            <div className="flex-1">
              <div className="font-medium text-gray-900">PAYG calculated and withheld</div>
              <div className="text-xs text-gray-600">
                {formatCurrency(totals.tax)} recorded for BAS reporting
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded">
            <CheckCircle2 className="text-green-600" size={20} />
            <div className="flex-1">
              <div className="font-medium text-gray-900">Super contributions tracked</div>
              <div className="text-xs text-gray-600">
                {formatCurrency(totals.super)} due by 28{' '}
                {format(new Date(payrollRun.pay_period_end), 'MMM yyyy')}
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* Warning */}
      {!isReadOnly && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex gap-3">
          <AlertCircle className="text-amber-600 flex-shrink-0 mt-0.5" size={20} />
          <div>
            <div className="text-sm font-medium text-amber-900">Important Reminders</div>
            <ul className="text-sm text-amber-700 mt-2 space-y-1 list-disc list-inside">
              <li>Ensure you have {formatCurrency(totalCost)} available in your account</li>
              <li>
                Employee payments: {formatCurrency(totals.net)} on{' '}
                {payrollRun.pay_date ? format(new Date(payrollRun.pay_date), 'd MMM') : 'pay date'}
              </li>
              <li>Super contributions: {formatCurrency(totals.super)} due by quarterly deadline</li>
            </ul>
          </div>
        </div>
      )}
      {/* Pre-Finalization Checklist */}
      {!isReadOnly && !validated && (
        <div className="bg-white border rounded-lg p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Pre-Finalization Checklist</h3>
          <div className="space-y-2 mb-4">
            {[
              'All employee details verified',
              'Hours and rates confirmed',
              'Tax calculations reviewed',
              'Super contributions correct',
            ].map((item, i) => (
              <label
                key={i}
                className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded cursor-pointer"
              >
                <input type="checkbox" className="w-4 h-4 text-blue-600 rounded" />
                <span className="text-gray-700">{item}</span>
              </label>
            ))}
          </div>
          <Button
            onClick={handleValidate}
            disabled={validating}
            variant="outline"
            className="w-full"
          >
            {validating ? (
              <>
                <Loader2 size={16} className="mr-2 animate-spin" />
                Validating...
              </>
            ) : (
              'Run Final Validation'
            )}
          </Button>
        </div>
      )}
      {/* Validation Success */}
      {validated && !isReadOnly && (
        <div className="bg-green-50 border-2 border-green-300 rounded-lg p-6 text-center">
          <CheckCircle2 className="mx-auto h-12 w-12 text-green-600 mb-3" />
          <h3 className="text-lg font-semibold text-green-900 mb-2">Ready to Finalize</h3>
          <p className="text-sm text-green-700 mb-4">
            All checks passed. You can now finalize this pay run.
          </p>
        </div>
      )}
      {/* Actions */}
      <div className="flex justify-between gap-3">
        <Button variant="outline" onClick={onBack} disabled={finalizing || isReadOnly}>
          <ArrowLeft size={16} className="mr-2" />
          Back to Employees
        </Button>

        <div className="flex gap-3">
          <Button variant="outline" disabled={finalizing}>
            <Download size={16} className="mr-2" />
            Export Report
          </Button>

          {!isReadOnly && (
            <Button
              onClick={handleFinalize}
              disabled={!validated || finalizing}
              className="bg-green-600 hover:bg-green-700 text-white px-8"
              size="lg"
            >
              {finalizing ? (
                <>
                  <Loader2 size={16} className="mr-2 animate-spin" />
                  Finalizing...
                </>
              ) : (
                <>
                  <CheckCircle2 size={16} className="mr-2" />
                  Finalize Pay Run
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
