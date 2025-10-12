// src/lib/validateEmployeeForm.ts
import type { Employee } from '@/types/employee';

export interface EmployeeFormErrors {
  [key: string]: string;
}

export function validateEmployeeForm(form: Partial<Employee>): EmployeeFormErrors {
  const errors: EmployeeFormErrors = {};

  // Full name
  if (!form.full_name || form.full_name.trim().length < 2) {
    errors.full_name = 'Full name is required.';
  }

  // Salary / hourly rate logic
  const hasSalary = !!form.base_salary;
  const hasHourlyRate = !!form.hourly_rate;

  if (!hasSalary && !hasHourlyRate) {
    errors.salary = 'Enter either Base Salary or Hourly Rate.';
  } else if (hasSalary && hasHourlyRate) {
    errors.salary = 'Enter only one: Base Salary OR Hourly Rate (not both).';
  }

  // Superannuation %
  if (form.super_rate == null || form.super_rate < 9 || form.super_rate > 15) {
    errors.super_rate = 'Super rate should be between 9% and 15%.';
  }

  // Start date
  if (!form.start_date) {
    errors.start_date = 'Start date is required.';
  }

  // Employment type
  if (!form.employment_type) {
    errors.employment_type = 'Employment type is required.';
  }

  // Pay frequency
  if (!form.pay_frequency) {
    errors.pay_frequency = 'Pay frequency is required.';
  }

  return errors;
}
