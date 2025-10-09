'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { X } from 'lucide-react';
import AddPayrollItemModal from '@/components/AddPayrollItemModal';

// ─── Types ─────────────────────────────────────────────
type EmployeeRef = { name: string } | null;

type PayrollItem = {
  id: string;
  gross: number;
  tax: number;
  super: number;
  net: number;
  employee_id: string;
  employee: EmployeeRef;
};

type PayrollRunSummary = {
  total_gross: number;
  total_tax: number;
  total_super: number;
  total_net: number;
  pay_period_start: string;
  pay_period_end: string;
  pay_date: string | null;
  status: string;
};

// ─── Component ─────────────────────────────────────────
export default function PayrollRunDetailsDrawer({
  runId,
  onClose,
}: {
  runId: string;
  onClose: () => void;
}) {
  const [items, setItems] = useState<PayrollItem[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [summary, setSummary] = useState<PayrollRunSummary | null>(null);

  // 🧭 Load employee pay items
  const loadItems = async () => {
    const { data, error } = await supabase
      .from('payroll_items')
      .select('id, gross, tax, super, net, employee_id, employee:employees(name)')
      .eq('payroll_run_id', runId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Failed to load payroll items:', error);
      return;
    }

    if (data) {
      const normalised = data.map(
        (i: {
          id: string;
          gross: number;
          tax: number;
          super: number;
          net: number;
          employee_id: string;
          employee: { name: string }[] | { name: string } | null;
        }) => ({
          ...i,
          employee: Array.isArray(i.employee) ? i.employee[0] : i.employee,
        })
      );
      setItems(normalised);
    }
  };

  // 🧾 Load payroll run summary
  const loadSummary = async () => {
    const { data, error } = await supabase
      .from('payroll_runs')
      .select(
        'total_gross, total_tax, total_super, total_net, pay_period_start, pay_period_end, pay_date, status'
      )
      .eq('id', runId)
      .single();

    if (error) {
      console.error('❌ Failed to load summary:', error);
      return;
    }

    if (data) setSummary(data as PayrollRunSummary);
  };

  // ✅ Mark pay run as paid
  const handleMarkAsPaid = async () => {
    if (!runId) return;

    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const { error } = await supabase
      .from('payroll_runs')
      .update({ status: 'completed', pay_date: today })
      .eq('id', runId);

    if (error) {
      console.error('❌ Failed to mark as paid:', error);
      alert('Error: ' + error.message);
    } else {
      alert('✅ Payroll marked as paid.');
      await loadSummary();
    }
  };

  // 🔁 Realtime updates
  useEffect(() => {
    loadItems();
    loadSummary();

    const channel = supabase
      .channel('payroll-item-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'payroll_items' },
        (payload: {
          eventType: 'INSERT' | 'UPDATE' | 'DELETE';
          new: Record<string, unknown> | null;
          old: Record<string, unknown> | null;
        }) => {
          const { new: newItem, old: oldItem } = payload;
          const newRunId = (newItem?.payroll_run_id as string) ?? null;
          const oldRunId = (oldItem?.payroll_run_id as string) ?? null;
          if (newRunId !== runId && oldRunId !== runId) return;
          loadItems();
          loadSummary();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [runId]);

  // ─── UI ───────────────────────────────────────────────
  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 bg-black/40 z-40" onClick={onClose} />

      {/* Drawer */}
      <div className="fixed top-0 right-0 h-full w-full max-w-lg bg-white shadow-lg z-50 flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center border-b px-6 py-4">
          <h2 className="text-lg font-semibold">Pay Run Details</h2>
          <button onClick={onClose}>
            <X className="text-gray-600 hover:text-gray-800" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {summary && (
            <>
              {/* Summary cards */}
              <div className="grid grid-cols-2 gap-3 mb-6">
                <SummaryCard label="Gross" value={summary.total_gross} color="green" />
                <SummaryCard label="Tax" value={summary.total_tax} color="red" />
                <SummaryCard label="Super" value={summary.total_super} color="blue" />
                <SummaryCard
                  label="Net"
                  value={summary.total_net}
                  color={summary.total_net >= 0 ? 'green' : 'red'}
                />
              </div>

              {/* Period info */}
              <div className="text-sm text-gray-600 mb-3">
                <strong>Period:</strong> {summary.pay_period_start} → {summary.pay_period_end}
                <br />
                <strong>Pay Date:</strong>{' '}
                {summary.pay_date ? new Date(summary.pay_date).toLocaleDateString('en-AU') : '-'}
              </div>
            </>
          )}

          {/* Add Employee */}
          <div className="flex justify-end mb-4">
            <button
              onClick={() => setShowAddModal(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              + Add Employee
            </button>
          </div>

          {/* Employee list */}
          {items.length === 0 ? (
            <p className="text-gray-500 italic text-center py-6">No employees yet.</p>
          ) : (
            <table className="min-w-full text-sm border-t">
              <thead className="bg-gray-100 text-gray-600 uppercase">
                <tr>
                  <th className="px-4 py-2 text-left">Employee</th>
                  <th className="px-4 py-2 text-right">Gross</th>
                  <th className="px-4 py-2 text-right">Tax</th>
                  <th className="px-4 py-2 text-right">Super</th>
                  <th className="px-4 py-2 text-right">Net</th>
                </tr>
              </thead>
              <tbody>
                {items.map((i) => (
                  <tr key={i.id} className="border-t">
                    <td className="px-4 py-2">{i.employee?.name || '-'}</td>
                    <td className="px-4 py-2 text-right">
                      {i.gross.toLocaleString('en-AU', { style: 'currency', currency: 'AUD' })}
                    </td>
                    <td className="px-4 py-2 text-right">
                      {i.tax.toLocaleString('en-AU', { style: 'currency', currency: 'AUD' })}
                    </td>
                    <td className="px-4 py-2 text-right">
                      {i.super.toLocaleString('en-AU', { style: 'currency', currency: 'AUD' })}
                    </td>
                    <td className="px-4 py-2 text-right">
                      {i.net.toLocaleString('en-AU', { style: 'currency', currency: 'AUD' })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer */}
        <div className="border-t px-6 py-4 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 border rounded">
            Close
          </button>
          <button
            onClick={handleMarkAsPaid}
            disabled={summary?.status === 'completed'}
            className={`px-4 py-2 rounded text-white ${
              summary?.status === 'completed'
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-green-600 hover:bg-green-700'
            }`}
          >
            {summary?.status === 'completed' ? 'Paid' : 'Mark as Paid'}
          </button>
        </div>
      </div>

      {/* Add Employee Modal */}
      {showAddModal && (
        <AddPayrollItemModal
          runId={runId}
          onClose={() => setShowAddModal(false)}
          onAdded={() => {
            loadItems();
            loadSummary();
          }}
        />
      )}
    </>
  );
}

// ─── SummaryCard ───────────────────────────────────────
function SummaryCard({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: 'green' | 'red' | 'blue';
}) {
  const colorClasses = {
    green: 'bg-green-50 text-green-700',
    red: 'bg-red-50 text-red-700',
    blue: 'bg-blue-50 text-blue-700',
  }[color];

  return (
    <div className={`p-3 border rounded-lg ${colorClasses.replace('text-', '')}`}>
      <div className="text-sm text-gray-500">{label}</div>
      <div className={`text-lg font-semibold ${colorClasses.split(' ')[1]}`}>
        {value.toLocaleString('en-AU', { style: 'currency', currency: 'AUD' })}
      </div>
    </div>
  );
}
