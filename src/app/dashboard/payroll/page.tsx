'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import PayrollRunDetailsDrawer from '@/components/PayrollRunDetailsDrawer';

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

export default function PayrollPage() {
  const [runs, setRuns] = useState<PayrollRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRun, setSelectedRun] = useState<string | null>(null);

  // 🧭 Load payroll runs
  const loadRuns = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('payroll_runs')
      .select(
        'id, pay_period_start, pay_period_end, pay_date, status, total_gross, total_tax, total_super, total_net'
      )
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Failed to load payroll runs:', error);
    } else {
      setRuns(data || []);
    }

    setLoading(false);
  };

  // 🆕 Create new payroll run
  const handleCreateRun = async () => {
    const today = new Date();
    const start = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
    const end = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0];

    const { error } = await supabase.from('payroll_runs').insert([
      {
        pay_period_start: start,
        pay_period_end: end,
        status: 'draft',
        total_gross: 0,
        total_tax: 0,
        total_super: 0,
        total_net: 0,
      },
    ]);

    if (error) {
      console.error('❌ Failed to create payroll run:', error);
      alert('Error creating payroll run: ' + error.message);
    } else {
      await loadRuns();
      alert('✅ Payroll run created.');
    }
  };

  useEffect(() => {
    loadRuns();
  }, []);

  if (loading) {
    return <div className="p-6 text-gray-500">Loading payroll runs...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold">Payroll Runs</h1>
        <button
          onClick={handleCreateRun}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded"
        >
          + New Pay Run
        </button>
      </div>

      {/* Runs Table */}
      <table className="min-w-full bg-white border rounded shadow text-sm">
        <thead className="bg-gray-100 text-gray-700">
          <tr>
            <th className="px-4 py-2 text-left">Period</th>
            <th className="px-4 py-2 text-left">Pay Date</th>
            <th className="px-4 py-2 text-left">Status</th>
            <th className="px-4 py-2 text-right">Gross</th>
            <th className="px-4 py-2 text-right">Tax</th>
            <th className="px-4 py-2 text-right">Super</th>
            <th className="px-4 py-2 text-right">Net</th>
            <th className="px-4 py-2 text-right"></th>
          </tr>
        </thead>
        <tbody>
          {runs.length === 0 ? (
            <tr>
              <td colSpan={8} className="text-center py-6 text-gray-500 italic">
                No payroll runs yet.
              </td>
            </tr>
          ) : (
            runs.map((r) => (
              <tr key={r.id} className="border-t hover:bg-gray-50">
                <td className="px-4 py-2">
                  {r.pay_period_start} → {r.pay_period_end}
                </td>
                <td className="px-4 py-2">
                  {r.pay_date ? new Date(r.pay_date).toLocaleDateString('en-AU') : '-'}
                </td>
                <td className="px-4 py-2 capitalize">
                  <span
                    className={`px-2 py-1 rounded text-xs ${
                      r.status === 'completed'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-yellow-100 text-yellow-700'
                    }`}
                  >
                    {r.status}
                  </span>
                </td>
                <td className="px-4 py-2 text-right">
                  {r.total_gross.toLocaleString('en-AU', {
                    style: 'currency',
                    currency: 'AUD',
                  })}
                </td>
                <td className="px-4 py-2 text-right">
                  {r.total_tax.toLocaleString('en-AU', {
                    style: 'currency',
                    currency: 'AUD',
                  })}
                </td>
                <td className="px-4 py-2 text-right">
                  {r.total_super.toLocaleString('en-AU', {
                    style: 'currency',
                    currency: 'AUD',
                  })}
                </td>
                <td className="px-4 py-2 text-right">
                  {r.total_net.toLocaleString('en-AU', {
                    style: 'currency',
                    currency: 'AUD',
                  })}
                </td>
                <td className="px-4 py-2 text-right">
                  <button
                    onClick={() => setSelectedRun(r.id)}
                    className="text-blue-600 hover:underline"
                  >
                    View
                  </button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      {/* Drawer */}
      {selectedRun && (
        <PayrollRunDetailsDrawer runId={selectedRun} onClose={() => setSelectedRun(null)} />
      )}
    </div>
  );
}
