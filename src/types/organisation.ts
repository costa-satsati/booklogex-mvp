export type GSTCycle = 'monthly' | 'quarterly' | 'annual';
export type PayFrequency = 'weekly' | 'fortnightly' | 'monthly';

export type Organisation = {
  id: string;
  owner_id: string;
  name: string | null;
  abn: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  business_address: string | null;
  gst_registered: boolean;
  gst_cycle: 'monthly' | 'quarterly' | 'annual';
  financial_year_start_month: number;
  default_super_rate: number;
  default_pay_frequency: 'weekly' | 'fortnightly' | 'monthly';
  default_pay_day: string | null;
  bank_bsb: string | null;
  bank_account: string | null;
  bank_account_name: string | null;
  created_at: string;
  updated_at: string;
};
