// src/app/dashboard/payroll/[id]/_components/EmployeesStep.tsx - FIXED
'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { notify } from '@/lib/notify';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, ChevronRight, Edit2, Loader2, Plus } from 'lucide-react';
import { calculatePayroll } from '@/lib/tax-calculator';
import type { Employee, PayrollRun, PayrollItem } from '@/types/payroll';

interface Props {
  payrollRun: PayrollRun;
  allEmployees: Employee[];
  currentItems: PayrollItem[];
  selectedEmployeeIds: string[];
  onBack: () => void;
  onContinue: (items: PayrollItem[]) => void;
  isReadOnly?: boolean;
}

interface EmployeeWithCalculation extends Employee {
  calculated: {
    gross: number;
    tax: number;
    super: number;
    net: number;
    totalCost: number;
  };
  hoursWorked?: number;
}

export default function EmployeesStep({
  payrollRun,
  allEmployees,
  currentItems,
  selectedEmployeeIds: initialSelected,
  onBack,
  onContinue,
  isReadOnly,
}: Props) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set(initialSelected));
  const [employeesWithCalc, setEmployeesWithCalc] = useState<EmployeeWithCalculation[]>([]);
  const [saving, setSaving] = useState(false);
  const [expandedEmployee, setExpandedEmployee] = useState<string | null>(null);

  // FIX: Calculate pay for all employees including contractors
  useEffect(() => {
    const calculated = allEmployees.map((emp) => {
      let grossPay = 0;

      // FIX: Better contractor handling
      if (emp.employment_type === 'contractor') {
        // Contractors: calculate from hourly rate if available
        if (emp.hourly_rate && emp.hours_worked) {
          const hoursForPeriod =
            payrollRun.frequency === 'FORTNIGHTLY'
              ? emp.hours_worked * 2
              : payrollRun.frequency === 'WEEKLY'
                ? emp.hours_worked
                : emp.hours_worked * 4.33;
          grossPay = emp.hourly_rate * hoursForPeriod;
        } else if (emp.base_salary) {
          // Or use base_salary as the contracted amount for the period
          const annualAmount = emp.base_salary;
          grossPay =
            payrollRun.frequency === 'FORTNIGHTLY'
              ? annualAmount / 26
              : payrollRun.frequency === 'WEEKLY'
                ? annualAmount / 52
                : annualAmount / 12;
        }
      } else {
        // Regular employees
        if (emp.hourly_rate && emp.hours_worked) {
          const hoursForPeriod =
            payrollRun.frequency === 'FORTNIGHTLY'
              ? emp.hours_worked * 2
              : payrollRun.frequency === 'WEEKLY'
                ? emp.hours_worked
                : emp.hours_worked * 4.33;
          grossPay = emp.hourly_rate * hoursForPeriod;
        } else if (emp.base_salary) {
          const annualSalary = emp.base_salary;
          grossPay =
            payrollRun.frequency === 'FORTNIGHTLY'
              ? annualSalary / 26
              : payrollRun.frequency === 'WEEKLY'
                ? annualSalary / 52
                : annualSalary / 12;
        }
      }

      // FIX: Contractors typically don't have tax withheld or super
      // But we'll calculate it for display purposes
      const payFrequency = payrollRun.frequency.toLowerCase() as
        | 'weekly'
        | 'fortnightly'
        | 'monthly';

      let calculation;

      if (emp.employment_type === 'contractor') {
        // Contractors: No tax withholding, no super (they handle their own)
        calculation = {
          gross: grossPay,
          tax: 0,
          super: 0,
          net: grossPay,
          totalCost: grossPay,
        };
      } else {
        // Regular employees: Calculate tax and super
        calculation = calculatePayroll({
          grossPay,
          payFrequency,
          hasTaxFreeThreshold: emp.tax_free_threshold ?? true,
          superRate: (emp.super_rate || 11.5) / 100,
        });
      }

      return {
        ...emp,
        calculated: calculation,
        hoursWorked: emp.hours_worked || 0,
      };
    });

    setEmployeesWithCalc(calculated);
  }, [allEmployees, payrollRun.frequency]);

  const toggleEmployee = (empId: string) => {
    if (isReadOnly) return;

    const newSelected = new Set(selectedIds);
    if (newSelected.has(empId)) {
      newSelected.delete(empId);
    } else {
      newSelected.add(empId);
    }
    setSelectedIds(newSelected);
  };

  const handleSaveAndContinue = async () => {
    if (selectedIds.size === 0) {
      notify.error('No employees selected', 'Please select at least one employee');
      return;
    }

    setSaving(true);
    try {
      // Delete existing items not in selection
      const itemsToDelete = currentItems.filter((item) => !selectedIds.has(item.employee_id));
      if (itemsToDelete.length > 0) {
        const { error: deleteError } = await supabase
          .from('payroll_items')
          .delete()
          .in(
            'id',
            itemsToDelete.map((i) => i.id)
          );

        if (deleteError) throw deleteError;
      }

      // Upsert selected employees
      const itemsToUpsert = Array.from(selectedIds)
        .map((empId) => {
          const emp = employeesWithCalc.find((e) => e.id === empId);
          if (!emp) return null;

          const existingItem = currentItems.find((i) => i.employee_id === empId);

          return {
            id: existingItem?.id,
            payroll_run_id: payrollRun.id,
            employee_id: empId,
            gross: emp.calculated.gross,
            tax: emp.calculated.tax,
            super: emp.calculated.super,
            net: emp.calculated.net,
            hours_worked: emp.hoursWorked,
          };
        })
        .filter(Boolean);

      const { data, error } = await supabase
        .from('payroll_items')
        .upsert(itemsToUpsert, { onConflict: 'id' })
        .select('*, employees(full_name, email, position, tfn)');

      if (error) throw error;

      // Update payroll_run totals
      const totals = itemsToUpsert.reduce(
        (acc, item) => {
          if (!item) return acc;
          return {
            gross: acc.gross + item.gross,
            tax: acc.tax + item.tax,
            super: acc.super + item.super,
            net: acc.net + item.net,
          };
        },
        { gross: 0, tax: 0, super: 0, net: 0 }
      );

      const { error: updateError } = await supabase
        .from('payroll_runs')
        .update({
          total_gross: totals.gross,
          total_tax: totals.tax,
          total_super: totals.super,
          total_net: totals.net,
        })
        .eq('id', payrollRun.id);

      if (updateError) throw updateError;

      notify.success('Saved', 'Employee selections saved');
      onContinue(data || []);
    } catch (error) {
      console.error('Error saving:', error);
      notify.error('Error', 'Failed to save employee selections');
    } finally {
      setSaving(false);
    }
  };

  const totals = employeesWithCalc
    .filter((emp) => selectedIds.has(emp.id))
    .reduce(
      (acc, emp) => ({
        gross: acc.gross + emp.calculated.gross,
        tax: acc.tax + emp.calculated.tax,
        super: acc.super + emp.calculated.super,
        net: acc.net + emp.calculated.net,
      }),
      { gross: 0, tax: 0, super: 0, net: 0 }
    );

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg border p-6 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Select Employees</h2>
            <p className="text-sm text-gray-600 mt-1">
              {selectedIds.size} of {allEmployees.length} employees selected
            </p>
          </div>
          <Button variant="outline" size="sm">
            <Plus size={16} className="mr-2" />
            Add Employee
          </Button>
        </div>

        {/* Employee List */}
        <div className="space-y-2">
          {employeesWithCalc.map((emp) => (
            <div
              key={emp.id}
              className={`border rounded-lg transition-all ${
                selectedIds.has(emp.id)
                  ? 'border-blue-300 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div
                onClick={() => !isReadOnly && toggleEmployee(emp.id)}
                className={`w-full p-4 flex items-center gap-4 ${!isReadOnly ? 'cursor-pointer' : ''}`}
              >
                <input
                  type="checkbox"
                  checked={selectedIds.has(emp.id)}
                  onChange={() => {}}
                  onClick={(e) => {
                    e.stopPropagation();
                    !isReadOnly && toggleEmployee(emp.id);
                  }}
                  className="w-5 h-5 rounded text-blue-600"
                  disabled={isReadOnly}
                />

                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-sm font-bold text-blue-600">
                      {emp.full_name
                        .split(' ')
                        .map((n) => n[0])
                        .join('')}
                    </div>
                    <div>
                      <div className="font-semibold text-gray-900">{emp.full_name}</div>
                      <div className="text-xs text-gray-600">
                        {emp.position || emp.employment_type} • {emp.pay_frequency}
                        {emp.employment_type === 'contractor' && (
                          <span className="ml-2 text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded">
                            Contractor
                          </span>
                        )}
                      </div>
                    </div>
                    {emp.tfn && emp.employment_type !== 'contractor' && (
                      <span className="ml-2 text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">
                        TFN ✓
                      </span>
                    )}
                  </div>
                </div>

                <div className="text-right">
                  <div className="font-bold text-gray-900">
                    ${emp.calculated.gross.toLocaleString('en-AU', { minimumFractionDigits: 2 })}
                  </div>
                  <div className="text-xs text-gray-600">
                    Net: ${emp.calculated.net.toLocaleString('en-AU', { minimumFractionDigits: 2 })}
                  </div>
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setExpandedEmployee(expandedEmployee === emp.id ? null : emp.id);
                  }}
                  className="p-2 hover:bg-gray-100 rounded transition-colors"
                  type="button"
                >
                  <Edit2 size={16} className="text-gray-400" />
                </button>
              </div>

              {/* Expanded Details */}
              {expandedEmployee === emp.id && (
                <div className="border-t bg-gray-50 p-4 space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <div className="text-gray-600">Gross Pay</div>
                      <div className="font-semibold text-gray-900">
                        ${emp.calculated.gross.toFixed(2)}
                      </div>
                    </div>
                    <div>
                      <div className="text-gray-600">
                        {emp.employment_type === 'contractor' ? 'Tax' : 'PAYG Tax'}
                      </div>
                      <div className="font-semibold text-gray-900">
                        ${emp.calculated.tax.toFixed(2)}
                      </div>
                      {emp.employment_type === 'contractor' && (
                        <div className="text-xs text-gray-500 mt-1">Self-managed</div>
                      )}
                    </div>
                    <div>
                      <div className="text-gray-600">Super</div>
                      <div className="font-semibold text-gray-900">
                        ${emp.calculated.super.toFixed(2)}
                      </div>
                      {emp.employment_type === 'contractor' && (
                        <div className="text-xs text-gray-500 mt-1">Self-managed</div>
                      )}
                    </div>
                    <div>
                      <div className="text-gray-600">Net Pay</div>
                      <div className="font-semibold text-green-700">
                        ${emp.calculated.net.toFixed(2)}
                      </div>
                    </div>
                  </div>

                  {emp.hourly_rate && (
                    <div>
                      <label className="text-sm text-gray-600 block mb-1">
                        Hours Worked (per{' '}
                        {payrollRun.frequency === 'WEEKLY'
                          ? 'week'
                          : payrollRun.frequency === 'FORTNIGHTLY'
                            ? 'fortnight'
                            : 'month'}
                        )
                      </label>
                      <Input
                        type="number"
                        value={emp.hoursWorked}
                        onChange={(e) => {
                          // TODO: Update hours and recalculate
                        }}
                        className="w-32"
                        step="0.5"
                        min="0"
                      />
                      <div className="text-xs text-gray-500 mt-1">Rate: ${emp.hourly_rate}/hr</div>
                    </div>
                  )}

                  {emp.employment_type === 'contractor' && (
                    <div className="bg-purple-50 border border-purple-200 rounded p-3 text-sm text-purple-900">
                      <strong>Contractor:</strong> No tax withholding or super contributions. They
                      manage their own tax and super.
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        {allEmployees.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            <p className="mb-4">No active employees found</p>
            <Button variant="outline">
              <Plus size={16} className="mr-2" />
              Add Your First Employee
            </Button>
          </div>
        )}
      </div>

      {/* Summary */}
      {selectedIds.size > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Pay Run Summary</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <div className="text-sm text-gray-600">Total Gross</div>
              <div className="text-xl font-bold text-gray-900">
                ${totals.gross.toLocaleString('en-AU', { minimumFractionDigits: 2 })}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-600">Total Tax</div>
              <div className="text-xl font-bold text-gray-900">
                ${totals.tax.toLocaleString('en-AU', { minimumFractionDigits: 2 })}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-600">Employer Super</div>
              <div className="text-xl font-bold text-gray-900">
                ${totals.super.toLocaleString('en-AU', { minimumFractionDigits: 2 })}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-600">Net to Employees</div>
              <div className="text-xl font-bold text-green-700">
                ${totals.net.toLocaleString('en-AU', { minimumFractionDigits: 2 })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack} disabled={saving}>
          <ArrowLeft size={16} className="mr-2" />
          Back
        </Button>
        <Button
          onClick={handleSaveAndContinue}
          disabled={saving || selectedIds.size === 0 || isReadOnly}
          className="bg-blue-600 hover:bg-blue-700"
        >
          {saving ? (
            <>
              <Loader2 size={16} className="mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              Continue to Review
              <ChevronRight size={16} className="ml-2" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
