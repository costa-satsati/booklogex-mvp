'use client';

import { use, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import type { PayrollItem } from '@/types/payroll';
import EmployeePayTable from './_components/EmployeePayTable';
import SummaryBar from './_components/SummaryBar';
import ReviewPanel from './_components/ReviewPanel';
import { Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { notify } from '@/lib/notify';

type PayrollRun = {
  id: string;
  pay_period_start: string;
  pay_period_end: string;
  pay_date: string | null;
  status: string;
  total_gross: number;
  total_tax: number;
  total_super: number;
  total_net: number;
};

export default function PayRunEditor({ params }: { params: Promise<{ id: string }> }) {
  // ✅ unwrap route params (new Next.js 15+ syntax)
  const { id } = use(params);

  const [run, setRun] = useState<PayrollRun | null>(null);
  const [items, setItems] = useState<PayrollItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 🔹 Load pay run + items
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        // Fetch pay run
        const { data: runData, error: runError } = await supabase
          .from('payroll_runs')
          .select('*')
          .eq('id', id)
          .single();
        if (runError) throw runError;

        // Fetch related payroll_items + employee names
        const { data: itemsData, error: itemsError } = await supabase
          .from('payroll_items')
          .select('*, employees(full_name)')
          .eq('payroll_run_id', id)
          .order('created_at', { ascending: true });

        if (itemsError) throw itemsError;

        setRun(runData);
        setItems(itemsData || []);
      } catch (e: unknown) {
        console.error('❌ Failed to load pay run:', e);
        const message = e instanceof Error ? e.message : 'Failed to load pay run';
        setError(message);
        notify.error('Error loading pay run', message);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [id]);

  // 🔹 Derived totals (live)
  const totalGross = items.reduce((sum, i) => sum + (i.gross ?? 0), 0);
  const totalTax = items.reduce((sum, i) => sum + (i.tax ?? 0), 0);
  const totalSuper = items.reduce((sum, i) => sum + (i.super ?? 0), 0);
  const totalNet = items.reduce((sum, i) => sum + (i.net ?? 0), 0);

  if (loading)
    return (
      <div className="flex justify-center items-center h-64 text-gray-500">
        <Loader2 className="h-5 w-5 animate-spin mr-2" />
        Loading pay run...
      </div>
    );

  if (error)
    return <div className="p-6 text-center text-red-600">⚠️ Error loading pay run: {error}</div>;

  if (!run)
    return (
      <div className="p-6 text-center text-gray-500 italic">Pay run not found or deleted.</div>
    );

  return (
    <div className="p-6 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-800">
            Pay Run: {format(new Date(run.pay_period_start), 'd MMM yyyy')} →{' '}
            {format(new Date(run.pay_period_end), 'd MMM yyyy')}
          </h1>
          <p className="text-gray-500 text-sm">
            Pay Date: {run.pay_date ? format(new Date(run.pay_date), 'd MMM yyyy') : '—'} | Status:{' '}
            <span
              className={`capitalize ${
                run.status === 'finalized'
                  ? 'text-emerald-700 font-medium'
                  : 'text-blue-700 font-medium'
              }`}
            >
              {run.status}
            </span>
          </p>
        </div>

        {/* Live Totals */}
        <div className="text-sm text-right text-gray-600 bg-slate-50 border rounded-lg p-3 space-y-1 shadow-sm">
          <div>
            Gross:{' '}
            <span className="font-medium text-slate-800">
              {totalGross.toLocaleString('en-AU', { style: 'currency', currency: 'AUD' })}
            </span>
          </div>
          <div>
            Tax:{' '}
            <span className="font-medium text-slate-800">
              {totalTax.toLocaleString('en-AU', { style: 'currency', currency: 'AUD' })}
            </span>
          </div>
          <div>
            Super:{' '}
            <span className="font-medium text-slate-800">
              {totalSuper.toLocaleString('en-AU', { style: 'currency', currency: 'AUD' })}
            </span>
          </div>
          <div>
            Net:{' '}
            <span className="font-semibold text-emerald-700">
              {totalNet.toLocaleString('en-AU', { style: 'currency', currency: 'AUD' })}
            </span>
          </div>
        </div>
      </div>

      {/* Employee Pay Items */}
      <EmployeePayTable
        items={items}
        onItemsChange={setItems}
        readOnly={run.status === 'finalized'}
      />

      {/* Summary */}
      <SummaryBar items={items} />

      {/* Review & Validation */}
      <ReviewPanel runId={run.id} runStatus={run.status} />
    </div>
  );
}
