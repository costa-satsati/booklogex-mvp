// src/types/transaction.ts

export type TransactionType = 'income' | 'expense';

export interface Transaction {
  id: string;
  org_id: string;
  user_id: string | null;
  txn_date: string; // Date string in format 'YYYY-MM-DD'
  description: string;
  category: string;
  amount: number;
  gst_amount: number;
  type: TransactionType;
  payment_method: string | null;
  reference: string | null;
  notes: string | null;
  created_at: string; // ISO timestamp
  updated_at: string; // ISO timestamp
}

export type TransactionInsert = Omit<Transaction, 'id' | 'created_at' | 'updated_at'>;

export type TransactionUpdate = Partial<
  Omit<Transaction, 'id' | 'org_id' | 'user_id' | 'created_at' | 'updated_at'>
>;

// Category options
export const INCOME_CATEGORIES = [
  'Sales',
  'Consulting',
  'Services',
  'Product Sales',
  'Subscriptions',
  'Interest',
  'Other Income',
] as const;

export const EXPENSE_CATEGORIES = [
  'Office Supplies',
  'Travel',
  'Utilities',
  'Rent',
  'Salaries & Wages',
  'Marketing',
  'Software & Subscriptions',
  'Insurance',
  'Professional Fees',
  'Bank Fees',
  'Repairs & Maintenance',
  'Vehicle Expenses',
  'Telecommunications',
  'Other Expenses',
] as const;

export const PAYMENT_METHODS = [
  'Bank Transfer',
  'Credit Card',
  'Debit Card',
  'Cash',
  'Direct Debit',
  'BPAY',
  'PayPal',
  'Other',
] as const;

export type IncomeCategory = (typeof INCOME_CATEGORIES)[number];
export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const TRANSACTION_CATEGORIES = {
  income: INCOME_CATEGORIES,
  expense: EXPENSE_CATEGORIES,
} as const;
