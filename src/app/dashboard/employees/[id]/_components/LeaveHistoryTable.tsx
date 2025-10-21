// src/app/dashboard/employees/[id]/_components/LeaveHistoryTable.tsx
import { format } from 'date-fns';
import { TrendingUp, TrendingDown, Edit2, DollarSign, RefreshCw } from 'lucide-react';
import type { LeaveTransaction } from '@/types/employee';
import { hoursToDays } from '@/lib/leave-calculator';

interface Props {
  transactions: LeaveTransaction[];
  hoursPerDay: number;
}

const transactionTypeLabels = {
  accrual: 'Accrual',
  taken: 'Taken',
  adjustment: 'Adjustment',
  payout: 'Payout',
  carryover: 'Carryover',
};

const leaveTypeLabels = {
  annual: 'Annual',
  sick: 'Sick',
  personal: 'Personal',
  long_service: 'Long Service',
};

const transactionIcons = {
  accrual: <TrendingUp size={16} className="text-green-600" />,
  taken: <TrendingDown size={16} className="text-red-600" />,
  adjustment: <Edit2 size={16} className="text-blue-600" />,
  payout: <DollarSign size={16} className="text-purple-600" />,
  carryover: <RefreshCw size={16} className="text-gray-600" />,
};

export default function LeaveHistoryTable({ transactions, hoursPerDay }: Props) {
  if (transactions.length === 0) {
    return (
      <div className="bg-gray-50 border rounded-lg p-12 text-center">
        <p className="text-gray-600">No leave history yet</p>
        <p className="text-sm text-gray-500 mt-1">
          Leave will accrue automatically with each pay run
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white border rounded-lg overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-700">Date</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-700">Type</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-700">Leave Type</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-700">Hours</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-700">Days</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-700">
                Balance After
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-700">Reference</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {transactions.map((tx) => {
              const days = hoursToDays(Math.abs(tx.hours), hoursPerDay);
              const balanceDays = hoursToDays(tx.balance_after, hoursPerDay);
              const isPositive = tx.hours > 0;

              return (
                <tr key={tx.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 text-sm text-gray-900">
                    {format(new Date(tx.created_at), 'd MMM yyyy')}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <div className="flex items-center gap-2">
                      {transactionIcons[tx.transaction_type]}
                      <span className="text-gray-900">
                        {transactionTypeLabels[tx.transaction_type]}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900">
                    {leaveTypeLabels[tx.leave_type]}
                  </td>
                  <td
                    className={`px-4 py-3 text-sm text-right font-medium ${
                      isPositive ? 'text-green-600' : 'text-red-600'
                    }`}
                  >
                    {isPositive ? '+' : ''}
                    {tx.hours.toFixed(1)}h
                  </td>
                  <td
                    className={`px-4 py-3 text-sm text-right ${
                      isPositive ? 'text-green-600' : 'text-red-600'
                    }`}
                  >
                    {isPositive ? '+' : ''}
                    {days.toFixed(1)}
                  </td>
                  <td className="px-4 py-3 text-sm text-right font-semibold text-gray-900">
                    {tx.balance_after.toFixed(1)}h ({balanceDays.toFixed(1)}d)
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">{tx.reference || '—'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
