export type GSTCycle = 'monthly' | 'quarterly' | 'annual';
export type PayFrequency = 'weekly' | 'fortnightly' | 'monthly';

export interface OrganisationSettings {
  id?: string;
  user_id?: string;

  // Business Info
  business_name?: string;
  abn?: string;
  contact_email?: string;
  contact_phone?: string;
  business_address?: string;

  // Tax & Compliance
  gst_registered?: boolean;
  gst_cycle?: GSTCycle;
  financial_year_start_month?: number;

  // Payroll Defaults
  default_super_rate?: number;
  default_pay_frequency?: PayFrequency;
  default_pay_day?: string;

  // Banking
  bank_bsb?: string;
  bank_account?: string;
  bank_account_name?: string;

  // Timestamps
  created_at?: string;
  updated_at?: string;
}
