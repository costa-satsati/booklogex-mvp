export type EmploymentType = 'full_time' | 'part_time' | 'casual' | 'contractor';
export type PayFrequency = 'weekly' | 'fortnightly' | 'monthly';

export interface Employee {
  id: string;
  org_id: string | null;
  full_name: string;
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
  tfn?: string | null;
  notes?: string | null;
  position?: string | null;
  employment_type: EmploymentType;
  base_salary?: number | null;
  hourly_rate?: number | null;
  pay_frequency: PayFrequency;
  start_date?: string | null;
  end_date?: string | null;
  super_rate: number;
  active: boolean;
  created_at?: string;
}
