'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { format } from 'date-fns';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerFooter,
} from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Loader2, Trash2, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { notify } from '@/lib/notify';
import { cn } from '@/lib/utils';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  runId: string | null;
}

type PayrollRunDetails = {
  id: string;
  status: string;
  frequency: string;
  pay_period_start: string;
  pay_period_end: string;
  pay_date: string | null;
  total_gross: number | null;
  total_tax: number | null;
  total_super: number | null;
  total_net: number | null;
};

export default function PayrollRunDetailsDrawer({ open, onOpenChange, runId }: Props) {
  const [loading, setLoading] = useState(false);
  const [run, setRun] = useState<PayrollRunDetails | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  // 🔹 Load pay run when drawer opens
  useEffect(() => {
    if (!open || !runId) return;
    (async () => {
      setLoading(true);
      setError(null);
      const { data, error } = await supabase
        .from('payroll_runs')
        .select('*')
        .eq('id', runId)
        .single();

      if (error) setError(error.message);
      else setRun(data as PayrollRunDetails);
      setLoading(false);
    })();
  }, [open, runId]);

  // 🔹 Finalize pay run
  const handleFinalize = async () => {
    if (!runId) return;
    setLoading(true);
    const { error } = await supabase
      .from('payroll_runs')
      .update({ status: 'finalized' })
      .eq('id', runId);
    setLoading(false);
    if (error) notify.error('Failed to finalize', error.message);
    else {
      notify.success('Pay run finalized', 'This pay run is now locked for editing.');
      onOpenChange(false);
    }
  };

  // 🔹 Delete pay run (only drafts)
  const handleDelete = async () => {
    if (!runId) return;
    setLoading(true);
    const { error } = await supabase.from('payroll_runs').delete().eq('id', runId);
    setLoading(false);
    if (error) notify.error('Failed to delete pay run', error.message);
    else {
      notify.success('Draft deleted', 'This draft pay run has been removed.');
      onOpenChange(false);
    }
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="rounded-t-xl border-t shadow-xl">
        <DrawerHeader>
          <DrawerTitle>Pay Run Details</DrawerTitle>
          <DrawerDescription className="text-sm text-muted-foreground">
            Review summary, finalize, or delete draft pay runs.
          </DrawerDescription>
        </DrawerHeader>

        {/* 🧾 Body */}
        <div className="p-4">
          {loading ? (
            <div className="flex justify-center py-8 text-gray-500">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : error ? (
            <div className="flex items-center gap-2 text-amber-700 bg-amber-50 border border-amber-200 rounded-md p-3 text-sm">
              <AlertTriangle className="h-4 w-4" /> {error}
            </div>
          ) : run ? (
            <div className="space-y-4 text-sm">
              <div className="rounded-lg border bg-slate-50 p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">Status</span>
                  <span
                    className={cn(
                      'rounded px-2 py-1 text-xs font-medium capitalize',
                      run.status === 'finalized'
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-blue-100 text-blue-700'
                    )}
                  >
                    {run.status}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">Frequency</span>
                  <span className="font-medium">{run.frequency}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">Period</span>
                  <span className="font-medium">
                    {format(new Date(run.pay_period_start), 'd MMM yyyy')} →{' '}
                    {format(new Date(run.pay_period_end), 'd MMM yyyy')}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">Pay Date</span>
                  <span className="font-medium">
                    {run.pay_date ? format(new Date(run.pay_date), 'd MMM yyyy') : '—'}
                  </span>
                </div>
              </div>

              <div className="rounded-lg border bg-slate-50 p-3 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">Total Gross</span>
                  <span className="font-semibold">${Number(run.total_gross || 0).toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">Tax</span>
                  <span className="font-semibold">${Number(run.total_tax || 0).toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">Super</span>
                  <span className="font-semibold">${Number(run.total_super || 0).toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between border-t pt-2">
                  <span className="text-gray-700">Net Pay</span>
                  <span className="text-lg font-bold text-emerald-700">
                    ${Number(run.total_net || 0).toFixed(2)}
                  </span>
                </div>
              </div>

              {/* 🗑️ Delete confirmation */}
              {confirmDelete && (
                <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">
                  <p>Are you sure you want to delete this draft pay run?</p>
                  <div className="flex gap-2 mt-3">
                    <Button variant="destructive" onClick={handleDelete}>
                      <Trash2 className="mr-2 h-4 w-4" /> Confirm Delete
                    </Button>
                    <Button variant="outline" onClick={() => setConfirmDelete(false)}>
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ) : null}
        </div>

        {/* 🔻 Footer */}
        {run && (
          <DrawerFooter className="flex justify-between border-t pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
            {run.status === 'draft' && !confirmDelete && (
              <div className="flex gap-2">
                <Button
                  variant="destructive"
                  onClick={() => setConfirmDelete(true)}
                  className="bg-red-600 hover:bg-red-700"
                >
                  <Trash2 className="mr-2 h-4 w-4" /> Delete
                </Button>
                <Button
                  onClick={handleFinalize}
                  disabled={loading}
                  className="bg-emerald-600 hover:bg-emerald-700"
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Finalizing…
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="mr-2 h-4 w-4" /> Finalize
                    </>
                  )}
                </Button>
              </div>
            )}
          </DrawerFooter>
        )}
      </DrawerContent>
    </Drawer>
  );
}
