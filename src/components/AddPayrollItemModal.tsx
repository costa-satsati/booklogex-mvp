'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import type { Employee } from '@/types/employee';

type Props = {
  runId: string;
  onClose: () => void;
  onAdded: () => void;
};

export default function AddPayrollItemModal({ runId, onClose, onAdded }: Props) {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedId, setSelectedId] = useState<string>('');
  const [gross, setGross] = useState<number>(0);
  const [loading, setLoading] = useState(false);

  // 🧭 Load employees
  useEffect(() => {
    const loadEmployees = async () => {
      const { data, error } = await supabase
        .from('employees')
        .select(
          'id, full_name, base_salary, hourly_rate, employment_type, pay_frequency, super_rate, active'
        )
        .eq('active', true)
        .order('full_name');

      if (error) console.error('❌ Failed to load employees:', error);
      else setEmployees((data || []) as Employee[]);
    };

    loadEmployees();
  }, []);

  // ⚙️ Calculation helpers
  const calculateTax = (gross: number) => {
    if (gross < 1000) return gross * 0.1;
    if (gross < 2000) return gross * 0.15;
    return gross * 0.2;
  };

  const calculateSuper = (gross: number, superRate: number) =>
    +(gross * (superRate / 100)).toFixed(2);

  // 💰 Auto-calc suggested gross
  const getSuggestedGross = (emp: Employee) => {
    if (emp.base_salary) {
      const divisor =
        emp.pay_frequency === 'weekly' ? 52 : emp.pay_frequency === 'fortnightly' ? 26 : 12;
      return +(emp.base_salary / divisor).toFixed(2);
    }

    if (emp.hourly_rate) {
      const hours = emp.pay_frequency === 'weekly' ? 38 : 76;
      return +(emp.hourly_rate * hours).toFixed(2);
    }

    return 0;
  };

  const selectedEmp = employees.find((e) => e.id === selectedId) || null;

  // 💾 Save payroll item
  const handleSave = async () => {
    if (!selectedEmp || !gross) {
      alert('Please select an employee and enter gross pay');
      return;
    }

    setLoading(true);
    const tax = calculateTax(gross);
    const superAmt = calculateSuper(gross, selectedEmp.super_rate || 11);
    const net = +(gross - tax).toFixed(2);

    const { error } = await supabase.from('payroll_items').insert([
      {
        payroll_run_id: runId,
        employee_id: selectedEmp.id,
        gross,
        tax,
        super: superAmt,
        net,
      },
    ]);

    setLoading(false);

    if (error) {
      console.error('❌ Insert failed:', error);
      alert('Error adding payroll item: ' + error.message);
    } else {
      onAdded();
      onClose();
    }
  };

  // 🧱 UI
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg w-96 space-y-4 shadow-lg">
        <h2 className="text-lg font-semibold">Add Employee Pay</h2>

        {/* Employee dropdown */}
        <label className="block text-sm font-medium">Employee</label>
        <select
          value={selectedId}
          onChange={(e) => {
            const id = e.target.value;
            setSelectedId(id);
            const emp = employees.find((x) => x.id === id);
            if (emp) setGross(getSuggestedGross(emp));
          }}
          className="w-full border rounded p-2"
          required
        >
          <option value="">Select employee</option>
          {employees.map((e) => (
            <option key={e.id} value={e.id}>
              {e.full_name} — {e.employment_type}
            </option>
          ))}
        </select>

        {/* Gross pay */}
        <label className="block text-sm font-medium">Gross Pay</label>
        <input
          type="number"
          step="0.01"
          value={gross}
          onChange={(e) => setGross(parseFloat(e.target.value) || 0)}
          className="w-full border rounded p-2"
        />

        {/* Calculation preview */}
        {selectedEmp && (
          <div className="text-sm text-gray-700 space-y-1 border rounded p-3 bg-gray-50">
            <div>
              Tax (est):{' '}
              {calculateTax(gross).toLocaleString('en-AU', {
                style: 'currency',
                currency: 'AUD',
              })}
            </div>
            <div>
              Super ({selectedEmp.super_rate}%):{' '}
              {calculateSuper(gross, selectedEmp.super_rate).toLocaleString('en-AU', {
                style: 'currency',
                currency: 'AUD',
              })}
            </div>
            <div className="font-medium">
              Net:{' '}
              {(gross - calculateTax(gross)).toLocaleString('en-AU', {
                style: 'currency',
                currency: 'AUD',
              })}
            </div>
          </div>
        )}

        {/* Footer buttons */}
        <div className="flex justify-end gap-2 pt-2">
          <button onClick={onClose} className="px-4 py-2 border rounded">
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={loading || !selectedEmp}
            className="px-4 py-2 bg-blue-600 text-white rounded"
          >
            {loading ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}
