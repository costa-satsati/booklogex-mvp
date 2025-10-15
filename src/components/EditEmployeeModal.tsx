'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import type { Employee, EmploymentType, PayFrequency } from '@/types/employee';
import { notify } from '@/lib/notify';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2, X, ChevronRight, CheckCircle2 } from 'lucide-react';

interface EditEmployeeModalProps {
  employee: Employee;
  onClose: () => void;
  onUpdated: () => void;
}

export default function EditEmployeeModal({
  employee,
  onClose,
  onUpdated,
}: EditEmployeeModalProps) {
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<Partial<Employee>>({});

  useEffect(() => {
    setFormData(employee);
    setStep(1);
  }, [employee]);

  const updateField = <K extends keyof Employee>(field: K, value: Employee[K]) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const canContinueStep1 = formData.full_name && formData.email;
  const canContinueStep2 = formData.position && formData.employment_type && formData.start_date;
  const canContinueStep3 = formData.pay_frequency && (formData.base_salary || formData.hourly_rate);

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('employees')
        .update({
          full_name: formData.full_name,
          email: formData.email,
          phone: formData.phone,
          address: formData.address,
          date_of_birth: formData.date_of_birth,
          position: formData.position,
          employment_type: formData.employment_type,
          start_date: formData.start_date,
          department: formData.department,
          pay_frequency: formData.pay_frequency,
          base_salary: formData.base_salary,
          hourly_rate: formData.hourly_rate,
          tfn: formData.tfn,
          tax_free_threshold: formData.tax_free_threshold,
          help_debt: formData.help_debt,
          super_rate: formData.super_rate,
          super_fund: formData.super_fund,
          super_member_number: formData.super_member_number,
          bank_bsb: formData.bank_bsb,
          bank_account: formData.bank_account,
          notes: formData.notes,
        })
        .eq('id', employee.id);

      if (error) throw error;

      notify.success('Success', 'Employee updated successfully');
      onUpdated();
    } catch (error) {
      console.error('Error updating employee:', error);
      notify.error('Error', 'Failed to update employee');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between z-10">
          <h2 className="text-2xl font-bold text-gray-900">Edit Employee</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X size={24} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Progress Steps */}
          <div className="bg-gray-50 border rounded-lg p-6">
            <div className="flex items-center justify-between">
              {[
                { num: 1, label: 'Personal' },
                { num: 2, label: 'Employment' },
                { num: 3, label: 'Payment' },
                { num: 4, label: 'Review' },
              ].map((s, idx, arr) => (
                <React.Fragment key={s.num}>
                  <div className="flex flex-col items-center">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center font-bold transition-colors ${
                        s.num === step
                          ? 'bg-blue-600 text-white'
                          : s.num < step
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {s.num < step ? '✓' : s.num}
                    </div>
                    <div className="text-xs font-medium text-gray-700 mt-2">{s.label}</div>
                  </div>
                  {idx < arr.length - 1 && (
                    <div
                      className={`flex-1 h-1 mx-2 rounded transition-colors ${
                        s.num < step ? 'bg-green-200' : 'bg-gray-200'
                      }`}
                    ></div>
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>

          {/* Step 1: Personal Info */}
          {step === 1 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">Personal Information</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    First Name *
                  </label>
                  <Input
                    type="text"
                    value={formData.full_name?.split(' ')[0] || ''}
                    onChange={(e) => {
                      const firstName = e.target.value;
                      const lastName = formData.full_name?.split(' ').slice(1).join(' ') || '';
                      updateField('full_name', `${firstName} ${lastName}`.trim());
                    }}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Last Name *
                  </label>
                  <Input
                    type="text"
                    value={formData.full_name?.split(' ').slice(1).join(' ') || ''}
                    onChange={(e) => {
                      const firstName = formData.full_name?.split(' ')[0] || '';
                      const lastName = e.target.value;
                      updateField('full_name', `${firstName} ${lastName}`.trim());
                    }}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                <Input
                  type="email"
                  value={formData.email || ''}
                  onChange={(e) => updateField('email', e.target.value)}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                <Input
                  type="tel"
                  value={formData.phone || ''}
                  onChange={(e) => updateField('phone', e.target.value)}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                <Input
                  type="text"
                  value={formData.address || ''}
                  onChange={(e) => updateField('address', e.target.value)}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date of Birth
                </label>
                <Input
                  type="date"
                  value={formData.date_of_birth || ''}
                  onChange={(e) => updateField('date_of_birth', e.target.value)}
                />
              </div>

              <Button
                onClick={() => setStep(2)}
                disabled={!canContinueStep1}
                className="w-full bg-blue-600 hover:bg-blue-700"
              >
                Continue to Employment Details
                <ChevronRight size={18} className="ml-2" />
              </Button>
            </div>
          )}

          {/* Step 2: Employment */}
          {step === 2 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">Employment Details</h3>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Position/Title *
                </label>
                <Input
                  type="text"
                  value={formData.position || ''}
                  onChange={(e) => updateField('position', e.target.value)}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Employment Type *
                </label>
                <select
                  value={formData.employment_type || 'full_time'}
                  onChange={(e) => updateField('employment_type', e.target.value as EmploymentType)}
                  className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="full_time">Full-time</option>
                  <option value="part_time">Part-time</option>
                  <option value="casual">Casual</option>
                  <option value="contractor">Contractor</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Start Date *</label>
                <Input
                  type="date"
                  value={formData.start_date || ''}
                  onChange={(e) => updateField('start_date', e.target.value)}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
                <Input
                  type="text"
                  value={formData.department || ''}
                  onChange={(e) => updateField('department', e.target.value)}
                />
              </div>

              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setStep(1)} className="flex-1">
                  Back
                </Button>
                <Button
                  onClick={() => setStep(3)}
                  disabled={!canContinueStep2}
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
                >
                  Continue to Payment
                  <ChevronRight size={18} className="ml-2" />
                </Button>
              </div>
            </div>
          )}

          {/* Step 3: Payment */}
          {step === 3 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">Payment & Tax Details</h3>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Pay Frequency *
                </label>
                <select
                  value={formData.pay_frequency || 'fortnightly'}
                  onChange={(e) => updateField('pay_frequency', e.target.value as PayFrequency)}
                  className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="fortnightly">Fortnightly</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Annual Salary
                  </label>
                  <Input
                    type="number"
                    value={formData.base_salary || ''}
                    onChange={(e) =>
                      updateField(
                        'base_salary',
                        e.target.value ? parseFloat(e.target.value) : undefined
                      )
                    }
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Hourly Rate
                  </label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.hourly_rate || ''}
                    onChange={(e) =>
                      updateField(
                        'hourly_rate',
                        e.target.value ? parseFloat(e.target.value) : undefined
                      )
                    }
                  />
                </div>
              </div>

              <div className="p-3 bg-blue-50 border border-blue-200 rounded text-xs text-blue-800">
                💡 Provide either annual salary OR hourly rate, not both
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tax File Number (TFN)
                </label>
                <Input
                  type="text"
                  value={formData.tfn || ''}
                  onChange={(e) => updateField('tfn', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <label className="flex items-center gap-2 p-3 bg-gray-50 rounded cursor-pointer hover:bg-gray-100">
                  <input
                    type="checkbox"
                    checked={formData.tax_free_threshold || false}
                    onChange={(e) => updateField('tax_free_threshold', e.target.checked)}
                    className="w-4 h-4"
                  />
                  <span className="text-sm text-gray-900">Employee claims tax-free threshold</span>
                </label>

                <label className="flex items-center gap-2 p-3 bg-gray-50 rounded cursor-pointer hover:bg-gray-100">
                  <input
                    type="checkbox"
                    checked={formData.help_debt || false}
                    onChange={(e) => updateField('help_debt', e.target.checked)}
                    className="w-4 h-4"
                  />
                  <span className="text-sm text-gray-900">Employee has HELP/HECS debt</span>
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Superannuation Rate (%)
                </label>
                <Input
                  type="number"
                  step="0.1"
                  value={formData.super_rate || 11.5}
                  onChange={(e) => updateField('super_rate', parseFloat(e.target.value))}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Super Fund</label>
                <select
                  value={formData.super_fund || ''}
                  onChange={(e) => updateField('super_fund', e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select super fund</option>
                  <option value="AustralianSuper">AustralianSuper</option>
                  <option value="REST Super">REST Super</option>
                  <option value="Hostplus">Hostplus</option>
                  <option value="Sunsuper">Sunsuper</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Super Member Number
                </label>
                <Input
                  type="text"
                  value={formData.super_member_number || ''}
                  onChange={(e) => updateField('super_member_number', e.target.value)}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Bank BSB</label>
                  <Input
                    type="text"
                    value={formData.bank_bsb || ''}
                    onChange={(e) => updateField('bank_bsb', e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Account Number
                  </label>
                  <Input
                    type="text"
                    value={formData.bank_account || ''}
                    onChange={(e) => updateField('bank_account', e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea
                  value={formData.notes || ''}
                  onChange={(e) => updateField('notes', e.target.value)}
                  rows={3}
                  className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Add any additional notes about this employee..."
                />
              </div>

              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setStep(2)} className="flex-1">
                  Back
                </Button>
                <Button
                  onClick={() => setStep(4)}
                  disabled={!canContinueStep3}
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
                >
                  Review Changes
                  <ChevronRight size={18} className="ml-2" />
                </Button>
              </div>
            </div>
          )}

          {/* Step 4: Review */}
          {step === 4 && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-900">Review Changes</h3>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-center gap-3">
                <CheckCircle2 className="text-blue-600" size={24} />
                <div>
                  <div className="font-medium text-blue-900">Ready to save</div>
                  <div className="text-sm text-blue-700">
                    Review the changes below before updating
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="p-4 border rounded-lg">
                  <div className="text-sm text-gray-600 mb-1">Employee Name</div>
                  <div className="font-semibold text-gray-900">{formData.full_name}</div>
                </div>

                <div className="p-4 border rounded-lg">
                  <div className="text-sm text-gray-600 mb-1">Email</div>
                  <div className="font-semibold text-gray-900">{formData.email}</div>
                </div>

                {(formData.phone || formData.address) && (
                  <div className="grid grid-cols-2 gap-3">
                    {formData.phone && (
                      <div className="p-4 border rounded-lg">
                        <div className="text-sm text-gray-600 mb-1">Phone</div>
                        <div className="font-semibold text-gray-900">{formData.phone}</div>
                      </div>
                    )}
                    {formData.address && (
                      <div className="p-4 border rounded-lg">
                        <div className="text-sm text-gray-600 mb-1">Address</div>
                        <div className="font-semibold text-gray-900 text-sm">
                          {formData.address}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div className="p-4 border rounded-lg">
                    <div className="text-sm text-gray-600 mb-1">Position</div>
                    <div className="font-semibold text-gray-900">{formData.position}</div>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <div className="text-sm text-gray-600 mb-1">Employment Type</div>
                    <div className="font-semibold text-gray-900 capitalize">
                      {formData.employment_type?.replace('_', ' ')}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="p-4 border rounded-lg">
                    <div className="text-sm text-gray-600 mb-1">
                      {formData.base_salary ? 'Annual Salary' : 'Hourly Rate'}
                    </div>
                    <div className="font-semibold text-gray-900">
                      {formData.base_salary
                        ? `$${formData.base_salary.toLocaleString()}`
                        : formData.hourly_rate
                          ? `$${formData.hourly_rate}/hr`
                          : 'Not set'}
                    </div>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <div className="text-sm text-gray-600 mb-1">Pay Frequency</div>
                    <div className="font-semibold text-gray-900 capitalize">
                      {formData.pay_frequency}
                    </div>
                  </div>
                </div>

                <div className="p-4 border rounded-lg">
                  <div className="text-sm text-gray-600 mb-1">Tax & Super</div>
                  <div className="text-sm space-y-1">
                    <div>TFN: {formData.tfn || 'Not provided'}</div>
                    <div>Tax-free threshold: {formData.tax_free_threshold ? 'Yes' : 'No'}</div>
                    <div>HELP debt: {formData.help_debt ? 'Yes' : 'No'}</div>
                    <div>Super rate: {formData.super_rate}%</div>
                    {formData.super_fund && <div>Super fund: {formData.super_fund}</div>}
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setStep(3)}
                  disabled={saving}
                  className="flex-1"
                >
                  Back
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                >
                  {saving ? (
                    <>
                      <Loader2 size={18} className="mr-2 animate-spin" />
                      Saving Changes...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={18} className="mr-2" />
                      Save Changes
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
