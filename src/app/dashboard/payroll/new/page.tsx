// src/app/dashboard/payroll/new/page.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Calendar, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { notify } from '@/lib/notify';
import {
  format,
  startOfWeek,
  endOfWeek,
  addDays,
  startOfMonth,
  endOfMonth,
  parseISO,
  isValid,
  isBefore,
  isAfter,
} from 'date-fns';
import { useOrgContext } from '@/context/OrgContext';

type Frequency = 'WEEKLY' | 'FORTNIGHTLY' | 'MONTHLY';

export default function NewPayrollWizard() {
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [checking, setChecking] = useState(false);
  const [overlapError, setOverlapError] = useState<string | null>(null);
  const { organisation, loading: orgLoading } = useOrgContext();
  const [form, setForm] = useState({
    frequency: 'FORTNIGHTLY' as Frequency,
    periodStart: '',
    periodEnd: '',
    payDate: '',
  });

  // Calculate default dates based on frequency
  const calculateDefaultDates = (frequency: Frequency) => {
    const today = new Date();
    let periodStart: Date;
    let periodEnd: Date;
    let payDate: Date;

    switch (frequency) {
      case 'WEEKLY':
        periodStart = startOfWeek(today, { weekStartsOn: 1 }); // Monday
        periodEnd = endOfWeek(periodStart, { weekStartsOn: 1 }); // Sunday
        payDate = addDays(periodEnd, 3); // 3 days after period end
        break;

      case 'FORTNIGHTLY':
        periodStart = startOfWeek(today, { weekStartsOn: 1 });
        periodEnd = endOfWeek(addDays(periodStart, 13), { weekStartsOn: 1 }); // 2 weeks
        payDate = addDays(periodEnd, 3);
        break;

      case 'MONTHLY':
        periodStart = startOfMonth(today);
        periodEnd = endOfMonth(today);
        payDate = addDays(periodEnd, 5); // 5 days after month end
        break;
    }

    setForm({
      frequency,
      periodStart: format(periodStart, 'yyyy-MM-dd'),
      periodEnd: format(periodEnd, 'yyyy-MM-dd'),
      payDate: format(payDate, 'yyyy-MM-dd'),
    });

    // Clear any previous overlap errors
    setOverlapError(null);
  };

  // Check for overlapping pay runs
  const checkOverlap = useCallback(async () => {
    if (!organisation || !form.periodStart || !form.periodEnd) return;

    setChecking(true);
    setOverlapError(null);

    try {
      const { data, error } = await supabase
        .from('payroll_runs')
        .select('id, pay_period_start, pay_period_end, frequency')
        .eq('org_id', organisation?.id)
        .neq('status', 'cancelled');

      if (error) throw error;

      const start = parseISO(form.periodStart);
      const end = parseISO(form.periodEnd);

      // Check if any existing run overlaps
      const overlap = (data || []).some((run) => {
        const runStart = parseISO(run.pay_period_start);
        const runEnd = parseISO(run.pay_period_end);

        // Overlap if: NOT (end before runStart OR start after runEnd)
        return !(isBefore(end, runStart) || isAfter(start, runEnd));
      });

      if (overlap) {
        setOverlapError(
          'This pay period overlaps with an existing pay run. Please choose different dates.'
        );
      }
    } catch (error) {
      console.error('Error checking overlap:', error);
      notify.error('Error', 'Failed to check for overlapping pay runs');
    } finally {
      setChecking(false);
    }
  }, [organisation, form.periodStart, form.periodEnd]);

  // Initialize default dates
  useEffect(() => {
    if (organisation?.id) {
      calculateDefaultDates('FORTNIGHTLY');
    }
  }, [organisation?.id]);

  // Auto-check overlap when dates change
  useEffect(() => {
    if (form.periodStart && form.periodEnd) {
      const timer = setTimeout(() => {
        checkOverlap();
      }, 500); // Debounce

      return () => clearTimeout(timer);
    }
  }, [form.periodStart, form.periodEnd, checkOverlap]);

  // Validate form
  const validateForm = (): string | null => {
    if (!form.periodStart || !form.periodEnd || !form.payDate) {
      return 'Please fill in all date fields';
    }

    const start = parseISO(form.periodStart);
    const end = parseISO(form.periodEnd);
    const pay = parseISO(form.payDate);

    if (!isValid(start) || !isValid(end) || !isValid(pay)) {
      return 'Invalid date format';
    }

    if (isAfter(start, end)) {
      return 'Period start must be before period end';
    }

    if (isBefore(pay, end)) {
      return 'Pay date must be on or after period end';
    }

    if (overlapError) {
      return overlapError;
    }

    return null;
  };

  // Create pay run
  const handleCreate = async () => {
    const validationError = validateForm();
    if (validationError) {
      notify.error('Validation Error', validationError);
      return;
    }

    if (!organisation?.id) {
      notify.error('Error', 'Organisation not found');
      return;
    }

    setCreating(true);

    try {
      const { data, error } = await supabase
        .from('payroll_runs')
        .insert([
          {
            org_id: organisation?.id,
            frequency: form.frequency,
            pay_period_start: form.periodStart,
            pay_period_end: form.periodEnd,
            pay_date: form.payDate,
            status: 'draft',
            total_gross: 0,
            total_tax: 0,
            total_super: 0,
            total_net: 0,
            idempotency_key: `${organisation?.id}:${form.periodStart}:${form.periodEnd}`,
          },
        ])
        .select('id')
        .single();

      if (error) {
        // Handle duplicate key error
        if (error.code === '23505') {
          notify.error('Duplicate', 'A pay run with these dates already exists');
          return;
        }
        throw error;
      }

      notify.success('Created', 'Pay run created successfully');
      router.push(`/dashboard/payroll/${data.id}?step=setup`);
    } catch (error) {
      console.error('Error creating pay run:', error);
      notify.error('Error', 'Failed to create pay run');
    } finally {
      setCreating(false);
    }
  };

  if (orgLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  // Check if business setup is complete
  if (!organisation?.name) {
    return (
      <div className="max-w-2xl mx-auto mt-12">
        <div className="bg-amber-50 border-2 border-amber-200 rounded-xl p-8 text-center">
          <AlertCircle className="mx-auto mb-4 text-amber-600" size={48} />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Business Setup Required</h2>
          <p className="text-gray-600 mb-6">
            Please complete your business details before running payroll. We need your business name
            for payslips and compliance.
          </p>
          <Button
            onClick={() => router.push('/dashboard/settings')}
            className="bg-blue-600 hover:bg-blue-700"
          >
            Complete Setup →
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div>
          <Button
            variant="ghost"
            onClick={() => router.push('/dashboard/payroll')}
            className="mb-4"
          >
            <ArrowLeft size={16} className="mr-2" />
            Back to Payroll
          </Button>

          <h1 className="text-3xl font-bold text-gray-900">Create New Pay Run</h1>
          <p className="text-gray-600 mt-2">Set up a new payroll period for your team</p>
        </div>

        {/* Setup Form */}
        <div className="bg-white rounded-lg border shadow-sm p-8 space-y-6">
          {/* Info Banner */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex gap-3">
            <AlertCircle className="text-blue-600 flex-shrink-0 mt-0.5" size={20} />
            <div className="text-sm text-blue-900">
              <strong>Tip:</strong> Choose your pay frequency and we&apos;ll automatically calculate
              the appropriate pay period dates for you.
            </div>
          </div>

          {/* Pay Frequency */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">Pay Frequency *</label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {(['WEEKLY', 'FORTNIGHTLY', 'MONTHLY'] as Frequency[]).map((freq) => (
                <button
                  key={freq}
                  type="button"
                  onClick={() => calculateDefaultDates(freq)}
                  className={`p-4 border-2 rounded-lg text-left transition-all ${
                    form.frequency === freq
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="font-semibold text-gray-900 mb-1">{freq}</div>
                  <div className="text-xs text-gray-600">
                    {freq === 'WEEKLY'
                      ? 'Every week'
                      : freq === 'FORTNIGHTLY'
                        ? 'Every 2 weeks'
                        : 'Monthly'}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Pay Period Dates */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Period Start Date *
              </label>
              <div className="relative">
                <Calendar
                  className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                  size={18}
                />
                <Input
                  type="date"
                  value={form.periodStart}
                  onChange={(e) => setForm({ ...form, periodStart: e.target.value })}
                  className="pl-10"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Period End Date *
              </label>
              <div className="relative">
                <Calendar
                  className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                  size={18}
                />
                <Input
                  type="date"
                  value={form.periodEnd}
                  onChange={(e) => setForm({ ...form, periodEnd: e.target.value })}
                  className="pl-10"
                  required
                />
              </div>
            </div>
          </div>

          {/* Period Duration Display */}
          {form.periodStart && form.periodEnd && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <div className="text-sm text-gray-600 mb-1">Pay Period Duration</div>
              <div className="font-semibold text-gray-900">
                {format(parseISO(form.periodStart), 'd MMM yyyy')} →{' '}
                {format(parseISO(form.periodEnd), 'd MMM yyyy')}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {Math.ceil(
                  (parseISO(form.periodEnd).getTime() - parseISO(form.periodStart).getTime()) /
                    (1000 * 60 * 60 * 24)
                )}{' '}
                days
              </div>
            </div>
          )}

          {/* Pay Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Payment Date *</label>
            <div className="relative">
              <Calendar
                className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                size={18}
              />
              <Input
                type="date"
                value={form.payDate}
                onChange={(e) => setForm({ ...form, payDate: e.target.value })}
                className="pl-10"
                required
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">
              When employees will receive their payment (usually 2-5 days after period ends)
            </p>
          </div>

          {/* Overlap Check Status */}
          {checking && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-center gap-3">
              <Loader2 className="animate-spin text-blue-600" size={18} />
              <span className="text-sm text-blue-900">Checking for overlapping pay runs...</span>
            </div>
          )}

          {overlapError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-3">
              <AlertCircle className="text-red-600 flex-shrink-0 mt-0.5" size={18} />
              <div>
                <div className="text-sm font-medium text-red-900">Overlap Detected</div>
                <div className="text-sm text-red-700 mt-1">{overlapError}</div>
              </div>
            </div>
          )}

          {!checking && !overlapError && form.periodStart && form.periodEnd && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-center gap-3">
              <CheckCircle2 className="text-green-600" size={18} />
              <span className="text-sm text-green-900">No conflicts found - ready to create</span>
            </div>
          )}

          {/* Summary Preview */}
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-lg p-6">
            <h3 className="font-semibold text-blue-900 mb-3">Pay Run Summary</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-blue-700">Frequency</span>
                <span className="font-medium text-blue-900">{form.frequency}</span>
              </div>
              {form.periodStart && form.periodEnd && (
                <>
                  <div className="flex justify-between">
                    <span className="text-blue-700">Pay Period</span>
                    <span className="font-medium text-blue-900">
                      {format(parseISO(form.periodStart), 'd MMM')} -{' '}
                      {format(parseISO(form.periodEnd), 'd MMM yyyy')}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-blue-700">Payment Date</span>
                    <span className="font-medium text-blue-900">
                      {form.payDate ? format(parseISO(form.payDate), 'd MMM yyyy') : '—'}
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={() => router.push('/dashboard/payroll')}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            onClick={handleCreate}
            disabled={creating || checking || !!overlapError || !organisation?.id}
            className="flex-1 bg-blue-600 hover:bg-blue-700"
          >
            {creating ? (
              <>
                <Loader2 size={16} className="mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              'Create Pay Run'
            )}
          </Button>
        </div>

        {/* Help Text */}
        <div className="bg-gray-100 border border-gray-200 rounded-lg p-4">
          <h4 className="font-medium text-gray-900 mb-2">💡 What happens next?</h4>
          <ol className="text-sm text-gray-700 space-y-1 list-decimal list-inside">
            <li>Select which employees to include in this pay run</li>
            <li>Review calculated wages, tax, and superannuation</li>
            <li>Finalize and process the payment</li>
            <li>Payslips are automatically generated and STP is lodged</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
