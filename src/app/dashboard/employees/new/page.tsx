// src/app/dashboard/employees/new/page.tsx (NEW FILE)
'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, ChevronRight, CheckCircle2, Loader2, AlertCircle } from 'lucide-react';
import { notify } from '@/lib/notify';

type EmployeeFormData = {
  // Personal
  full_name: string;
  email: string;
  phone?: string;
  address?: string;
  date_of_birth?: string;

  // Employment
  position: string;
  employment_type: 'full_time' | 'part_time' | 'casual' | 'contractor';
  start_date: string;
  department?: string;

  // Payment
  pay_frequency: 'weekly' | 'fortnightly' | 'monthly';
  base_salary?: number;
  hourly_rate?: number;
  tfn?: string;
  tax_free_threshold: boolean;
  help_debt: boolean;
  super_rate: number;
  super_fund?: string;
  super_member_number?: string;
  bank_bsb?: string;
  bank_account?: string;
};

export default function AddEmployeePage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<EmployeeFormData>({
    full_name: '',
    email: '',
    position: '',
    employment_type: 'full_time',
    start_date: '',
    pay_frequency: 'fortnightly',
    tax_free_threshold: true,
    help_debt: false,
    super_rate: 11.5,
  });

  const updateField = <K extends keyof EmployeeFormData>(field: K, value: EmployeeFormData[K]) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const canContinueStep1 = formData.full_name && formData.email;
  const canContinueStep2 = formData.position && formData.employment_type && formData.start_date;
  const canContinueStep3 = formData.pay_frequency && (formData.base_salary || formData.hourly_rate);

  const handleSubmit = async () => {
    setSaving(true);
    try {
      // Get org_id
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: org } = await supabase
        .from('organisations')
        .select('id')
        .limit(1)
        .maybeSingle();

      if (!org) throw new Error('Organization not found');

      // Insert employee
      const { data, error } = await supabase
        .from('employees')
        .insert([
          {
            org_id: org.id,
            full_name: formData.full_name,
            email: formData.email || null,
            position: formData.position || null,
            employment_type: formData.employment_type,
            start_date: formData.start_date || null,
            pay_frequency: formData.pay_frequency,
            base_salary: formData.base_salary || null,
            hourly_rate: formData.hourly_rate || null,
            tfn: formData.tfn || null,
            tax_free_threshold: formData.tax_free_threshold,
            help_debt: formData.help_debt,
            super_rate: formData.super_rate,
            active: true,
          },
        ])
        .select()
        .single();

      if (error) throw error;

      notify.success('Success', 'Employee added successfully');
      router.push(`/dashboard/employees/${data.id}`);
    } catch (error) {
      console.error('Error adding employee:', error);
      notify.error('Error', 'Failed to add employee');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="border-b pb-6">
          <Button
            variant="ghost"
            onClick={() => router.push('/dashboard/employees')}
            className="mb-4"
          >
            <ArrowLeft size={18} className="mr-2" />
            Back to Employees
          </Button>
          <h1 className="text-3xl font-bold text-gray-900">Add New Employee</h1>
          <p className="text-gray-600 mt-1">Takes less than 5 minutes</p>
        </div>

        {/* Progress Steps */}
        <div className="bg-white border rounded-lg p-6">
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
          <div className="bg-white border rounded-lg p-6 space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Personal Information</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">First Name *</label>
                <Input
                  type="text"
                  placeholder="Sarah"
                  value={formData.full_name.split(' ')[0] || ''}
                  onChange={(e) => {
                    const firstName = e.target.value;
                    const lastName = formData.full_name.split(' ').slice(1).join(' ');
                    updateField('full_name', `${firstName} ${lastName}`.trim());
                  }}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Last Name *</label>
                <Input
                  type="text"
                  placeholder="Johnson"
                  value={formData.full_name.split(' ').slice(1).join(' ') || ''}
                  onChange={(e) => {
                    const firstName = formData.full_name.split(' ')[0] || '';
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
                placeholder="sarah@example.com"
                value={formData.email}
                onChange={(e) => updateField('email', e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
              <Input
                type="tel"
                placeholder="0412 345 678"
                value={formData.phone || ''}
                onChange={(e) => updateField('phone', e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
              <Input
                type="text"
                placeholder="123 Collins St, Melbourne VIC 3000"
                value={formData.address || ''}
                onChange={(e) => updateField('address', e.target.value)}
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
          <div className="bg-white border rounded-lg p-6 space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Employment Details</h3>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Position/Title *
              </label>
              <Input
                type="text"
                placeholder="Senior Manager"
                value={formData.position}
                onChange={(e) => updateField('position', e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Employment Type *
              </label>
              <select
                value={formData.employment_type}
                onChange={(e) => updateField('employment_type', e.target.value)}
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
                value={formData.start_date}
                onChange={(e) => updateField('start_date', e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
              <Input
                type="text"
                placeholder="Operations"
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
          <div className="bg-white border rounded-lg p-6 space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Payment & Tax Details</h3>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Pay Frequency *
              </label>
              <select
                value={formData.pay_frequency}
                onChange={(e) => updateField('pay_frequency', e.target.value)}
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
                  placeholder="85000"
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
                <label className="block text-sm font-medium text-gray-700 mb-1">Hourly Rate</label>
                <Input
                  type="number"
                  placeholder="45"
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
                placeholder="123 456 789"
                value={formData.tfn || ''}
                onChange={(e) => updateField('tfn', e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <label className="flex items-center gap-2 p-3 bg-gray-50 rounded cursor-pointer hover:bg-gray-100">
                <input
                  type="checkbox"
                  checked={formData.tax_free_threshold}
                  onChange={(e) => updateField('tax_free_threshold', e.target.checked)}
                  className="w-4 h-4"
                />
                <span className="text-sm text-gray-900">Employee claims tax-free threshold</span>
              </label>

              <label className="flex items-center gap-2 p-3 bg-gray-50 rounded cursor-pointer hover:bg-gray-100">
                <input
                  type="checkbox"
                  checked={formData.help_debt}
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
                value={formData.super_rate}
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
                placeholder="12345678"
                value={formData.super_member_number || ''}
                onChange={(e) => updateField('super_member_number', e.target.value)}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Bank BSB</label>
                <Input
                  type="text"
                  placeholder="063-000"
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
                  placeholder="12345678"
                  value={formData.bank_account || ''}
                  onChange={(e) => updateField('bank_account', e.target.value)}
                />
              </div>
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
                Review & Confirm
                <ChevronRight size={18} className="ml-2" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 4: Review */}
        {step === 4 && (
          <div className="bg-white border rounded-lg p-6 space-y-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Review & Confirm</h3>

            <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3">
              <CheckCircle2 className="text-green-600" size={24} />
              <div>
                <div className="font-medium text-green-900">All details complete</div>
                <div className="text-sm text-green-700">Ready to add employee to your team</div>
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

              <div className="grid grid-cols-2 gap-3">
                <div className="p-4 border rounded-lg">
                  <div className="text-sm text-gray-600 mb-1">Position</div>
                  <div className="font-semibold text-gray-900">{formData.position}</div>
                </div>
                <div className="p-4 border rounded-lg">
                  <div className="text-sm text-gray-600 mb-1">Employment Type</div>
                  <div className="font-semibold text-gray-900 capitalize">
                    {formData.employment_type.replace('_', ' ')}
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
                      : `$${formData.hourly_rate}/hr`}
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
                  <div>Super rate: {formData.super_rate}%</div>
                </div>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="text-sm text-blue-900">
                <strong>What happens next?</strong> We&apos;ll add {formData.full_name} to your
                team. You can then include them in pay runs and track their employment details.
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
                onClick={handleSubmit}
                disabled={saving}
                className="flex-1 bg-green-600 hover:bg-green-700"
              >
                {saving ? (
                  <>
                    <Loader2 size={18} className="mr-2 animate-spin" />
                    Adding Employee...
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={18} className="mr-2" />
                    Add Employee
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
