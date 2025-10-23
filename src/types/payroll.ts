// src/types/payroll.ts (COMPLETE VERSION)
import type { Employee } from '@/types/employee';

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
  employees?: Employee;
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
