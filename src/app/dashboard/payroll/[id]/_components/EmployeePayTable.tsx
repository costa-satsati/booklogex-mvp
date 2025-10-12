'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Save } from 'lucide-react';
import type { PayrollItem } from '@/types/payroll';
import { notify } from '@/lib/notify';

interface EmployeePayTableProps {
  runId: string;
  items: PayrollItem[];
  onItemsChange: (updated: PayrollItem[]) => void;
  readOnly?: boolean;
}

type NumericField = 'gross' | 'tax' | 'super'; // ✅ Restrict editable fields

export default function EmployeePayTable({
  runId,
  items,
  onItemsChange,
  readOnly = false,
}: EmployeePayTableProps) {
  const [saving, setSaving] = useState(false);

  const handleChange = (id: string, field: NumericField, value: number) => {
    const updated = items.map((i) => (i.id === id ? { ...i, [field]: value } : i));
    onItemsChange(updated);
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const { error } = await supabase.from('payroll_items').upsert(
        items.map(({ id, payroll_run_id, employee_id, gross, tax, super: superAmt, net }) => ({
          id,
          payroll_run_id,
          employee_id,
          gross,
          tax,
          super: superAmt,
          net,
        }))
      );

      if (error) throw error;
      notify.success('Saved successfully', 'Employee pay items updated.');
    } catch (e: any) {
      console.error(e);
      notify.error('Save failed', e.message ?? 'Could not save pay items.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
      <table className="min-w-full text-sm">
        <thead className="bg-slate-50 text-slate-600 border-b">
          <tr>
            <th className="px-4 py-2 text-left font-medium">Employee</th>
            <th className="px-4 py-2 text-right font-medium">Gross</th>
            <th className="px-4 py-2 text-right font-medium">Tax</th>
            <th className="px-4 py-2 text-right font-medium">Super</th>
            <th className="px-4 py-2 text-right font-medium">Net</th>
          </tr>
        </thead>
        <tbody>
          {items.length === 0 ? (
            <tr>
              <td colSpan={5} className="text-center text-gray-500 py-6 italic">
                No employees found in this pay run.
              </td>
            </tr>
          ) : (
            items.map((i) => (
              <tr key={i.id} className="border-t hover:bg-slate-50 transition">
                <td className="px-4 py-2">{i.employees?.full_name ?? '—'}</td>

                {(['gross', 'tax', 'super'] as NumericField[]).map((field) => (
                  <td key={field} className="px-4 py-2 text-right">
                    {readOnly ? (
                      <span>
                        {(i[field] ?? 0).toLocaleString('en-AU', {
                          style: 'currency',
                          currency: 'AUD',
                        })}
                      </span>
                    ) : (
                      <Input
                        type="number"
                        step="0.01"
                        value={Number(i[field] ?? 0)}
                        onChange={(e) => handleChange(i.id, field, Number(e.target.value))}
                        className="w-24 text-right"
                      />
                    )}
                  </td>
                ))}

                <td className="px-4 py-2 text-right font-medium text-emerald-700">
                  {(i.net ?? 0).toLocaleString('en-AU', {
                    style: 'currency',
                    currency: 'AUD',
                  })}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      {!readOnly && items.length > 0 && (
        <div className="p-3 border-t flex justify-end bg-slate-50">
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving…
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" /> Save Changes
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
