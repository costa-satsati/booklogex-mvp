'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import PayrollRunDetailsDrawer from '@/components/PayrollRunDetailsDrawer';
import CreatePayRunWizard from './_components/CreatePayRunWizard';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { notify } from '@/lib/notify';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

type PayrollRun = {
  id: string;
  org_id: string;
  frequency: string;
  pay_period_start: string;
  pay_period_end: string;
  pay_date: string | null;
  status: string;
  total_gross: number;
  total_tax: number;
  total_super: number;
  total_net: number;
  created_at?: string;
};

export default function PayrollPage() {
  const [runs, setRuns] = useState<PayrollRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRun, setSelectedRun] = useState<string | null>(null);
  const [openWizard, setOpenWizard] = useState(false);
  const [orgId, setOrgId] = useState<string | null>(null);

  const loadRuns = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('payroll_runs')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error(error);
      notify.error('Failed to load payroll runs', error.message);
    } else {
      setRuns(data || []);
    }
    setLoading(false);
  };

  // Fetch orgId + payroll runs
  useEffect(() => {
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data: org } = await supabase
        .from('organisations')
        .select('id')
        .limit(1)
        .maybeSingle();

      if (org) setOrgId(org.id);
    })();

    loadRuns();
  }, []);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold text-slate-800">Payroll Runs</h1>
        <Button
          onClick={() => setOpenWizard(true)}
          disabled={!orgId}
          className="flex items-center gap-2 bg-blue-600 text-white hover:bg-blue-700"
        >
          🧾 Create Pay Run
        </Button>
      </div>

      {/* Table */}
      <div className="rounded-lg border bg-white shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-10 text-gray-500">
            <Loader2 className="h-5 w-5 animate-spin mr-2" />
            Loading payroll runs…
          </div>
        ) : runs.length === 0 ? (
          <div className="text-center py-10 text-gray-500 italic">No payroll runs yet.</div>
        ) : (
          <table className="min-w-full text-sm">
            <thead className="bg-slate-100 border-b text-gray-700">
              <tr>
                <th className="px-4 py-2 text-left">Period</th>
                <th className="px-4 py-2 text-left">Pay Date</th>
                <th className="px-4 py-2 text-left">Status</th>
                <th className="px-4 py-2 text-right">Gross</th>
                <th className="px-4 py-2 text-right">Tax</th>
                <th className="px-4 py-2 text-right">Super</th>
                <th className="px-4 py-2 text-right">Net</th>
                <th className="px-4 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {runs.map((r) => (
                <tr
                  key={r.id}
                  className="border-t hover:bg-slate-50 transition-colors cursor-pointer"
                  onClick={() => setSelectedRun(r.id)}
                >
                  <td className="px-4 py-2">
                    {format(new Date(r.pay_period_start), 'd MMM yyyy')} →{' '}
                    {format(new Date(r.pay_period_end), 'd MMM yyyy')}
                  </td>
                  <td className="px-4 py-2">
                    {r.pay_date ? format(new Date(r.pay_date), 'd MMM yyyy') : '-'}
                  </td>
                  <td className="px-4 py-2">
                    <span
                      className={cn(
                        'rounded-full px-2 py-0.5 text-xs font-medium capitalize',
                        r.status === 'finalized'
                          ? 'bg-emerald-100 text-emerald-700'
                          : r.status === 'draft'
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-gray-100 text-gray-700'
                      )}
                    >
                      {r.status}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-right">
                    {r.total_gross?.toLocaleString('en-AU', {
                      style: 'currency',
                      currency: 'AUD',
                    })}
                  </td>
                  <td className="px-4 py-2 text-right">
                    {r.total_tax?.toLocaleString('en-AU', {
                      style: 'currency',
                      currency: 'AUD',
                    })}
                  </td>
                  <td className="px-4 py-2 text-right">
                    {r.total_super?.toLocaleString('en-AU', {
                      style: 'currency',
                      currency: 'AUD',
                    })}
                  </td>
                  <td className="px-4 py-2 text-right font-semibold text-slate-800">
                    {r.total_net?.toLocaleString('en-AU', {
                      style: 'currency',
                      currency: 'AUD',
                    })}
                  </td>
                  <td className="px-4 py-2 text-right">
                    <button className="text-blue-600 hover:underline">View</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <PayrollRunDetailsDrawer
        open={!!selectedRun}
        onOpenChange={(v) => {
          setSelectedRun(v ? selectedRun : null);
          if (!v) loadRuns(); // reload after delete/finalize
        }}
        runId={selectedRun}
      />

      {/* Wizard */}
      <CreatePayRunWizard
        open={openWizard}
        onOpenChange={(v) => {
          setOpenWizard(v);
          if (!v) loadRuns(); // refresh after creating pay run
        }}
        orgId={orgId ?? ''}
      />
    </div>
  );
}
