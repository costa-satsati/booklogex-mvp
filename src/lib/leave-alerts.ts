// src/lib/leave-alerts.ts

import type { Employee } from '@/types/employee';

export interface LeaveAlert {
  employeeId: string;
  employeeName: string;
  type: 'low_balance' | 'negative_balance' | 'high_balance';
  leaveType: 'annual' | 'sick' | 'personal';
  currentBalance: number;
  message: string;
  severity: 'warning' | 'error' | 'info';
}

/**
 * Check for leave balance alerts
 */
export function checkLeaveAlerts(employees: Employee[]): LeaveAlert[] {
  const alerts: LeaveAlert[] = [];

  for (const emp of employees) {
    // Skip casual and contractors
    if (!['full_time', 'part_time'].includes(emp.employment_type)) {
      continue;
    }

    const hoursPerDay = emp.hours_per_week ? emp.hours_per_week / 5 : 7.6;

    // Check annual leave
    const annualHours = emp.annual_leave_hours || 0;
    if (annualHours < 0) {
      alerts.push({
        employeeId: emp.id,
        employeeName: emp.full_name,
        type: 'negative_balance',
        leaveType: 'annual',
        currentBalance: annualHours,
        message: `${emp.full_name} has negative annual leave balance (${annualHours.toFixed(1)}h)`,
        severity: 'error',
      });
    } else if (annualHours < hoursPerDay * 5) {
      // Less than 5 days
      alerts.push({
        employeeId: emp.id,
        employeeName: emp.full_name,
        type: 'low_balance',
        leaveType: 'annual',
        currentBalance: annualHours,
        message: `${emp.full_name} has low annual leave balance (${annualHours.toFixed(1)}h)`,
        severity: 'warning',
      });
    } else if (annualHours > hoursPerDay * 40) {
      // More than 40 days (excessive accrual)
      alerts.push({
        employeeId: emp.id,
        employeeName: emp.full_name,
        type: 'high_balance',
        leaveType: 'annual',
        currentBalance: annualHours,
        message: `${emp.full_name} has high annual leave balance (${annualHours.toFixed(1)}h). Consider encouraging leave usage.`,
        severity: 'info',
      });
    }

    // Check sick leave
    const sickHours = emp.sick_leave_hours || 0;
    if (sickHours < 0) {
      alerts.push({
        employeeId: emp.id,
        employeeName: emp.full_name,
        type: 'negative_balance',
        leaveType: 'sick',
        currentBalance: sickHours,
        message: `${emp.full_name} has negative sick leave balance (${sickHours.toFixed(1)}h)`,
        severity: 'error',
      });
    }
  }

  return alerts;
}
