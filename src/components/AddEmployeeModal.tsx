'use client';

import { useState } from 'react';
import { Employee, EmploymentType, PayFrequency } from '@/types/employee';
import { validateEmployeeForm } from '@/lib/validateEmployeeForm';
import { useOrgContext } from '@/context/OrgSettingsContext';
import { notify } from '@/lib/notify';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

interface AddEmployeeModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (emp: Employee) => Promise<void>;
}

export default function AddEmployeeModal({ open, onClose, onSave }: AddEmployeeModalProps) {
  const { settings: org } = useOrgContext();
  const [step, setStep] = useState<1 | 2>(1);
  const [form, setForm] = useState<Partial<Employee>>({
    employment_type: 'full_time',
    pay_frequency: 'fortnightly',
    super_rate: org?.default_super_rate ?? 11,
    active: true,
  });
  const [errors, setErrors] = useState<Partial<Record<keyof Employee, string>>>({});

  const handleChange = <K extends keyof Employee>(key: K, value: Employee[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
  };

  const validateStep = () => {
    const { valid, errors: e } = validateEmployeeForm(form);
    setErrors(e);
    return valid;
  };

  const handleNext = () => {
    if (validateStep()) setStep(2);
  };

  const handleBack = () => setStep(1);

  const handleSave = async () => {
    if (!validateStep()) return;

    try {
      await onSave(form as Employee);
      onClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save employee';
      notify.error('Error saving employee', message);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {step === 1
              ? 'Add Employee — Step 1: Basic Info'
              : 'Add Employee — Step 2: Payroll Details'}
          </DialogTitle>
        </DialogHeader>

        {/* STEP 1 */}
        {step === 1 && (
          <div className="space-y-4 mt-4">
            <div className="space-y-1">
              <Label htmlFor="full_name">Full Name</Label>
              <Input
                id="full_name"
                value={form.full_name || ''}
                onChange={(e) => handleChange('full_name', e.target.value)}
                placeholder="e.g. John Smith"
              />
              {errors.full_name && <p className="text-xs text-red-600">{errors.full_name}</p>}
            </div>

            <div className="space-y-1">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={form.email || ''}
                onChange={(e) => handleChange('email', e.target.value)}
                placeholder="john@acme.com"
              />
              {errors.email && <p className="text-xs text-red-600">{errors.email}</p>}
            </div>

            <div className="space-y-1">
              <Label htmlFor="position">Position / Role</Label>
              <Input
                id="position"
                value={form.position || ''}
                onChange={(e) => handleChange('position', e.target.value)}
                placeholder="e.g. Accountant, Manager"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="employment_type">Employment Type</Label>
              <Select
                value={(form.employment_type as EmploymentType) || 'full_time'}
                onValueChange={(v) => handleChange('employment_type', v as EmploymentType)}
              >
                <SelectTrigger id="employment_type">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="full_time">Full Time</SelectItem>
                  <SelectItem value="part_time">Part Time</SelectItem>
                  <SelectItem value="casual">Casual</SelectItem>
                  <SelectItem value="contractor">Contractor</SelectItem>
                </SelectContent>
              </Select>
              {errors.employment_type && (
                <p className="text-xs text-red-600">{errors.employment_type}</p>
              )}
            </div>

            <div className="space-y-1">
              <Label htmlFor="start_date">Start Date</Label>
              <Input
                id="start_date"
                type="date"
                value={form.start_date || ''}
                onChange={(e) => handleChange('start_date', e.target.value)}
              />
              {errors.start_date && <p className="text-xs text-red-600">{errors.start_date}</p>}
            </div>

            <div className="flex justify-end mt-6">
              <Button onClick={handleNext}>Next →</Button>
            </div>
          </div>
        )}

        {/* STEP 2 */}
        {step === 2 && (
          <div className="space-y-4 mt-4">
            <div className="space-y-1">
              <Label htmlFor="hourly_rate">Hourly Rate (AUD)</Label>
              <Input
                id="hourly_rate"
                type="number"
                step="0.01"
                value={form.hourly_rate?.toString() || ''}
                onChange={(e) => handleChange('hourly_rate', parseFloat(e.target.value) || 0)}
                placeholder="e.g. 35.00"
              />
              {errors.hourly_rate && <p className="text-xs text-red-600">{errors.hourly_rate}</p>}
            </div>

            <div className="space-y-1">
              <Label htmlFor="super_rate">Superannuation Rate (%)</Label>
              <Input
                id="super_rate"
                type="number"
                step="0.1"
                value={form.super_rate?.toString() || ''}
                onChange={(e) => handleChange('super_rate', parseFloat(e.target.value) || 0)}
                placeholder="e.g. 11"
              />
              {errors.super_rate && <p className="text-xs text-red-600">{errors.super_rate}</p>}
            </div>

            <div className="space-y-1">
              <Label htmlFor="pay_frequency">Pay Frequency</Label>
              <Select
                value={(form.pay_frequency as PayFrequency) || 'fortnightly'}
                onValueChange={(v) => handleChange('pay_frequency', v as PayFrequency)}
              >
                <SelectTrigger id="pay_frequency">
                  <SelectValue placeholder="Select frequency" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="fortnightly">Fortnightly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                </SelectContent>
              </Select>
              {errors.pay_frequency && (
                <p className="text-xs text-red-600">{errors.pay_frequency}</p>
              )}
            </div>

            <div className="space-y-1">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={form.notes || ''}
                onChange={(e) => handleChange('notes', e.target.value)}
                placeholder="Optional notes about this employee"
              />
            </div>

            <div className="flex justify-between mt-6">
              <Button variant="outline" onClick={handleBack}>
                ← Back
              </Button>
              <Button onClick={handleSave}>Save Employee</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
