export type PayrollItem = {
  id: string;
  payroll_run_id: string;
  employee_id: string;
  gross: number;
  tax: number;
  super: number;
  net: number;
  created_at?: string;
  employees?: {
    full_name: string;
  };
};
