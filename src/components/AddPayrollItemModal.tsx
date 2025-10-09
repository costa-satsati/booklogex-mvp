'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

type Props = {
  runId: string;
  onClose: () => void;
  onAdded: () => void;
};

export default function AddPayrollItemModal({ runId, onClose, onAdded }: Props) {
  const [employees, setEmployees] = useState<{ id: string; name: string; salary: number | null }[]>(
    []
  );
  const [selected, setSelected] = useState<string>('');
  const [gross, setGross] = useState<number>(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadEmployees = async () => {
      const { data, error } = await supabase.from('employees').select('id, name, salary');
      if (error) console.error('Failed to load employees:', error);
      else setEmployees(data);
    };
    loadEmployees();
  }, []);

  const calculateTax = (gross: number) => {
    // Simple progressive rate (example)
    if (gross < 1000) return gross * 0.1;
    if (gross < 2000) return gross * 0.15;
    return gross * 0.2;
  };

  const calculateSuper = (gross: number) => +(gross * 0.115).toFixed(2); // 11.5%

  const handleSave = async () => {
    if (!selected || !gross) {
      alert('Please select an employee and enter gross pay');
      return;
    }

    setLoading(true);
    const tax = calculateTax(gross);
    const superAmt = calculateSuper(gross);
    const net = +(gross - tax).toFixed(2);

    const { error } = await supabase.from('payroll_items').insert([
      {
        payroll_run_id: runId,
        employee_id: selected,
        gross,
        tax,
        super: superAmt,
        net,
      },
    ]);

    setLoading(false);

    if (error) {
      console.error('Insert failed:', error);
      alert('Error adding payroll item: ' + error.message);
    } else {
      onAdded();
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg w-96 space-y-4 shadow-lg">
        <h2 className="text-lg font-semibold">Add Employee Pay</h2>

        <label className="block text-sm font-medium">Employee</label>
        <select
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
          className="w-full border rounded p-2"
          required
        >
          <option value="">Select employee</option>
          {employees.map((e) => (
            <option key={e.id} value={e.id}>
              {e.name}
            </option>
          ))}
        </select>

        <label className="block text-sm font-medium">Gross Pay</label>
        <input
          type="number"
          step="0.01"
          value={gross}
          onChange={(e) => setGross(parseFloat(e.target.value))}
          className="w-full border rounded p-2"
        />

        <div className="text-sm text-gray-600 space-y-1">
          <div>
            Tax (est):{' '}
            {calculateTax(gross).toLocaleString('en-AU', { style: 'currency', currency: 'AUD' })}
          </div>
          <div>
            Super (11.5%):{' '}
            {calculateSuper(gross).toLocaleString('en-AU', { style: 'currency', currency: 'AUD' })}
          </div>
          <div className="font-medium">
            Net:{' '}
            {(gross - calculateTax(gross)).toLocaleString('en-AU', {
              style: 'currency',
              currency: 'AUD',
            })}
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button onClick={onClose} className="px-4 py-2 border rounded">
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded"
          >
            {loading ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}
