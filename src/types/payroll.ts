// src/types/payroll.ts (COMPLETE VERSION)
export interface Employee {
  id: string;
  full_name: string;
  email: string | null;
  tfn: string | null;
  position: string | null;
  employment_type: 'full_time' | 'part_time' | 'casual' | 'contractor';
  hourly_rate: number | null;
  base_salary: number | null;
  pay_frequency: 'weekly' | 'fortnightly' | 'monthly';
  hours_worked: number | null;
  super_rate: number;
  active: boolean;
  start_date: string | null;
  end_date: string | null;
  tax_rate: number;
  tax_free_threshold: boolean;
  help_debt: boolean;
  org_id: string;
  created_at: string;
}

export interface PayrollRun {
  id: string;
  org_id: string;
  frequency: 'WEEKLY' | 'FORTNIGHTLY' | 'MONTHLY';
  pay_period_start: string;
  pay_period_end: string;
  pay_date: string | null;
  status: 'draft' | 'pending' | 'processed' | 'completed' | 'failed' | 'finalized';
  total_gross: number;
  total_tax: number;
  total_super: number;
  total_net: number;
  validated: boolean;
  finalized_at: string | null;
  created_at: string;
  idempotency_key: string | null;
}

export interface PayrollItem {
  id: string;
  payroll_run_id: string;
  employee_id: string;
  gross: number;
  tax: number;
  super: number;
  net: number;
  hours_worked: number | null;
  description: string | null;
  created_at: string;
  employees?: {
    full_name: string;
    email: string | null;
    position: string | null;
    employment_type: string | null;
    tfn: string | null;
  };
}

export interface PayrollCalculation {
  employeeId: string;
  employeeName: string;
  gross: number;
  tax: number;
  super: number;
  net: number;
  totalCost: number;
}
