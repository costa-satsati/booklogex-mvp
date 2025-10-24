// src/components/EditEmployeeDrawer.tsx
'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { X, Loader2, Save } from 'lucide-react';
import { notify } from '@/lib/notify';
import type { Employee } from '@/types/employee';

type EditTab = 'personal' | 'employment' | 'pay' | 'bank' | 'tax';

type EditEmployeeDrawerProps = {
  employee: Employee;
  onClose: () => void;
  onUpdated: () => void;
};

// Form uses first_name and last_name for UX, but we send full_name to DB
type FormData = Partial<Omit<Employee, 'first_name' | 'last_name' | 'full_name'>> & {
  first_name: string;
  last_name: string;
};

export default function EditEmployeeDrawer({
  employee,
  onClose,
  onUpdated,
}: EditEmployeeDrawerProps) {
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<EditTab>('personal');
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Split full_name into first_name and last_name on mount for form UX
  const [formData, setFormData] = useState<FormData>(() => {
    const nameParts = (employee.full_name || '').split(' ');
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || '';

    return {
      ...employee,
      first_name: firstName,
      last_name: lastName,
    };
  });

  const tabs: { id: EditTab; label: string }[] = [
    { id: 'personal', label: 'Personal' },
    { id: 'employment', label: 'Employment' },
    { id: 'pay', label: 'Pay & Hours' },
    { id: 'bank', label: 'Bank & Super' },
    { id: 'tax', label: 'Tax' },
  ];

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.first_name?.trim()) {
      newErrors.first_name = 'First name is required';
    }

    if (!formData.last_name?.trim()) {
      newErrors.last_name = 'Last name is required';
    }

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email format';
    }

    if (formData.phone && !/^(\+?61|0)[2-478]( ?\d){8}$/.test(formData.phone.replace(/\s/g, ''))) {
      newErrors.phone = 'Invalid Australian phone number';
    }

    if (formData.tfn && formData.tfn.replace(/[\s-]/g, '').length !== 9) {
      newErrors.tfn = 'TFN must be 9 digits';
    }

    if (formData.bank_bsb && !/^\d{3}-?\d{3}$/.test(formData.bank_bsb)) {
      newErrors.bank_bsb = 'BSB must be 6 digits (e.g., 063-000)';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      notify.error('Validation Error', 'Please fix the errors before saving');
      return;
    }

    setSaving(true);
    try {
      // Build full_name from first and last name for the database
      // The DB will auto-generate first_name and last_name columns from full_name
      const full_name = `${formData.first_name.trim()} ${formData.last_name.trim()}`.trim();

      // Remove first_name and last_name from formData as they're generated columns
      const { first_name, last_name, ...restFormData } = formData;

      // Clean up data
      const updateData = {
        ...restFormData,
        full_name, // Only send full_name, DB generates first_name/last_name
        tfn: formData.tfn ? formData.tfn.replace(/[\s-]/g, '') : null,
        bank_bsb: formData.bank_bsb ? formData.bank_bsb.replace(/-/g, '') : null,
        phone: formData.phone ? formData.phone.replace(/\s/g, '') : null,
        // Ensure empty strings become null
        email: formData.email || null,
        address: formData.address || null,
        position: formData.position || null,
        department: formData.department || null,
        super_fund: formData.super_fund || null,
        super_member_number: formData.super_member_number || null,
        bank_account: formData.bank_account || null,
        abn: formData.abn || null,
        notes: formData.notes || null,
        // Convert empty date strings to null
        date_of_birth: formData.date_of_birth || null,
        start_date: formData.start_date || null,
        end_date: formData.end_date || null,
      };

      const { error } = await supabase.from('employees').update(updateData).eq('id', employee.id);

      if (error) throw error;

      notify.success('Saved', 'Employee updated successfully');
      onUpdated();
    } catch (error) {
      console.error('Error updating employee:', error);
      notify.error('Error', 'Failed to update employee');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-gray-900/50 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-white max-w-4xl w-full mx-4 max-h-[85vh] flex flex-col shadow-2xl rounded-lg animate-in fade-in zoom-in-95 duration-300">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b bg-white rounded-t-lg">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Edit Employee</h2>
            <p className="text-sm text-gray-600 mt-0.5">{employee.full_name}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X size={24} />
          </button>
        </div>

        {/* Tabs */}
        <div className="border-b overflow-x-auto bg-white">
          <div className="flex px-6">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-3 font-medium text-sm whitespace-nowrap border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
          <div className="p-6">
            {activeTab === 'personal' && (
              <PersonalTab formData={formData} setFormData={setFormData} errors={errors} />
            )}
            {activeTab === 'employment' && (
              <EmploymentTab formData={formData} setFormData={setFormData} />
            )}
            {activeTab === 'pay' && <PayTab formData={formData} setFormData={setFormData} />}
            {activeTab === 'bank' && (
              <BankSuperTab formData={formData} setFormData={setFormData} errors={errors} />
            )}
            {activeTab === 'tax' && (
              <TaxTab formData={formData} setFormData={setFormData} errors={errors} />
            )}
          </div>
        </form>

        {/* Footer */}
        <div className="flex gap-3 px-6 py-4 border-t bg-white rounded-b-lg">
          <Button type="button" variant="outline" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button
            type="submit"
            onClick={handleSubmit}
            disabled={saving}
            className="flex-1 bg-blue-600 hover:bg-blue-700"
          >
            {saving ? (
              <>
                <Loader2 size={16} className="mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save size={16} className="mr-2" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

// Personal Tab
function PersonalTab({
  formData,
  setFormData,
  errors,
}: {
  formData: FormData;
  setFormData: (data: FormData) => void;
  errors: Record<string, string>;
}) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            First Name <span className="text-red-500">*</span>
          </label>
          <Input
            value={formData.first_name}
            onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
            className={errors.first_name ? 'border-red-500' : ''}
          />
          {errors.first_name && <p className="text-xs text-red-600 mt-1">{errors.first_name}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Last Name <span className="text-red-500">*</span>
          </label>
          <Input
            value={formData.last_name}
            onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
            className={errors.last_name ? 'border-red-500' : ''}
          />
          {errors.last_name && <p className="text-xs text-red-600 mt-1">{errors.last_name}</p>}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
        <Input
          type="email"
          value={formData.email || ''}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          className={errors.email ? 'border-red-500' : ''}
        />
        {errors.email && <p className="text-xs text-red-600 mt-1">{errors.email}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
        <Input
          value={formData.phone || ''}
          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
          className={errors.phone ? 'border-red-500' : ''}
        />
        {errors.phone && <p className="text-xs text-red-600 mt-1">{errors.phone}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
        <Input
          value={formData.address || ''}
          onChange={(e) => setFormData({ ...formData, address: e.target.value })}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Date of Birth</label>
        <Input
          type="date"
          value={formData.date_of_birth || ''}
          onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })}
        />
      </div>
    </div>
  );
}

// Employment Tab
function EmploymentTab({
  formData,
  setFormData,
}: {
  formData: FormData;
  setFormData: (data: FormData) => void;
}) {
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Position</label>
        <Input
          value={formData.position || ''}
          onChange={(e) => setFormData({ ...formData, position: e.target.value })}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Employment Type</label>
        <select
          value={formData.employment_type || 'full_time'}
          onChange={(e) =>
            setFormData({
              ...formData,
              employment_type: e.target.value as
                | 'full_time'
                | 'part_time'
                | 'casual'
                | 'contractor',
            })
          }
          className="w-full border rounded-lg px-3 py-2"
        >
          <option value="full_time">Full-time</option>
          <option value="part_time">Part-time</option>
          <option value="casual">Casual</option>
          <option value="contractor">Contractor</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
        <Input
          value={formData.department || ''}
          onChange={(e) => setFormData({ ...formData, department: e.target.value })}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
        <Input
          type="date"
          value={formData.start_date || ''}
          onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
        <Input
          type="date"
          value={formData.end_date || ''}
          onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
        />
        <p className="text-xs text-gray-500 mt-1">Leave empty if still employed</p>
      </div>

      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="active"
          checked={formData.active ?? true}
          onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
          className="w-6 h-6"
        />
        <label htmlFor="active" className="text-sm text-gray-700">
          Active employee
        </label>
      </div>
    </div>
  );
}

// Pay Tab - FIXED VERSION WITH CONDITIONAL RENDERING
function PayTab({
  formData,
  setFormData,
}: {
  formData: FormData;
  setFormData: (data: FormData) => void;
}) {
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Rate Type</label>
        <select
          value={formData.rate_type || 'annual'}
          onChange={(e) => {
            const newRateType = e.target.value as 'hourly' | 'daily' | 'annual';
            setFormData({
              ...formData,
              rate_type: newRateType,
              // Clear the other rate fields when switching types
              base_salary: undefined,
              hourly_rate: undefined,
            });
          }}
          className="w-full border rounded-lg px-3 py-2"
        >
          <option value="annual">Annual Salary</option>
          <option value="hourly">Hourly Rate</option>
          <option value="daily">Daily Rate</option>
        </select>
      </div>

      {/* Conditional rendering based on rate_type */}
      {formData.rate_type === 'annual' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Annual Salary</label>
          <Input
            type="number"
            step="0.01"
            value={formData.base_salary || ''}
            onChange={(e) =>
              setFormData({ ...formData, base_salary: parseFloat(e.target.value) || undefined })
            }
            placeholder="85000"
          />
          <p className="text-xs text-gray-500 mt-1">Annual salary before tax</p>
        </div>
      )}

      {formData.rate_type === 'hourly' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Hourly Rate</label>
          <Input
            type="number"
            step="0.01"
            value={formData.hourly_rate || ''}
            onChange={(e) =>
              setFormData({ ...formData, hourly_rate: parseFloat(e.target.value) || undefined })
            }
            placeholder="45.50"
          />
          <p className="text-xs text-gray-500 mt-1">Per hour rate before tax</p>
        </div>
      )}

      {formData.rate_type === 'daily' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Daily Rate</label>
          <Input
            type="number"
            step="0.01"
            value={formData.base_salary || ''}
            onChange={(e) =>
              setFormData({ ...formData, base_salary: parseFloat(e.target.value) || undefined })
            }
            placeholder="350.00"
          />
          <p className="text-xs text-gray-500 mt-1">Per day rate before tax</p>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Hours per Week</label>
        <Input
          type="number"
          step="0.5"
          value={formData.hours_per_week || 38}
          onChange={(e) =>
            setFormData({ ...formData, hours_per_week: parseFloat(e.target.value) || 38 })
          }
        />
        <p className="text-xs text-gray-500 mt-1">Default: 38 hours for full-time</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Pay Frequency</label>
        <select
          value={formData.pay_frequency || 'fortnightly'}
          onChange={(e) =>
            setFormData({
              ...formData,
              pay_frequency: e.target.value as 'weekly' | 'fortnightly' | 'monthly',
            })
          }
          className="w-full border rounded-lg px-3 py-2"
        >
          <option value="weekly">Weekly</option>
          <option value="fortnightly">Fortnightly</option>
          <option value="monthly">Monthly</option>
        </select>
      </div>
    </div>
  );
}

// Bank & Super Tab
function BankSuperTab({
  formData,
  setFormData,
  errors,
}: {
  formData: FormData;
  setFormData: (data: FormData) => void;
  errors: Record<string, string>;
}) {
  return (
    <div className="space-y-4">
      <div>
        <h4 className="font-medium text-gray-900 mb-3">Banking Details</h4>

        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">BSB</label>
            <Input
              value={formData.bank_bsb || ''}
              onChange={(e) => setFormData({ ...formData, bank_bsb: e.target.value })}
              placeholder="063-000"
              maxLength={7}
              className={errors.bank_bsb ? 'border-red-500' : ''}
            />
            {errors.bank_bsb && <p className="text-xs text-red-600 mt-1">{errors.bank_bsb}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Account Number</label>
            <Input
              value={formData.bank_account || ''}
              onChange={(e) => setFormData({ ...formData, bank_account: e.target.value })}
              maxLength={10}
            />
          </div>
        </div>
      </div>

      <div className="border-t pt-4 mt-6">
        <h4 className="font-medium text-gray-900 mb-3">Superannuation</h4>

        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Super Fund</label>
            <Input
              value={formData.super_fund || ''}
              onChange={(e) => setFormData({ ...formData, super_fund: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Member Number</label>
            <Input
              value={formData.super_member_number || ''}
              onChange={(e) => setFormData({ ...formData, super_member_number: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Super Rate (%)</label>
            <Input
              type="number"
              step="0.5"
              value={formData.super_rate || 11.5}
              onChange={(e) =>
                setFormData({ ...formData, super_rate: parseFloat(e.target.value) || 11.5 })
              }
            />
            <p className="text-xs text-gray-500 mt-1">Default: 11.5% (current SG rate)</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// Tax Tab
function TaxTab({
  formData,
  setFormData,
  errors,
}: {
  formData: FormData;
  setFormData: (data: FormData) => void;
  errors: Record<string, string>;
}) {
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Tax File Number (TFN)
        </label>
        <Input
          value={formData.tfn || ''}
          onChange={(e) => setFormData({ ...formData, tfn: e.target.value })}
          maxLength={11}
          className={errors.tfn ? 'border-red-500' : ''}
        />
        {errors.tfn && <p className="text-xs text-red-600 mt-1">{errors.tfn}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          ABN (for contractors)
        </label>
        <Input
          value={formData.abn || ''}
          onChange={(e) => setFormData({ ...formData, abn: e.target.value })}
          maxLength={14}
        />
      </div>

      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="tax_free_threshold"
          checked={formData.tax_free_threshold ?? true}
          onChange={(e) => setFormData({ ...formData, tax_free_threshold: e.target.checked })}
          className="w-6 h-6"
        />
        <label htmlFor="tax_free_threshold" className="text-sm text-gray-700">
          Claims tax-free threshold
        </label>
      </div>

      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="help_debt"
          checked={formData.help_debt ?? false}
          onChange={(e) => setFormData({ ...formData, help_debt: e.target.checked })}
          className="w-6 h-6"
        />
        <label htmlFor="help_debt" className="text-sm text-gray-700">
          Has HELP/HECS debt
        </label>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Country Code</label>
        <Input
          value={formData.country_code || 'AU'}
          onChange={(e) => setFormData({ ...formData, country_code: e.target.value })}
          maxLength={2}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Tax Scale Type</label>
        <select
          value={formData.tax_scale_type || 'regular'}
          onChange={(e) => setFormData({ ...formData, tax_scale_type: e.target.value })}
          className="w-full border rounded-lg px-3 py-2"
        >
          <option value="regular">Regular</option>
          <option value="working_holiday_maker">Working Holiday Maker</option>
          <option value="foreign_resident">Foreign Resident</option>
        </select>
      </div>
    </div>
  );
}
