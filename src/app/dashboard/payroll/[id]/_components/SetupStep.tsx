// src/app/dashboard/payroll/[id]/_components/SetupStep.tsx
'use client';

import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Calendar, ChevronRight } from 'lucide-react';
import type { PayrollRun } from '@/types/payroll';

interface Props {
  payrollRun: PayrollRun;
  onContinue: () => void;
}

export default function SetupStep({ payrollRun, onContinue }: Props) {
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg border p-8 shadow-sm">
        <h2 className="text-xl font-semibold text-gray-900 mb-6">Pay Run Details</h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-5">
            <div className="text-sm text-blue-600 font-medium mb-2">Pay Frequency</div>
            <div className="text-2xl font-bold text-blue-900">{payrollRun.frequency}</div>
            <div className="text-xs text-blue-600 mt-2">
              {payrollRun.frequency === 'FORTNIGHTLY'
                ? 'Every 2 weeks'
                : payrollRun.frequency === 'WEEKLY'
                  ? 'Every week'
                  : 'Monthly'}
            </div>
          </div>

          <div className="bg-green-50 border border-green-200 rounded-lg p-5">
            <div className="text-sm text-green-600 font-medium mb-2">Pay Period</div>
            <div className="text-lg font-bold text-green-900">
              {format(new Date(payrollRun.pay_period_start), 'd MMM')} →{' '}
              {format(new Date(payrollRun.pay_period_end), 'd MMM')}
            </div>
            <div className="text-xs text-green-600 mt-2">
              {Math.ceil(
                (new Date(payrollRun.pay_period_end).getTime() -
                  new Date(payrollRun.pay_period_start).getTime()) /
                  (1000 * 60 * 60 * 24)
              )}{' '}
              days
            </div>
          </div>

          <div className="bg-purple-50 border border-purple-200 rounded-lg p-5">
            <div className="text-sm text-purple-600 font-medium mb-2">Payment Date</div>
            <div className="text-lg font-bold text-purple-900">
              {payrollRun.pay_date
                ? format(new Date(payrollRun.pay_date), 'd MMM yyyy')
                : 'Not set'}
            </div>
            <div className="text-xs text-purple-600 mt-2">
              <Calendar size={12} className="inline mr-1" />
              {payrollRun.pay_date
                ? `${Math.ceil((new Date(payrollRun.pay_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24))} days away`
                : 'TBD'}
            </div>
          </div>
        </div>

        <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex gap-3">
            <div className="text-blue-600 text-2xl">💡</div>
            <div>
              <div className="font-medium text-blue-900 mb-1">What&apos;s Next?</div>
              <div className="text-sm text-blue-700">
                Select which employees to include in this pay run. We&apos;ll automatically
                calculate their tax, super, and net pay based on their employment details.
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <Button
          onClick={onContinue}
          className="bg-blue-600 hover:bg-blue-700 text-white px-8"
          size="lg"
        >
          Continue to Employees
          <ChevronRight size={18} className="ml-2" />
        </Button>
      </div>
    </div>
  );
}
