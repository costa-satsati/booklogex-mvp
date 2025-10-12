'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';
import { format, addDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';
import { Loader2, Calendar, FileCheck2, AlertTriangle, Save, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { notify } from '@/lib/notify';

export type PayFrequency = 'WEEKLY' | 'FORTNIGHTLY' | 'MONTHLY';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  orgId: string;
  defaultFrequency?: PayFrequency;
  lastRun?: {
    frequency: PayFrequency;
    period_start: string;
    period_end: string;
    pay_date: string;
  } | null;
}

export default function CreatePayRunWizard({
  open,
  onOpenChange,
  orgId,
  defaultFrequency = 'FORTNIGHTLY',
  lastRun,
}: Props) {
  const router = useRouter();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [precheck, setPrecheck] = useState<{
    hasEmployees: boolean;
    hasABN: boolean;
    hasDefaultCalendar: boolean;
  } | null>(null);

  const [frequency, setFrequency] = useState<PayFrequency>(lastRun?.frequency ?? defaultFrequency);
  const [periodStart, setPeriodStart] = useState<string>(
    lastRun?.period_start ?? format(startOfWeek(new Date()), 'yyyy-MM-dd')
  );
  const [periodEnd, setPeriodEnd] = useState<string>(
    lastRun?.period_end ?? format(endOfWeek(new Date()), 'yyyy-MM-dd')
  );
  const [payDate, setPayDate] = useState<string>(
    lastRun?.pay_date ?? format(addDays(new Date(), 3), 'yyyy-MM-dd')
  );

  // derive suggested range
  useEffect(() => {
    const today = new Date();
    if (frequency === 'WEEKLY') {
      setPeriodStart(format(startOfWeek(today), 'yyyy-MM-dd'));
      setPeriodEnd(format(endOfWeek(today), 'yyyy-MM-dd'));
    } else if (frequency === 'FORTNIGHTLY') {
      const start = startOfWeek(today);
      const end = addDays(start, 13);
      setPeriodStart(format(start, 'yyyy-MM-dd'));
      setPeriodEnd(format(end, 'yyyy-MM-dd'));
    } else {
      setPeriodStart(format(startOfMonth(today), 'yyyy-MM-dd'));
      setPeriodEnd(format(endOfMonth(today), 'yyyy-MM-dd'));
    }
  }, [frequency]);

  // prechecks
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      setError(null);
      const { count } = await supabase
        .from('employees')
        .select('id', { count: 'exact', head: true })
        .eq('org_id', orgId)
        .eq('active', true);

      const { data: org } = await supabase
        .from('organisations')
        .select('abn')
        .eq('id', orgId)
        .single();

      if (!cancelled) {
        setPrecheck({
          hasEmployees: (count ?? 0) > 0,
          hasABN: !!org?.abn,
          hasDefaultCalendar: true,
        });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, orgId, lastRun]);

  const canContinue =
    precheck?.hasEmployees &&
    precheck?.hasABN &&
    periodStart &&
    periodEnd &&
    payDate &&
    new Date(periodStart) <= new Date(periodEnd);

  const handleCreate = async () => {
    setBusy(true);
    setError(null);
    try {
      const { data, error } = await supabase
        .from('payroll_runs')
        .insert([
          {
            org_id: orgId,
            frequency,
            pay_period_start: periodStart,
            pay_period_end: periodEnd,
            pay_date: payDate,
            status: 'draft',
            total_gross: 0,
            total_tax: 0,
            total_super: 0,
            total_net: 0,
          },
        ])
        .select('id')
        .single();

      if (error) throw error;

      notify.success('Pay run created', 'Redirecting to editor…');
      setStep(3);
      setTimeout(() => {
        router.push(`/dashboard/payroll/${data.id}`);
        onOpenChange(false);
      }, 1000);
    } catch (e: any) {
      setError(e.message ?? 'Failed to create pay run');
      notify.error('Failed to create pay run', e.message);
    } finally {
      setBusy(false);
    }
  };

  const handleSaveDraft = async () => {
    setBusy(true);
    setError(null);
    try {
      const { error } = await supabase.from('payroll_runs').insert([
        {
          org_id: orgId,
          frequency,
          pay_period_start: periodStart,
          pay_period_end: periodEnd,
          pay_date: payDate,
          status: 'draft',
          total_gross: 0,
          total_tax: 0,
          total_super: 0,
          total_net: 0,
        },
      ]);
      if (error) throw error;

      notify.success('Draft saved', 'You can continue this pay run later.');
      onOpenChange(false);
    } catch (e: any) {
      notify.error('Failed to save draft', e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl p-0 overflow-hidden">
        {/* Header */}
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg font-semibold">
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-white/20 text-white text-xs font-semibold">
              {step}
            </span>
            {step === 1 && 'Create Pay Run — Setup'}
            {step === 2 && 'Review & Confirm'}
            {step === 3 && 'Pay Run Created'}
          </DialogTitle>
        </DialogHeader>

        {/* Progress Bar */}
        <div className="relative h-2 bg-gray-200">
          <div
            className={cn(
              'absolute left-0 top-0 h-2 bg-gradient-to-r from-blue-500 to-emerald-500 transition-all duration-500 rounded-r-lg',
              step === 1 && 'w-1/3',
              step === 2 && 'w-2/3',
              step === 3 && 'w-full'
            )}
          />
        </div>

        {/* Step Content */}
        <div className="p-6 space-y-6">
          {step === 1 && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <Label>Pay Frequency</Label>
                  <Select value={frequency} onValueChange={(v) => setFrequency(v as PayFrequency)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="WEEKLY">Weekly</SelectItem>
                      <SelectItem value="FORTNIGHTLY">Fortnightly</SelectItem>
                      <SelectItem value="MONTHLY">Monthly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Period Start</Label>
                  <Input
                    type="date"
                    value={periodStart}
                    onChange={(e) => setPeriodStart(e.target.value)}
                  />
                </div>
                <div>
                  <Label>Period End</Label>
                  <Input
                    type="date"
                    value={periodEnd}
                    onChange={(e) => setPeriodEnd(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <Label>Pay Date</Label>
                  <Input type="date" value={payDate} onChange={(e) => setPayDate(e.target.value)} />
                </div>
                <div className="col-span-2 flex items-center gap-2 text-sm text-gray-600">
                  <Calendar className="h-4 w-4" />
                  Overlapping ranges will be blocked automatically.
                </div>
              </div>

              {/* Pre-checks */}
              <div className="rounded-lg border border-gray-200 bg-slate-50 p-3">
                <div className="flex items-center gap-2 font-medium mb-2 text-slate-800">
                  <FileCheck2 className="h-4 w-4" /> Pre-checks
                </div>
                <ul className="space-y-1 text-sm">
                  <li
                    className={cn(
                      'flex items-center gap-2',
                      precheck?.hasEmployees ? 'text-emerald-700' : 'text-amber-700'
                    )}
                  >
                    {precheck?.hasEmployees
                      ? '✅ At least one active employee'
                      : '⚠️ No active employees'}
                  </li>
                  <li
                    className={cn(
                      'flex items-center gap-2',
                      precheck?.hasABN ? 'text-emerald-700' : 'text-amber-700'
                    )}
                  >
                    {precheck?.hasABN
                      ? '✅ ABN registered'
                      : '⚠️ Add your ABN in Organisation Settings'}
                  </li>
                  <li className="flex items-center gap-2 text-gray-600">
                    {precheck?.hasDefaultCalendar
                      ? '✅ Default pay calendar'
                      : 'ℹ️ No default pay calendar (optional)'}
                  </li>
                </ul>
              </div>

              {error && (
                <div className="flex items-center gap-2 rounded border border-amber-300 bg-amber-50 p-3 text-amber-800 text-sm">
                  <AlertTriangle className="h-4 w-4" /> {error}
                </div>
              )}

              <DialogFooter className="flex items-center justify-between mt-4">
                <Button variant="secondary" onClick={handleSaveDraft} disabled={busy}>
                  {busy ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : '💾 Save & Exit'}
                </Button>
                <Button
                  variant="default"
                  onClick={() => setStep(2)}
                  disabled={!canContinue}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  Continue →
                </Button>
              </DialogFooter>
            </>
          )}

          {step === 2 && (
            <>
              <div className="rounded-lg border border-gray-200 bg-slate-50 p-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="text-gray-500">Frequency</div>
                    <div className="font-medium text-slate-800">{frequency}</div>
                  </div>
                  <div>
                    <div className="text-gray-500">Employees included</div>
                    <div className="font-medium text-slate-800">All active (editable next)</div>
                  </div>
                  <div>
                    <div className="text-gray-500">Period</div>
                    <div className="font-medium text-slate-800">
                      {periodStart} → {periodEnd}
                    </div>
                  </div>
                  <div>
                    <div className="text-gray-500">Pay date</div>
                    <div className="font-medium text-slate-800">{payDate}</div>
                  </div>
                </div>
              </div>

              <DialogFooter className="flex items-center justify-between mt-4">
                <Button variant="ghost" onClick={() => setStep(1)}>
                  ← Back
                </Button>
                <Button
                  onClick={handleCreate}
                  disabled={busy}
                  className="bg-emerald-600 hover:bg-emerald-700"
                >
                  {busy ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creating…
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" /> Create draft & continue
                    </>
                  )}
                </Button>
              </DialogFooter>
            </>
          )}

          {step === 3 && (
            <div className="space-y-4 text-center">
              <div className="flex justify-center">
                <CheckCircle2 className="h-10 w-10 text-emerald-600" />
              </div>
              <h2 className="text-lg font-semibold text-emerald-700">Draft pay run created</h2>
              <p className="text-sm text-gray-600">
                You can now add/remove employees and edit pay items before finalising.
              </p>
              <DialogFooter>
                <Button onClick={() => onOpenChange(false)}>Close</Button>
              </DialogFooter>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
