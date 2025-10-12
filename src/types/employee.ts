// src/types/employee.ts
export type EmploymentType = 'full_time' | 'part_time' | 'casual' | 'contractor';
export type PayFrequency = 'weekly' | 'fortnightly' | 'monthly';

export interface Employee {
  id: string;
  full_name: string;
  email: string | null;
  tfn: string | null;
  employment_type: EmploymentType;
  base_salary: number | null;
  hourly_rate: number | null;
  pay_frequency: PayFrequency;
  super_rate: number;
  start_date: string | null;
  end_date?: string | null;
  position?: string | null;
  active: boolean;
  created_at: string;
  org_id?: string | null;
}
