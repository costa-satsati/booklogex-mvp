export type OrganisationSettings = {
  id?: string;
  user_id?: string;
  business_name?: string;
  abn?: string;
  gst_registered?: boolean;
  gst_cycle?: 'monthly' | 'quarterly' | 'annual';
  financial_year_start_month?: number;
  default_super_rate?: number;
  default_pay_frequency?: 'weekly' | 'fortnightly' | 'monthly';
  contact_email?: string;
  created_at?: string;
  updated_at?: string;
};
