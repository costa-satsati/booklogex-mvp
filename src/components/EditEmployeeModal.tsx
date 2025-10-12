'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import type { Employee, EmploymentType, PayFrequency } from '@/types/employee';
import { validateEmployeeForm, type EmployeeFormErrors } from '@/lib/validateEmployeeForm';

export default function EditEmployeeModal({
  employee,
  onClose,
  onUpdated,
}: {
  employee: Employee;
  onClose: () => void;
  onUpdated: () => void;
}) {
  const [form, setForm] = useState<Omit<Employee, 'id' | 'created_at' | 'org_id'>>({
    full_name: '',
    email: '',
    tfn: '',
    employment_type: 'full_time',
    base_salary: null,
    hourly_rate: null,
    pay_frequency: 'fortnightly',
    super_rate: 11.0,
    start_date: '',
    end_date: null,
    position: '',
    active: true,
  });

  const [errors, setErrors] = useState<EmployeeFormErrors>({});
  const [loading, setLoading] = useState(false);

  // Load existing employee into form
  useEffect(() => {
    if (employee) {
      setForm({
        full_name: employee.full_name || '',
        email: employee.email || '',
        tfn: employee.tfn || '',
        employment_type: employee.employment_type || 'full_time',
        base_salary: employee.base_salary,
        hourly_rate: employee.hourly_rate,
        pay_frequency: employee.pay_frequency || 'fortnightly',
        super_rate: employee.super_rate ?? 11.0,
        start_date: employee.start_date || '',
        end_date: employee.end_date || null,
        position: employee.position || '',
        active: employee.active ?? true,
      });
    }
  }, [employee]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    let parsedValue: string | number | boolean | null = value;
    if (type === 'number') parsedValue = value === '' ? null : parseFloat(value);
    setForm((prev) => ({ ...prev, [name]: parsedValue }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const validationErrors = validateEmployeeForm(form);
    setErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) {
      setLoading(false);
      return;
    }

    const updatePayload = {
      full_name: form.full_name,
      email: form.email || null,
      tfn: form.tfn || null,
      employment_type: form.employment_type as EmploymentType,
      base_salary: form.base_salary,
      hourly_rate: form.hourly_rate,
      pay_frequency: form.pay_frequency as PayFrequency,
      super_rate: form.super_rate,
      start_date: form.start_date || null,
      end_date: form.end_date || null,
      position: form.position || null,
      active: form.active,
    };

    const { error } = await supabase.from('employees').update(updatePayload).eq('id', employee.id);

    setLoading(false);

    if (error) {
      console.error('❌ Error updating employee:', error);
      alert('Error updating employee: ' + error.message);
    } else {
      onUpdated();
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <form
        onSubmit={handleSubmit}
        className="bg-white p-6 rounded-lg w-96 space-y-3 shadow-lg overflow-y-auto max-h-[90vh]"
      >
        <h2 className="text-lg font-semibold">Edit Employee</h2>

        {/* Full name */}
        <div>
          <input
            type="text"
            name="full_name"
            placeholder="Full Name"
            required
            value={form.full_name}
            onChange={handleChange}
            className={`w-full border rounded p-2 ${errors.full_name ? 'border-red-500' : ''}`}
          />
          {errors.full_name && <p className="text-red-500 text-xs mt-1">{errors.full_name}</p>}
        </div>

        {/* Email */}
        <div>
          <input
            type="email"
            name="email"
            placeholder="Email"
            value={form.email ?? ''}
            onChange={handleChange}
            className="w-full border rounded p-2"
          />
        </div>

        {/* TFN */}
        <div>
          <input
            type="text"
            name="tfn"
            placeholder="TFN (Tax File Number)"
            value={form.tfn ?? ''}
            onChange={handleChange}
            className="w-full border rounded p-2"
          />
        </div>

        {/* Employment Type / Pay Frequency */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <select
              name="employment_type"
              value={form.employment_type}
              onChange={handleChange}
              className={`border rounded p-2 w-full ${
                errors.employment_type ? 'border-red-500' : ''
              }`}
            >
              <option value="full_time">Full-time</option>
              <option value="part_time">Part-time</option>
              <option value="casual">Casual</option>
              <option value="contractor">Contractor</option>
            </select>
            {errors.employment_type && (
              <p className="text-red-500 text-xs mt-1">{errors.employment_type}</p>
            )}
          </div>

          <div>
            <select
              name="pay_frequency"
              value={form.pay_frequency}
              onChange={handleChange}
              className={`border rounded p-2 w-full ${
                errors.pay_frequency ? 'border-red-500' : ''
              }`}
            >
              <option value="weekly">Weekly</option>
              <option value="fortnightly">Fortnightly</option>
              <option value="monthly">Monthly</option>
            </select>
            {errors.pay_frequency && (
              <p className="text-red-500 text-xs mt-1">{errors.pay_frequency}</p>
            )}
          </div>
        </div>

        {/* Salary / Hourly Rate */}
        <div>
          <input
            type="number"
            name="base_salary"
            placeholder="Base Salary (AUD)"
            step="0.01"
            value={form.base_salary ?? ''}
            onChange={handleChange}
            className={`w-full border rounded p-2 ${errors.salary ? 'border-red-500' : ''}`}
          />
          <input
            type="number"
            name="hourly_rate"
            placeholder="Hourly Rate (AUD)"
            step="0.01"
            value={form.hourly_rate ?? ''}
            onChange={handleChange}
            className={`w-full border rounded p-2 mt-2 ${errors.salary ? 'border-red-500' : ''}`}
          />
          {errors.salary && <p className="text-red-500 text-xs mt-1">{errors.salary}</p>}
        </div>

        {/* Super rate */}
        <div>
          <input
            type="number"
            name="super_rate"
            placeholder="Super %"
            step="0.1"
            value={form.super_rate ?? ''}
            onChange={handleChange}
            className={`w-full border rounded p-2 ${errors.super_rate ? 'border-red-500' : ''}`}
          />
          {errors.super_rate && <p className="text-red-500 text-xs mt-1">{errors.super_rate}</p>}
        </div>

        {/* Start / End date */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <input
              type="date"
              name="start_date"
              value={form.start_date ?? ''}
              onChange={handleChange}
              className={`w-full border rounded p-2 ${errors.start_date ? 'border-red-500' : ''}`}
            />
            {errors.start_date && <p className="text-red-500 text-xs mt-1">{errors.start_date}</p>}
          </div>

          <div>
            <input
              type="date"
              name="end_date"
              value={form.end_date ?? ''}
              onChange={handleChange}
              className="w-full border rounded p-2"
            />
          </div>
        </div>

        {/* Active status toggle */}
        <div className="flex items-center gap-2 mt-2">
          <input
            type="checkbox"
            name="active"
            checked={!!form.active}
            onChange={(e) => setForm((prev) => ({ ...prev, active: e.target.checked }))}
          />
          <label htmlFor="active" className="text-sm text-gray-700">
            Active employee
          </label>
        </div>

        {/* Buttons */}
        <div className="flex justify-end gap-2 mt-4">
          <button type="button" onClick={onClose} className="px-4 py-2 border rounded">
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded"
          >
            {loading ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  );
}
