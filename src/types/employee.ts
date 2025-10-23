// src/types/employee.ts
export interface Employee {
  id: string;
  org_id: string;
  full_name: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  address?: string;
  date_of_birth?: string;
  position?: string;
  employment_type: 'full_time' | 'part_time' | 'casual' | 'contractor';
  department?: string;
  start_date?: string;
  end_date?: string;
  base_salary?: number;
  rate_type?: 'hourly' | 'daily' | 'annual';
  hours_per_week?: number;
  hourly_rate?: number;
  pay_frequency?: 'weekly' | 'fortnightly' | 'monthly';
  tfn?: string;
  tax_rate?: number;
  tax_free_threshold?: boolean;
  help_debt?: boolean;
  super_rate?: number;
  super_fund?: string;
  super_member_number?: string;
  bank_bsb?: string;
  bank_account?: string;

  // Leave balances
  annual_leave_hours?: number;
  sick_leave_hours?: number;
  personal_leave_hours?: number;
  long_service_leave_hours?: number;
  leave_loading_rate?: number;

  active?: boolean;
  notes?: string;
  created_at?: string;
}

// Add leave transaction type
export interface LeaveTransaction {
  id: string;
  employee_id: string;
  org_id: string;
  transaction_type: 'accrual' | 'taken' | 'adjustment' | 'payout' | 'carryover';
  leave_type: 'annual' | 'sick' | 'personal' | 'long_service';
  hours: number;
  balance_after: number;
  payroll_run_id?: string;
  reference?: string;
  notes?: string;
  created_by?: string;
  created_at: string;
}

export interface LeaveRequest {
  id: string;
  employee_id: string;
  org_id: string;
  leave_type: 'annual' | 'sick' | 'personal' | 'long_service' | 'unpaid';
  start_date: string;
  end_date: string;
  hours_requested: number;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  reason?: string;
  notes?: string;
  reviewed_by?: string;
  reviewed_at?: string;
  leave_transaction_id?: string;
  created_at: string;
  updated_at: string;
}
