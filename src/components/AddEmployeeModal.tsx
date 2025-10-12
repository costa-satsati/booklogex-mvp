'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

type Employee = {
  id: string;
  full_name: string;
  employment_type: string;
  base_salary: number | null;
  hourly_rate: number | null;
  super_rate: number;
  pay_frequency: string;
};

export default function AddPayrollItemModal({
  runId,
  onClose,
  onAdded,
}: {
  runId: string;
  onClose: () => void;
  onAdded: () => void;
}) {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [hoursWorked, setHoursWorked] = useState<number>(76); // default fortnight
  const [loading, setLoading] = useState(false);

  // 🧭 Load employees
  useEffect(() => {
    const loadEmployees = async () => {
      const { data, error } = await supabase
        .from('employees')
        .select(
          'id, full_name, employment_type, base_salary, hourly_rate, super_rate, pay_frequency'
        )
        .eq('active', true)
        .order('full_name');
      if (!error && data) setEmployees(data);
    };
    loadEmployees();
  }, []);

  // ⚙️ Calculate payroll components
  const calculatePay = (emp: Employee) => {
    let gross = 0;

    if (emp.employment_type === 'full_time' && emp.base_salary) {
      const divisor =
        emp.pay_frequency === 'weekly' ? 52 : emp.pay_frequency === 'fortnightly' ? 26 : 12;
      gross = emp.base_salary / divisor;
    } else if (emp.hourly_rate) {
      gross = emp.hourly_rate * hoursWorked;
    }

    const tax = gross * 0.18; // placeholder PAYG
    const superAmt = gross * (emp.super_rate / 100);
    const net = gross - tax;

    return { gross, tax, superAmt, net };
  };

  const handleAdd = async () => {
    if (!selectedEmployee) {
      alert('Select an employee first.');
      return;
    }

    setLoading(true);

    const { gross, tax, superAmt, net } = calculatePay(selectedEmployee);

    const { error } = await supabase.from('payroll_items').insert([
      {
        payroll_run_id: runId,
        employee_id: selectedEmployee.id,
        gross,
        tax,
        super: superAmt,
        net,
      },
    ]);

    setLoading(false);

    if (error) {
      console.error('❌ Error adding payroll item:', error);
      alert('Error adding employee to payroll: ' + error.message);
    } else {
      onAdded();
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg w-[420px] space-y-4 shadow-lg">
        <h2 className="text-lg font-semibold">Add Employee to Pay Run</h2>

        <select
          className="w-full border rounded p-2"
          value={selectedEmployee?.id || ''}
          onChange={(e) => {
            const emp = employees.find((emp) => emp.id === e.target.value);
            setSelectedEmployee(emp || null);
          }}
        >
          <option value="">Select Employee</option>
          {employees.map((e) => (
            <option key={e.id} value={e.id}>
              {e.full_name} — {e.employment_type}
            </option>
          ))}
        </select>

        {selectedEmployee?.employment_type === 'casual' && (
          <div>
            <input
              type="number"
              min={0}
              name="hoursWorked"
              placeholder="Hours Worked"
              value={hoursWorked}
              onChange={(e) => setHoursWorked(Number(e.target.value))}
              className="w-full border rounded p-2"
            />
          </div>
        )}

        {selectedEmployee && (
          <div className="border rounded p-3 bg-gray-50 text-sm">
            {(() => {
              const { gross, tax, superAmt, net } = calculatePay(selectedEmployee);
              return (
                <ul className="space-y-1">
                  <li>
                    <strong>Gross:</strong>{' '}
                    {gross.toLocaleString('en-AU', { style: 'currency', currency: 'AUD' })}
                  </li>
                  <li>
                    <strong>Tax (PAYG est.):</strong>{' '}
                    {tax.toLocaleString('en-AU', { style: 'currency', currency: 'AUD' })}
                  </li>
                  <li>
                    <strong>Super:</strong>{' '}
                    {superAmt.toLocaleString('en-AU', { style: 'currency', currency: 'AUD' })}
                  </li>
                  <li>
                    <strong>Net:</strong>{' '}
                    {net.toLocaleString('en-AU', { style: 'currency', currency: 'AUD' })}
                  </li>
                </ul>
              );
            })()}
          </div>
        )}

        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 border rounded">
            Cancel
          </button>
          <button
            onClick={handleAdd}
            disabled={!selectedEmployee || loading}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            {loading ? 'Adding...' : 'Add'}
          </button>
        </div>
      </div>
    </div>
  );
}
