// src/app/dashboard/employees/[id]/_components/LeaveAdjustmentModal.tsx
'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { notify } from '@/lib/notify';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { X, Loader2 } from 'lucide-react';
import type { Employee } from '@/types/employee';
import { useOrgContext } from '@/context/OrgContext';

interface Props {
  employee: Employee;
  onClose: () => void;
  onSuccess: () => void;
}

// ✅ FIX #1: Define proper type for leave type
type LeaveType = 'annual' | 'sick' | 'personal' | 'long_service';

export default function LeaveAdjustmentModal({ employee, onClose, onSuccess }: Props) {
  const { organisation } = useOrgContext();
  const [leaveType, setLeaveType] = useState<LeaveType>('annual'); // ✅ Use LeaveType instead of any
  const [adjustmentType, setAdjustmentType] = useState<'add' | 'subtract'>('add');
  const [hours, setHours] = useState('');
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!hours || parseFloat(hours) <= 0) {
      notify.error('Invalid Input', 'Please enter a valid number of hours');
      return;
    }

    if (!reason.trim()) {
      notify.error('Invalid Input', 'Please provide a reason for this adjustment');
      return;
    }

    setSaving(true);
    try {
      const hoursNum = parseFloat(hours);
      const adjustedHours = adjustmentType === 'subtract' ? -hoursNum : hoursNum;

      // Get current balance
      const balanceField = `${leaveType}_leave_hours` as const; // ✅ FIX #2: Use const assertion

      // ✅ FIX #3: Type-safe way to access employee leave balances
      const currentBalance = ((): number => {
        switch (leaveType) {
          case 'annual':
            return employee.annual_leave_hours || 0;
          case 'sick':
            return employee.sick_leave_hours || 0;
          case 'personal':
            return employee.personal_leave_hours || 0;
          case 'long_service':
            return employee.long_service_leave_hours || 0;
          default:
            return 0;
        }
      })();

      const newBalance = currentBalance + adjustedHours;

      if (newBalance < 0) {
        notify.error('Invalid Adjustment', 'This would result in a negative balance');
        setSaving(false);
        return;
      }

      // Update employee balance
      const { error: updateError } = await supabase
        .from('employees')
        .update({ [balanceField]: newBalance })
        .eq('id', employee.id);

      if (updateError) throw updateError;

      // Record transaction
      const { error: txError } = await supabase.from('leave_transactions').insert({
        employee_id: employee.id,
        org_id: organisation?.id,
        transaction_type: 'adjustment',
        leave_type: leaveType,
        hours: adjustedHours,
        balance_after: newBalance,
        reference: `Manual adjustment: ${reason}`,
        notes: reason,
      });

      if (txError) throw txError;

      notify.success('Success', 'Leave balance adjusted successfully');
      onSuccess();
    } catch (error) {
      console.error('Error adjusting leave:', error);
      notify.error('Error', 'Failed to adjust leave balance');
    } finally {
      setSaving(false);
    }
  };

  const leaveTypeOptions: Array<{ value: LeaveType; label: string }> = [
    { value: 'annual', label: 'Annual Leave' },
    { value: 'sick', label: 'Sick Leave' },
    { value: 'personal', label: 'Personal Leave' },
    { value: 'long_service', label: 'Long Service Leave' },
  ];

  // ✅ Helper function to get current balance for display
  const getCurrentBalance = (): number => {
    switch (leaveType) {
      case 'annual':
        return employee.annual_leave_hours || 0;
      case 'sick':
        return employee.sick_leave_hours || 0;
      case 'personal':
        return employee.personal_leave_hours || 0;
      case 'long_service':
        return employee.long_service_leave_hours || 0;
      default:
        return 0;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-gray-900/50 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-white rounded-xl shadow-2xl max-w-md w-full mx-4 p-6">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Adjust Leave Balance</h2>
            <p className="text-sm text-gray-600 mt-1">{employee.full_name}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Leave Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Leave Type</label>
            <select
              value={leaveType}
              onChange={(e) => setLeaveType(e.target.value as LeaveType)} // ✅ Type assertion
              className="w-full border rounded-lg px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {leaveTypeOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Adjustment Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Adjustment Type</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setAdjustmentType('add')}
                className={`px-4 py-2 rounded-lg border-2 transition-colors ${
                  adjustmentType === 'add'
                    ? 'bg-green-50 border-green-500 text-green-700 font-medium'
                    : 'border-gray-200 text-gray-700 hover:bg-gray-50'
                }`}
              >
                Add Hours
              </button>
              <button
                type="button"
                onClick={() => setAdjustmentType('subtract')}
                className={`px-4 py-2 rounded-lg border-2 transition-colors ${
                  adjustmentType === 'subtract'
                    ? 'bg-red-50 border-red-500 text-red-700 font-medium'
                    : 'border-gray-200 text-gray-700 hover:bg-gray-50'
                }`}
              >
                Subtract Hours
              </button>
            </div>
          </div>

          {/* Hours */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Hours</label>
            <Input
              type="number"
              step="0.1"
              min="0"
              value={hours}
              onChange={(e) => setHours(e.target.value)}
              placeholder="8.0"
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              Current balance: {getCurrentBalance().toFixed(1)} hours
            </p>
          </div>

          {/* Reason */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Reason <span className="text-red-500">*</span>
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g., Correction for unpaid leave taken, Initial balance setup, etc."
              className="w-full border rounded-lg px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[80px]"
              required
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={saving}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={saving}
              className="flex-1 bg-blue-600 hover:bg-blue-700"
            >
              {saving ? (
                <>
                  <Loader2 size={16} className="mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                'Adjust Balance'
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
