// src/app/dashboard/employees/new/page.tsx
'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, ChevronRight, CheckCircle2, Loader2 } from 'lucide-react';
import { notify } from '@/lib/notify';
import { useOrgContext } from '@/context/OrgContext';
import {
  validateTFN,
  validatePhone,
  formatTFN,
  formatPhone,
  getDefaultHours,
  calculateHourlyRate,
} from '@/lib/employee-utils';

type RateType = 'hourly' | 'daily' | 'annual';

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
  rate_type: RateType;
  hours_per_week: number;

  // Tax
  tfn?: string;
  tax_free_threshold: boolean;
  help_debt: boolean;
  super_rate: number;

  // Super & Banking
  super_fund?: string;
  super_member_number?: string;
  bank_bsb?: string;
  bank_account?: string;
};

export default function AddEmployeePage() {
  const router = useRouter();
  const { organisation } = useOrgContext();

  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [formData, setFormData] = useState<EmployeeFormData>({
    full_name: '',
    email: '',
    position: '',
    employment_type: 'full_time',
    start_date: '',
    pay_frequency: 'fortnightly',
    rate_type: 'annual',
    hours_per_week: 38,
    tax_free_threshold: true,
    help_debt: false,
    super_rate: 11.5,
  });

  const updateField = <K extends keyof EmployeeFormData>(field: K, value: EmployeeFormData[K]) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error when field is updated
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  // Validation functions
  const validateStep1 = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.full_name.trim()) {
      newErrors.full_name = 'Name is required';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email format';
    }

    if (formData.phone && !validatePhone(formData.phone)) {
      newErrors.phone = 'Invalid Australian phone number';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateStep2 = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.position.trim()) {
      newErrors.position = 'Position is required';
    }

    if (!formData.start_date) {
      newErrors.start_date = 'Start date is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateStep3 = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.base_salary || formData.base_salary <= 0) {
      newErrors.base_salary = 'Rate is required';
    }

    if (formData.tfn && !validateTFN(formData.tfn)) {
      newErrors.tfn = 'Invalid TFN format or checksum';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Calculate derived values for display
  const calculatedHourlyRate = formData.base_salary
    ? calculateHourlyRate(formData.base_salary, formData.rate_type, formData.hours_per_week)
    : 0;

  const handleSubmit = async () => {
    if (!validateStep3()) return;
    if (!organisation?.id) {
      notify.error('Error', 'Organisation not found');
      return;
    }

    setSaving(true);
    try {
      const { data, error } = await supabase
        .from('employees')
        .insert([
          {
            org_id: organisation.id,
            full_name: formData.full_name.trim(),
            email: formData.email.trim() || null,
            phone: formData.phone?.trim() || null,
            address: formData.address?.trim() || null,
            date_of_birth: formData.date_of_birth || null,
            position: formData.position.trim() || null,
            employment_type: formData.employment_type,
            department: formData.department?.trim() || null,
            start_date: formData.start_date || null,
            pay_frequency: formData.pay_frequency,
            base_salary: formData.base_salary || null,
            rate_type: formData.rate_type,
            hours_per_week: formData.hours_per_week,
            tfn: formData.tfn?.replace(/[\s-]/g, '') || null,
            tax_free_threshold: formData.tax_free_threshold,
            help_debt: formData.help_debt,
            super_rate: formData.super_rate,
            super_fund: formData.super_fund?.trim() || null,
            super_member_number: formData.super_member_number?.trim() || null,
            bank_bsb: formData.bank_bsb?.trim() || null,
            bank_account: formData.bank_account?.trim() || null,
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
      notify.error('Error', error instanceof Error ? error.message : 'Failed to add employee');
    } finally {
      setSaving(false);
    }
  };

  // Auto-update hours when employment type changes
  const handleEmploymentTypeChange = (type: EmployeeFormData['employment_type']) => {
    updateField('employment_type', type);
    updateField('hours_per_week', getDefaultHours(type));
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
                  className={errors.full_name ? 'border-red-500' : ''}
                />
                {errors.full_name && (
                  <p className="text-xs text-red-600 mt-1">{errors.full_name}</p>
                )}
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
                className={errors.email ? 'border-red-500' : ''}
              />
              {errors.email && <p className="text-xs text-red-600 mt-1">{errors.email}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
              <Input
                type="tel"
                placeholder="0412 345 678"
                value={formData.phone || ''}
                onChange={(e) => updateField('phone', e.target.value)}
                onBlur={(e) => {
                  // Auto-format on blur
                  if (e.target.value && validatePhone(e.target.value)) {
                    updateField('phone', formatPhone(e.target.value));
                  }
                }}
                className={errors.phone ? 'border-red-500' : ''}
              />
              {errors.phone && <p className="text-xs text-red-600 mt-1">{errors.phone}</p>}
              <p className="text-xs text-gray-500 mt-1">Format: 04XX XXX XXX or (0X) XXXX XXXX</p>
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
              onClick={() => {
                if (validateStep1()) setStep(2);
              }}
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
                className={errors.position ? 'border-red-500' : ''}
              />
              {errors.position && <p className="text-xs text-red-600 mt-1">{errors.position}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Employment Type *
              </label>
              <select
                value={formData.employment_type}
                onChange={(e) =>
                  handleEmploymentTypeChange(e.target.value as EmployeeFormData['employment_type'])
                }
                className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="full_time">Full-time</option>
                <option value="part_time">Part-time</option>
                <option value="casual">Casual</option>
                <option value="contractor">Contractor</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Expected Hours per Week *
              </label>
              <Input
                type="number"
                min="1"
                max="80"
                step="0.5"
                value={formData.hours_per_week}
                onChange={(e) => updateField('hours_per_week', parseFloat(e.target.value) || 38)}
              />
              <p className="text-xs text-gray-500 mt-1">
                Full-time: 38 hours, Part-time: 20-30 hours, Casual: varies
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Start Date *</label>
              <Input
                type="date"
                value={formData.start_date}
                onChange={(e) => updateField('start_date', e.target.value)}
                className={errors.start_date ? 'border-red-500' : ''}
              />
              {errors.start_date && (
                <p className="text-xs text-red-600 mt-1">{errors.start_date}</p>
              )}
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
                onClick={() => {
                  if (validateStep2()) setStep(3);
                }}
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
                onChange={(e) =>
                  updateField('pay_frequency', e.target.value as EmployeeFormData['pay_frequency'])
                }
                className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="fortnightly">Fortnightly</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>

            {/* Simplified Rate Entry */}
            <div className="space-y-3">
              <label className="block text-sm font-medium text-gray-700">Pay Rate *</label>

              <div className="grid grid-cols-3 gap-2">
                {(['hourly', 'daily', 'annual'] as RateType[]).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => updateField('rate_type', type)}
                    className={`p-3 border-2 rounded-lg text-sm font-medium transition-all ${
                      formData.rate_type === type
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    {type === 'hourly' && 'Hourly'}
                    {type === 'daily' && 'Daily'}
                    {type === 'annual' && 'Annual'}
                  </button>
                ))}
              </div>

              <div>
                <Input
                  type="number"
                  placeholder={
                    formData.rate_type === 'hourly'
                      ? '45.00'
                      : formData.rate_type === 'daily'
                        ? '360.00'
                        : '85000'
                  }
                  step={formData.rate_type === 'annual' ? '1000' : '0.01'}
                  value={formData.base_salary || ''}
                  onChange={(e) =>
                    updateField(
                      'base_salary',
                      e.target.value ? parseFloat(e.target.value) : undefined
                    )
                  }
                  className={errors.base_salary ? 'border-red-500' : ''}
                />
                {errors.base_salary && (
                  <p className="text-xs text-red-600 mt-1">{errors.base_salary}</p>
                )}
              </div>

              {/* Calculated Rates Display */}
              {formData.base_salary && formData.base_salary > 0 && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-2">
                  <div className="text-xs font-medium text-blue-900 mb-2">📊 Calculated Rates:</div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-blue-700">Hourly:</span>{' '}
                      <span className="font-semibold text-blue-900">
                        ${calculatedHourlyRate.toFixed(2)}/hr
                      </span>
                    </div>
                    <div>
                      <span className="text-blue-700">Daily:</span>{' '}
                      <span className="font-semibold text-blue-900">
                        ${(calculatedHourlyRate * 8).toFixed(2)}/day
                      </span>
                    </div>
                    <div>
                      <span className="text-blue-700">Annual:</span>{' '}
                      <span className="font-semibold text-blue-900">
                        $
                        {(calculatedHourlyRate * formData.hours_per_week * 52).toLocaleString(
                          'en-AU',
                          { maximumFractionDigits: 0 }
                        )}
                      </span>
                    </div>
                    <div>
                      <span className="text-blue-700">Per pay:</span>{' '}
                      <span className="font-semibold text-blue-900">
                        $
                        {formData.pay_frequency === 'weekly'
                          ? (calculatedHourlyRate * formData.hours_per_week).toFixed(2)
                          : formData.pay_frequency === 'fortnightly'
                            ? (calculatedHourlyRate * formData.hours_per_week * 2).toFixed(2)
                            : ((calculatedHourlyRate * formData.hours_per_week * 52) / 12).toFixed(
                                2
                              )}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tax File Number (TFN)
              </label>
              <Input
                type="text"
                placeholder="123 456 789"
                maxLength={11}
                value={formData.tfn || ''}
                onChange={(e) => updateField('tfn', e.target.value)}
                onBlur={(e) => {
                  // Auto-format on blur
                  if (e.target.value && validateTFN(e.target.value)) {
                    updateField('tfn', formatTFN(e.target.value));
                  }
                }}
                className={errors.tfn ? 'border-red-500' : ''}
              />
              {errors.tfn && <p className="text-xs text-red-600 mt-1">{errors.tfn}</p>}
              <p className="text-xs text-gray-500 mt-1">Format: XXX XXX XXX (9 digits)</p>
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
                min="0"
                max="100"
                value={formData.super_rate}
                onChange={(e) => updateField('super_rate', parseFloat(e.target.value) || 11.5)}
              />
              <p className="text-xs text-gray-500 mt-1">Current SG rate: 11.5%</p>
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
                <option value="HESTA">HESTA</option>
                <option value="Aware Super">Aware Super</option>
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
                  maxLength={7}
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
                  maxLength={10}
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
                onClick={() => {
                  if (validateStep3()) setStep(4);
                }}
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

              <div className="grid grid-cols-2 gap-3">
                <div className="p-4 border rounded-lg">
                  <div className="text-sm text-gray-600 mb-1">Email</div>
                  <div className="font-semibold text-gray-900 text-sm">{formData.email}</div>
                </div>
                <div className="p-4 border rounded-lg">
                  <div className="text-sm text-gray-600 mb-1">Phone</div>
                  <div className="font-semibold text-gray-900 text-sm">
                    {formData.phone || 'Not provided'}
                  </div>
                </div>
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

              <div className="p-4 border rounded-lg bg-blue-50 border-blue-200">
                <div className="text-sm text-gray-600 mb-2">Pay Details</div>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-700">Base Rate:</span>
                    <span className="font-semibold text-gray-900">
                      {formData.rate_type === 'hourly' && `$${formData.base_salary}/hr`}
                      {formData.rate_type === 'daily' && `$${formData.base_salary}/day`}
                      {formData.rate_type === 'annual' &&
                        `$${formData.base_salary?.toLocaleString()}/year`}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-700">Hours/Week:</span>
                    <span className="font-semibold text-gray-900">{formData.hours_per_week}h</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-700">Pay Frequency:</span>
                    <span className="font-semibold text-gray-900 capitalize">
                      {formData.pay_frequency}
                    </span>
                  </div>
                  <div className="flex justify-between pt-2 border-t">
                    <span className="text-gray-700">Hourly Rate:</span>
                    <span className="font-semibold text-blue-900">
                      ${calculatedHourlyRate.toFixed(2)}/hr
                    </span>
                  </div>
                </div>
              </div>

              <div className="p-4 border rounded-lg">
                <div className="text-sm text-gray-600 mb-2">Tax & Super</div>
                <div className="text-sm space-y-1">
                  <div className="flex justify-between">
                    <span className="text-gray-700">TFN:</span>
                    <span className="font-medium text-gray-900">
                      {formData.tfn || 'Not provided'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-700">Tax-free threshold:</span>
                    <span className="font-medium text-gray-900">
                      {formData.tax_free_threshold ? 'Yes' : 'No'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-700">HELP debt:</span>
                    <span className="font-medium text-gray-900">
                      {formData.help_debt ? 'Yes' : 'No'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-700">Super rate:</span>
                    <span className="font-medium text-gray-900">{formData.super_rate}%</span>
                  </div>
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
