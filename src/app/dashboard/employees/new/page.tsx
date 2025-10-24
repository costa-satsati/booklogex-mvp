// src/app/dashboard/employees/new/page.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, ArrowRight, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { notify } from '@/lib/notify';
import type { Employee } from '@/types/employee';

type Step = 1 | 2 | 3 | 4;

// Form uses first_name and last_name for UX, but we send full_name to DB
type FormData = Partial<Omit<Employee, 'first_name' | 'last_name' | 'full_name'>> & {
  first_name: string;
  last_name: string;
  employment_type: Employee['employment_type'];
};

export default function NewEmployeePage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState<Step>(1);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formData, setFormData] = useState<FormData>({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    address: '',
    date_of_birth: undefined,
    position: '',
    employment_type: 'full_time',
    department: '',
    start_date: new Date().toISOString().split('T')[0],
    base_salary: undefined,
    rate_type: 'annual',
    hours_per_week: 38,
    hourly_rate: undefined,
    pay_frequency: 'fortnightly',
    tfn: '',
    tax_free_threshold: true,
    help_debt: false,
    super_rate: 11.5,
    super_fund: '',
    super_member_number: '',
    bank_bsb: '',
    bank_account: '',
    abn: '',
    country_code: 'AU',
    tax_scale_type: 'regular',
    active: true,
  });

  const steps = [
    { num: 1, title: 'Personal', subtitle: 'Basic information' },
    { num: 2, title: 'Employment', subtitle: 'Job details' },
    { num: 3, title: 'Pay & Tax', subtitle: 'Compensation' },
    { num: 4, title: 'Banking', subtitle: 'Final details' },
  ];

  const validateStep = (step: Step): boolean => {
    const newErrors: Record<string, string> = {};

    if (step === 1) {
      if (!formData.first_name?.trim()) {
        newErrors.first_name = 'First name is required';
      }
      if (!formData.last_name?.trim()) {
        newErrors.last_name = 'Last name is required';
      }
      if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
        newErrors.email = 'Invalid email format';
      }
      if (
        formData.phone &&
        !/^(\+?61|0)[2-478]( ?\d){8}$/.test(formData.phone.replace(/\s/g, ''))
      ) {
        newErrors.phone = 'Invalid Australian phone number';
      }
    }

    if (step === 2) {
      if (!formData.position?.trim()) {
        newErrors.position = 'Position is required';
      }
      if (!formData.start_date) {
        newErrors.start_date = 'Start date is required';
      }
    }

    if (step === 3) {
      if (formData.employment_type !== 'contractor') {
        if (formData.tfn && formData.tfn.replace(/[\s-]/g, '').length !== 9) {
          newErrors.tfn = 'TFN must be 9 digits';
        }
      }

      // Validate rate based on rate_type
      if (formData.rate_type === 'annual') {
        if (!formData.base_salary) {
          newErrors.base_salary = 'Annual salary is required';
        } else if (formData.base_salary <= 0) {
          newErrors.base_salary = 'Salary must be greater than 0';
        }
      } else if (formData.rate_type === 'hourly') {
        if (!formData.hourly_rate) {
          newErrors.hourly_rate = 'Hourly rate is required';
        } else if (formData.hourly_rate <= 0) {
          newErrors.hourly_rate = 'Hourly rate must be greater than 0';
        }
      } else if (formData.rate_type === 'daily') {
        if (!formData.base_salary) {
          newErrors.base_salary = 'Daily rate is required';
        } else if (formData.base_salary <= 0) {
          newErrors.base_salary = 'Daily rate must be greater than 0';
        }
      }
    }

    if (step === 4) {
      if (formData.bank_bsb && !/^\d{3}-?\d{3}$/.test(formData.bank_bsb)) {
        newErrors.bank_bsb = 'BSB must be 6 digits (e.g., 063-000)';
      }
      if (formData.bank_account && !/^\d{4,10}$/.test(formData.bank_account.replace(/\s/g, ''))) {
        newErrors.bank_account = 'Invalid account number';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep((prev) => Math.min(prev + 1, 4) as Step);
    }
  };

  const handleBack = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1) as Step);
    setErrors({});
  };

  const handleSubmit = async () => {
    if (!validateStep(4)) return;

    setSaving(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Get user's org_id
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('org_id')
        .eq('id', user.id)
        .single();

      if (!profile?.org_id) throw new Error('No organisation found');

      // Build full_name from first and last name for the database
      // The DB will auto-generate first_name and last_name columns from full_name
      const full_name = `${formData.first_name.trim()} ${formData.last_name.trim()}`.trim();

      // Remove first_name and last_name from formData as they're generated columns
      const { first_name, last_name, ...restFormData } = formData;

      // Clean up data - convert empty strings to null for optional fields
      const employeeData = {
        ...restFormData,
        org_id: profile.org_id,
        full_name, // Only send full_name, DB generates first_name/last_name

        // Clean up string fields with formatting
        tfn: formData.tfn ? formData.tfn.replace(/[\s-]/g, '') : null,
        bank_bsb: formData.bank_bsb ? formData.bank_bsb.replace(/-/g, '') : null,
        phone: formData.phone ? formData.phone.replace(/\s/g, '') : null,

        // Convert empty strings to null for text fields
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

        // Ensure numeric fields are proper numbers or null
        base_salary: formData.base_salary || null,
        hourly_rate: formData.hourly_rate || null,
        hours_per_week: formData.hours_per_week || null,
        super_rate: formData.super_rate || null,
      };

      const { error } = await supabase.from('employees').insert(employeeData);

      if (error) throw error;

      notify.success('Success', 'Employee added successfully');
      router.push('/dashboard/employees');
    } catch (error) {
      console.error('Error creating employee:', error);
      notify.error('Error', 'Failed to create employee');
    } finally {
      setSaving(false);
    }
  };

  const getStepIcon = (step: number) => {
    if (step < currentStep) return <CheckCircle2 size={20} className="text-green-600" />;
    if (step === currentStep)
      return (
        <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold">
          {step}
        </div>
      );
    return (
      <div className="w-8 h-8 rounded-full bg-gray-200 text-gray-600 flex items-center justify-center font-bold">
        {step}
      </div>
    );
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 space-y-6">
      {/* Header */}
      <div>
        <button
          onClick={() => router.push('/dashboard/employees')}
          className="flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium mb-4"
        >
          <ArrowLeft size={18} />
          Back to Employees
        </button>
        <h1 className="text-3xl font-bold text-gray-900">Add New Employee</h1>
        <p className="text-gray-600 mt-1">Complete all required information</p>
      </div>

      {/* Progress Steps */}
      <div className="bg-white border rounded-lg p-6">
        <div className="flex items-center justify-between">
          {steps.map((step, idx) => (
            <>
              <div key={step.num} className="flex flex-col items-center flex-1">
                {getStepIcon(step.num)}
                <div className="text-xs font-medium text-gray-700 mt-2 text-center">
                  {step.title}
                </div>
                <div className="text-xs text-gray-500">{step.subtitle}</div>
              </div>
              {idx < steps.length - 1 && (
                <div
                  className={`flex-1 h-1 mx-2 rounded transition-colors ${
                    step.num < currentStep ? 'bg-green-200' : 'bg-gray-200'
                  }`}
                ></div>
              )}
            </>
          ))}
        </div>
      </div>

      {/* Form Content */}
      <div className="bg-white border rounded-lg p-6">
        {currentStep === 1 && (
          <Step1Personal formData={formData} setFormData={setFormData} errors={errors} />
        )}
        {currentStep === 2 && (
          <Step2Employment formData={formData} setFormData={setFormData} errors={errors} />
        )}
        {currentStep === 3 && (
          <Step3PayTax formData={formData} setFormData={setFormData} errors={errors} />
        )}
        {currentStep === 4 && (
          <Step4Banking formData={formData} setFormData={setFormData} errors={errors} />
        )}

        {/* Navigation Buttons */}
        <div className="flex gap-3 mt-6 pt-6 border-t">
          {currentStep > 1 && (
            <Button onClick={handleBack} variant="outline" className="flex items-center gap-2">
              <ArrowLeft size={18} />
              Back
            </Button>
          )}
          {currentStep < 4 ? (
            <Button
              onClick={handleNext}
              className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white"
            >
              Continue
              <ArrowRight size={18} />
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={saving}
              className="flex-1 flex items-center justify-center gap-2"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <CheckCircle2 size={18} />
                  Create Employee
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

// Step 1: Personal Info
function Step1Personal({
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
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Personal Information</h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            First Name <span className="text-red-500">*</span>
          </label>
          <Input
            value={formData.first_name}
            onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
            placeholder="Sarah"
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
            placeholder="Johnson"
            className={errors.last_name ? 'border-red-500' : ''}
          />
          {errors.last_name && <p className="text-xs text-red-600 mt-1">{errors.last_name}</p>}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
        <Input
          type="email"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          placeholder="sarah@example.com"
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
          placeholder="0412 345 678"
          className={errors.phone ? 'border-red-500' : ''}
        />
        {errors.phone && <p className="text-xs text-red-600 mt-1">{errors.phone}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
        <Input
          value={formData.address}
          onChange={(e) => setFormData({ ...formData, address: e.target.value })}
          placeholder="123 Collins St, Melbourne VIC 3000"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Date of Birth</label>
        <Input
          type="date"
          value={formData.date_of_birth}
          onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })}
        />
      </div>
    </div>
  );
}

// Step 2: Employment Details
function Step2Employment({
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
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Employment Details</h3>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Position/Title <span className="text-red-500">*</span>
        </label>
        <Input
          value={formData.position}
          onChange={(e) => setFormData({ ...formData, position: e.target.value })}
          placeholder="Senior Manager"
          className={errors.position ? 'border-red-500' : ''}
        />
        {errors.position && <p className="text-xs text-red-600 mt-1">{errors.position}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Employment Type <span className="text-red-500">*</span>
        </label>
        <select
          value={formData.employment_type}
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
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Start Date <span className="text-red-500">*</span>
        </label>
        <Input
          type="date"
          value={formData.start_date}
          onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
          className={errors.start_date ? 'border-red-500' : ''}
        />
        {errors.start_date && <p className="text-xs text-red-600 mt-1">{errors.start_date}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
        <Input
          value={formData.department}
          onChange={(e) => setFormData({ ...formData, department: e.target.value })}
          placeholder="Operations"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Hours per Week</label>
        <Input
          type="number"
          min="1"
          max="80"
          step="0.5"
          value={formData.hours_per_week}
          onChange={(e) =>
            setFormData({ ...formData, hours_per_week: parseFloat(e.target.value) || 38 })
          }
        />
        <p className="text-xs text-gray-500 mt-1">Default: 38 hours for full-time</p>
      </div>
    </div>
  );
}

// Step 3: Pay & Tax
function Step3PayTax({
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
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Pay & Tax Details</h3>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Rate Type</label>
        <select
          value={formData.rate_type}
          onChange={(e) => {
            const newRateType = e.target.value as 'annual' | 'hourly' | 'daily';
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

      {formData.rate_type === 'annual' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Annual Salary <span className="text-red-500">*</span>
          </label>
          <Input
            type="number"
            step="0.01"
            value={formData.base_salary || ''}
            onChange={(e) =>
              setFormData({ ...formData, base_salary: parseFloat(e.target.value) || undefined })
            }
            placeholder="85000"
            className={errors.base_salary ? 'border-red-500' : ''}
          />
          {errors.base_salary && <p className="text-xs text-red-600 mt-1">{errors.base_salary}</p>}
          <p className="text-xs text-gray-500 mt-1">Annual salary before tax</p>
        </div>
      )}

      {formData.rate_type === 'hourly' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Hourly Rate <span className="text-red-500">*</span>
          </label>
          <Input
            type="number"
            step="0.01"
            value={formData.hourly_rate || ''}
            onChange={(e) =>
              setFormData({ ...formData, hourly_rate: parseFloat(e.target.value) || undefined })
            }
            placeholder="45.50"
            className={errors.hourly_rate ? 'border-red-500' : ''}
          />
          {errors.hourly_rate && <p className="text-xs text-red-600 mt-1">{errors.hourly_rate}</p>}
          <p className="text-xs text-gray-500 mt-1">Per hour rate before tax</p>
        </div>
      )}

      {formData.rate_type === 'daily' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Daily Rate <span className="text-red-500">*</span>
          </label>
          <Input
            type="number"
            step="0.01"
            value={formData.base_salary || ''}
            onChange={(e) =>
              setFormData({ ...formData, base_salary: parseFloat(e.target.value) || undefined })
            }
            placeholder="350.00"
            className={errors.base_salary ? 'border-red-500' : ''}
          />
          {errors.base_salary && <p className="text-xs text-red-600 mt-1">{errors.base_salary}</p>}
          <p className="text-xs text-gray-500 mt-1">Per day rate before tax</p>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Pay Frequency</label>
        <select
          value={formData.pay_frequency}
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

      {formData.employment_type !== 'contractor' && (
        <>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tax File Number (TFN)
            </label>
            <Input
              value={formData.tfn}
              onChange={(e) => setFormData({ ...formData, tfn: e.target.value })}
              placeholder="123 456 789"
              maxLength={11}
              className={errors.tfn ? 'border-red-500' : ''}
            />
            {errors.tfn && <p className="text-xs text-red-600 mt-1">{errors.tfn}</p>}
            <p className="text-xs text-gray-500 mt-1">Required for payroll tax calculations</p>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="tax_free_threshold"
              checked={formData.tax_free_threshold}
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
              checked={formData.help_debt}
              onChange={(e) => setFormData({ ...formData, help_debt: e.target.checked })}
              className="w-6 h-6"
            />
            <label htmlFor="help_debt" className="text-sm text-gray-700">
              Has HELP/HECS debt
            </label>
          </div>
        </>
      )}

      {formData.employment_type === 'contractor' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">ABN</label>
          <Input
            value={formData.abn}
            onChange={(e) => setFormData({ ...formData, abn: e.target.value })}
            placeholder="12 345 678 901"
            maxLength={14}
          />
        </div>
      )}
    </div>
  );
}

// Step 4: Banking
function Step4Banking({
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
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Banking & Superannuation</h3>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Bank BSB</label>
        <Input
          value={formData.bank_bsb}
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
          value={formData.bank_account}
          onChange={(e) => setFormData({ ...formData, bank_account: e.target.value })}
          placeholder="12345678"
          maxLength={10}
          className={errors.bank_account ? 'border-red-500' : ''}
        />
        {errors.bank_account && <p className="text-xs text-red-600 mt-1">{errors.bank_account}</p>}
      </div>

      <div className="border-t pt-4 mt-6">
        <h4 className="font-medium text-gray-900 mb-3">Superannuation</h4>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Super Fund</label>
          <Input
            value={formData.super_fund}
            onChange={(e) => setFormData({ ...formData, super_fund: e.target.value })}
            placeholder="AustralianSuper"
          />
        </div>

        <div className="mt-3">
          <label className="block text-sm font-medium text-gray-700 mb-1">Member Number</label>
          <Input
            value={formData.super_member_number}
            onChange={(e) => setFormData({ ...formData, super_member_number: e.target.value })}
            placeholder="12345678"
          />
        </div>

        <div className="mt-3">
          <label className="block text-sm font-medium text-gray-700 mb-1">Super Rate (%)</label>
          <Input
            type="number"
            step="0.5"
            value={formData.super_rate}
            onChange={(e) =>
              setFormData({ ...formData, super_rate: parseFloat(e.target.value) || 11.5 })
            }
          />
          <p className="text-xs text-gray-500 mt-1">Default: 11.5% (current SG rate)</p>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-6">
        <div className="flex items-start gap-2">
          <AlertCircle className="text-blue-600 flex-shrink-0 mt-0.5" size={18} />
          <div className="text-sm text-blue-900">
            <strong>Almost done!</strong> Review all details before creating. You can edit this
            information later.
          </div>
        </div>
      </div>
    </div>
  );
}
