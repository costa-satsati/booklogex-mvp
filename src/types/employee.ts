// src/types/employee.ts
export type EmploymentType = 'full_time' | 'part_time' | 'casual' | 'contractor';
export type PayFrequency = 'weekly' | 'fortnightly' | 'monthly';

export interface Employee {
  id: string;
  org_id: string | null;
  full_name: string;
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
  phone?: string | null; // NEW
  address?: string | null; // NEW
  date_of_birth?: string | null; // NEW
  tfn?: string | null;
  notes?: string | null;
  position?: string | null;
  employment_type: EmploymentType;
  department?: string | null; // NEW
  base_salary?: number | null;
  hourly_rate?: number | null;
  pay_frequency: PayFrequency;
  start_date?: string | null;
  end_date?: string | null;
  super_rate: number;
  super_fund?: string | null; // NEW
  super_member_number?: string | null; // NEW
  bank_bsb?: string | null; // NEW
  bank_account?: string | null; // NEW
  tax_free_threshold?: boolean; // This was missing from your original type!
  help_debt?: boolean; // This was also missing!
  tax_rate?: number | null;
  hours_worked?: number | null;
  active: boolean;
  created_at?: string;
}
