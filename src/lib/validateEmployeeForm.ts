import { Employee } from '@/types/employee';

export function validateEmployeeForm(form: Partial<Employee>) {
  const errors: Partial<Record<keyof Employee, string>> = {};

  if (!form.full_name?.trim()) {
    errors.full_name = 'Full name is required.';
  }

  if (!form.employment_type) {
    errors.employment_type = 'Select employment type.';
  }

  if (!form.pay_frequency) {
    errors.pay_frequency = 'Select pay frequency.';
  }

  if (!form.start_date) {
    errors.start_date = 'Start date is required.';
  }

  if (form.super_rate != null && (form.super_rate < 0 || form.super_rate > 20)) {
    errors.super_rate = 'Super rate should be between 0% and 20%.';
  }

  if (form.hourly_rate != null && form.hourly_rate < 0) {
    errors.hourly_rate = 'Hourly rate must be positive.';
  }

  if (form.base_salary != null && form.base_salary < 0) {
    errors.base_salary = 'Base salary must be positive.';
  }

  const valid = Object.keys(errors).length === 0;
  return { valid, errors };
}
