// src/lib/leave-accrual.ts
import { supabase } from './supabaseClient';
import { calculateAnnualLeaveAccrual, calculateSickLeaveAccrual } from './leave-calculator';
import type { Employee } from '@/types/employee';
import type { PayrollRun } from '@/types/payroll';

export interface LeaveAccrualResult {
  employeeId: string;
  annualLeave: number;
  sickLeave: number;
  success: boolean;
  error?: string;
}

/**
 * Accrue leave for employees in a payroll run
 */
export async function accrueLeaveForPayrollRun(
  payrollRun: PayrollRun,
  employees: Employee[]
): Promise<LeaveAccrualResult[]> {
  const results: LeaveAccrualResult[] = [];

  const payFrequency = payrollRun.frequency.toLowerCase() as 'weekly' | 'fortnightly' | 'monthly';

  for (const employee of employees) {
    try {
      // Calculate accruals
      const annualAccrual = calculateAnnualLeaveAccrual(employee, payFrequency);
      const sickAccrual = calculateSickLeaveAccrual(employee, payFrequency);

      if (annualAccrual === 0 && sickAccrual === 0) {
        // Skip if no accrual (casual/contractor)
        results.push({
          employeeId: employee.id,
          annualLeave: 0,
          sickLeave: 0,
          success: true,
        });
        continue;
      }

      // Update employee balances
      const { data: currentEmployee, error: fetchError } = await supabase
        .from('employees')
        .select('annual_leave_hours, sick_leave_hours')
        .eq('id', employee.id)
        .single();

      if (fetchError) throw fetchError;

      const newAnnualBalance = (currentEmployee.annual_leave_hours || 0) + annualAccrual;
      const newSickBalance = (currentEmployee.sick_leave_hours || 0) + sickAccrual;

      // Update balances
      const { error: updateError } = await supabase
        .from('employees')
        .update({
          annual_leave_hours: newAnnualBalance,
          sick_leave_hours: newSickBalance,
        })
        .eq('id', employee.id);

      if (updateError) throw updateError;

      // Record transactions
      const transactions = [];

      if (annualAccrual > 0) {
        transactions.push({
          employee_id: employee.id,
          org_id: employee.org_id,
          transaction_type: 'accrual',
          leave_type: 'annual',
          hours: annualAccrual,
          balance_after: newAnnualBalance,
          payroll_run_id: payrollRun.id,
          reference: `Accrual for pay period ${payrollRun.pay_period_start} - ${payrollRun.pay_period_end}`,
        });
      }

      if (sickAccrual > 0) {
        transactions.push({
          employee_id: employee.id,
          org_id: employee.org_id,
          transaction_type: 'accrual',
          leave_type: 'sick',
          hours: sickAccrual,
          balance_after: newSickBalance,
          payroll_run_id: payrollRun.id,
          reference: `Accrual for pay period ${payrollRun.pay_period_start} - ${payrollRun.pay_period_end}`,
        });
      }

      if (transactions.length > 0) {
        const { error: txError } = await supabase.from('leave_transactions').insert(transactions);

        if (txError) throw txError;
      }

      results.push({
        employeeId: employee.id,
        annualLeave: annualAccrual,
        sickLeave: sickAccrual,
        success: true,
      });
    } catch (error) {
      console.error(`Error accruing leave for employee ${employee.id}:`, error);
      results.push({
        employeeId: employee.id,
        annualLeave: 0,
        sickLeave: 0,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  return results;
}
