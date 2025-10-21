// src/lib/ytd-calculator.ts
import { supabase } from './supabaseClient';

export interface YTDTotals {
  gross: number;
  tax: number;
  super: number;
}

/**
 * Calculate Year-To-Date totals for an employee
 * Uses Australian financial year (July 1 - June 30)
 */
export async function calculateYTD(employeeId: string, orgId: string): Promise<YTDTotals> {
  try {
    // Calculate financial year start (July 1)
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth(); // 0-11

    // If we're before July (month 6), use previous year
    const fyStartYear = currentMonth < 6 ? currentYear - 1 : currentYear;
    const fyStart = `${fyStartYear}-07-01`;

    // Fetch all payroll items for this employee in current FY
    const { data, error } = await supabase
      .from('payroll_items')
      .select('gross, tax, super, created_at')
      .eq('employee_id', employeeId)
      .gte('created_at', fyStart)
      .lte('created_at', now.toISOString());

    if (error) {
      console.error('Error fetching YTD data:', error);
      return { gross: 0, tax: 0, super: 0 };
    }

    // Sum up all values
    const totals = (data || []).reduce(
      (acc, item) => ({
        gross: acc.gross + (item.gross || 0),
        tax: acc.tax + (item.tax || 0),
        super: acc.super + (item.super || 0),
      }),
      { gross: 0, tax: 0, super: 0 }
    );

    return totals;
  } catch (error) {
    console.error('Error calculating YTD:', error);
    return { gross: 0, tax: 0, super: 0 };
  }
}
