// src/components/EditEmployeeModal.tsx (FIXED BACKGROUND)
'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { X, Loader2 } from 'lucide-react';
import { notify } from '@/lib/notify';
import type { Employee } from '@/types/employee';
import { validateTFN, validatePhone, formatTFN, formatPhone } from '@/lib/employee-utils';

type EditEmployeeModalProps = {
  employee: Employee;
  onClose: () => void;
  onUpdated: () => void;
};

export default function EditEmployeeModal({
  employee,
  onClose,
  onUpdated,
}: EditEmployeeModalProps) {
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formData, setFormData] = useState({
    full_name: employee.full_name,
    email: employee.email || '',
    phone: employee.phone || '',
    position: employee.position || '',
    base_salary: employee.base_salary || '',
    rate_type: employee.rate_type || 'annual',
    hours_per_week: employee.hours_per_week || 38,
    tfn: employee.tfn || '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    const newErrors: Record<string, string> = {};

    if (!formData.full_name.trim()) {
      newErrors.full_name = 'Name is required';
    }

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email format';
    }

    if (formData.phone && !validatePhone(formData.phone)) {
      newErrors.phone = 'Invalid Australian phone number';
    }

    if (formData.tfn && !validateTFN(formData.tfn)) {
      newErrors.tfn = 'Invalid TFN';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from('employees')
        .update({
          full_name: formData.full_name.trim(),
          email: formData.email.trim() || null,
          phone: formData.phone.trim() || null,
          position: formData.position.trim() || null,
          base_salary: formData.base_salary || null,
          rate_type: formData.rate_type,
          hours_per_week: formData.hours_per_week,
          tfn: formData.tfn ? formData.tfn.replace(/[\s-]/g, '') : null,
        })
        .eq('id', employee.id);

      if (error) throw error;

      notify.success('Updated', 'Employee details updated successfully');
      onUpdated();
    } catch (error) {
      console.error('Error updating employee:', error);
      notify.error('Error', 'Failed to update employee');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop - Fixed from black to gray */}
      <div className="absolute inset-0 bg-gray-900/50 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in duration-200">
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">Edit Employee</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
            <Input
              value={formData.full_name}
              onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
              className={errors.full_name ? 'border-red-500' : ''}
            />
            {errors.full_name && <p className="text-xs text-red-600 mt-1">{errors.full_name}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <Input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className={errors.email ? 'border-red-500' : ''}
            />
            {errors.email && <p className="text-xs text-red-600 mt-1">{errors.email}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
            <Input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              onBlur={(e) => {
                if (e.target.value && validatePhone(e.target.value)) {
                  setFormData({ ...formData, phone: formatPhone(e.target.value) });
                }
              }}
              className={errors.phone ? 'border-red-500' : ''}
            />
            {errors.phone && <p className="text-xs text-red-600 mt-1">{errors.phone}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Position</label>
            <Input
              value={formData.position}
              onChange={(e) => setFormData({ ...formData, position: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Pay Rate Type</label>
            <select
              value={formData.rate_type}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                setFormData({
                  ...formData,
                  rate_type: e.target.value as 'hourly' | 'daily' | 'annual',
                })
              }
              className="w-full border rounded-lg px-3 py-2"
            >
              <option value="hourly">Hourly</option>
              <option value="daily">Daily</option>
              <option value="annual">Annual</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Base Salary/Rate</label>
            <Input
              type="number"
              step="0.01"
              value={formData.base_salary}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setFormData({ ...formData, base_salary: parseFloat(e.target.value) || 0 })
              }
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Hours per Week</label>
            <Input
              type="number"
              step="0.5"
              value={formData.hours_per_week}
              onChange={(e) =>
                setFormData({ ...formData, hours_per_week: parseFloat(e.target.value) || 38 })
              }
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">TFN</label>
            <Input
              value={formData.tfn}
              onChange={(e) => setFormData({ ...formData, tfn: e.target.value })}
              onBlur={(e) => {
                if (e.target.value && validateTFN(e.target.value)) {
                  setFormData({ ...formData, tfn: formatTFN(e.target.value) });
                }
              }}
              maxLength={11}
              className={errors.tfn ? 'border-red-500' : ''}
            />
            {errors.tfn && <p className="text-xs text-red-600 mt-1">{errors.tfn}</p>}
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={saving}
              className="flex-1 bg-blue-600 hover:bg-blue-700"
            >
              {saving ? (
                <>
                  <Loader2 size={16} className="mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
