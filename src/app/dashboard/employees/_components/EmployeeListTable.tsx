// src/app/dashboard/employees/_components/EmployeeListTable.tsx
'use client';

import { useState } from 'react';
import { Mail, Phone, MoreVertical, Edit2, Trash2, Eye, AlertCircle } from 'lucide-react';
import type { Employee } from '@/types/employee';
import { supabase } from '@/lib/supabaseClient';
import { notify } from '@/lib/notify';
import EditEmployeeDrawer from './EditEmployeeDrawer';

type EmployeeListTableProps = {
  employees: Employee[];
  onEmployeeClick: (id: string) => void;
  onRefresh: () => void;
};

export default function EmployeeListTable({
  employees,
  onEmployeeClick,
  onRefresh,
}: EmployeeListTableProps) {
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [deactivating, setDeactivating] = useState<string | null>(null);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [employeeToDeactivate, setEmployeeToDeactivate] = useState<Employee | null>(null);

  const handleDeactivateClick = (employee: Employee, e: React.MouseEvent) => {
    e.stopPropagation();
    setEmployeeToDeactivate(employee);
    setOpenMenuId(null);
  };

  const handleDeactivateConfirm = async () => {
    if (!employeeToDeactivate) return;

    setDeactivating(employeeToDeactivate.id);
    try {
      const { error } = await supabase
        .from('employees')
        .update({ active: employeeToDeactivate.active === false })
        .eq('id', employeeToDeactivate.id);

      if (error) throw error;

      notify.success(
        'Success',
        `${employeeToDeactivate.full_name} ${employeeToDeactivate.active !== false ? 'deactivated' : 'activated'}`
      );
      setEmployeeToDeactivate(null);
      onRefresh();
    } catch (error) {
      console.error('Error updating employee:', error);
      notify.error('Error', 'Failed to update employee status');
    } finally {
      setDeactivating(null);
    }
  };

  const handleEdit = (employee: Employee, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingEmployee(employee);
    setOpenMenuId(null);
  };

  const formatCurrency = (value?: number) => {
    if (!value) return '-';
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: 'AUD',
      minimumFractionDigits: 0,
    }).format(value);
  };

  const getEmploymentTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      full_time: 'Full-time',
      part_time: 'Part-time',
      casual: 'Casual',
      contractor: 'Contractor',
    };
    return labels[type] || type;
  };

  const getEmploymentTypeBadge = (type: string) => {
    const badges: Record<string, string> = {
      full_time: 'bg-blue-100 text-blue-700',
      part_time: 'bg-purple-100 text-purple-700',
      casual: 'bg-amber-100 text-amber-700',
      contractor: 'bg-gray-100 text-gray-700',
    };
    return badges[type] || 'bg-gray-100 text-gray-700';
  };

  return (
    <>
      <div className="bg-white border rounded-lg">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Employee
                </th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Position
                </th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Contact
                </th>
                <th className="text-right px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Salary
                </th>
                <th className="text-center px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="text-right px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y [&_tr:last-child_td]:pb-32">
              {employees.map((employee) => (
                <tr
                  key={employee.id}
                  onClick={() => onEmployeeClick(employee.id)}
                  className="hover:bg-gray-50 cursor-pointer transition-colors relative"
                >
                  {/* Employee Name */}
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-semibold">
                        {employee.full_name
                          .split(' ')
                          .map((n) => n[0])
                          .join('')
                          .toUpperCase()
                          .slice(0, 2)}
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">{employee.full_name}</div>
                        {employee.email && (
                          <div className="text-sm text-gray-500">{employee.email}</div>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* Position */}
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900">{employee.position || '-'}</div>
                    {employee.department && (
                      <div className="text-xs text-gray-500">{employee.department}</div>
                    )}
                  </td>

                  {/* Employment Type */}
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getEmploymentTypeBadge(
                        employee.employment_type
                      )}`}
                    >
                      {getEmploymentTypeLabel(employee.employment_type)}
                    </span>
                  </td>

                  {/* Contact */}
                  <td className="px-6 py-4">
                    <div className="space-y-1">
                      {employee.email && (
                        <div className="flex items-center gap-1 text-sm text-gray-600">
                          <Mail size={14} />
                          <span className="truncate max-w-[200px]">{employee.email}</span>
                        </div>
                      )}
                      {employee.phone && (
                        <div className="flex items-center gap-1 text-sm text-gray-600">
                          <Phone size={14} />
                          <span>{employee.phone}</span>
                        </div>
                      )}
                      {!employee.email && !employee.phone && (
                        <span className="text-sm text-gray-400">-</span>
                      )}
                    </div>
                  </td>

                  {/* Salary */}
                  <td className="px-6 py-4 text-right">
                    <div className="text-sm font-medium text-gray-900">
                      {employee.base_salary
                        ? formatCurrency(employee.base_salary)
                        : employee.hourly_rate
                          ? `$${employee.hourly_rate}/hr`
                          : '-'}
                    </div>
                    {employee.rate_type && (
                      <div className="text-xs text-gray-500 capitalize">{employee.rate_type}</div>
                    )}
                  </td>

                  {/* Status */}
                  <td className="px-6 py-4 text-center">
                    {employee.active !== false ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                        Inactive
                      </span>
                    )}
                  </td>

                  {/* Actions */}
                  <td className="px-6 py-4 text-right">
                    <div className="relative">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenMenuId(openMenuId === employee.id ? null : employee.id);
                        }}
                        className="p-1 hover:bg-gray-100 rounded transition-colors"
                      >
                        <MoreVertical size={18} className="text-gray-500" />
                      </button>

                      {openMenuId === employee.id && (
                        <>
                          <div
                            className="fixed inset-0 z-10"
                            onClick={(e) => {
                              e.stopPropagation();
                              setOpenMenuId(null);
                            }}
                          />
                          <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-xl border border-gray-200 z-50 overflow-visible">
                            <div className="py-1">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onEmployeeClick(employee.id);
                                }}
                                className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                              >
                                <Eye size={16} />
                                View Details
                              </button>
                              <button
                                onClick={(e) => handleEdit(employee, e)}
                                className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                              >
                                <Edit2 size={16} />
                                Edit
                              </button>
                              <button
                                onClick={(e) => handleDeactivateClick(employee, e)}
                                disabled={deactivating === employee.id}
                                className="flex items-center gap-2 w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
                              >
                                <Trash2 size={16} />
                                {deactivating === employee.id
                                  ? 'Processing...'
                                  : employee.active !== false
                                    ? 'Deactivate'
                                    : 'Activate'}
                              </button>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Drawer */}
      {editingEmployee && (
        <EditEmployeeDrawer
          employee={editingEmployee}
          onClose={() => setEditingEmployee(null)}
          onUpdated={() => {
            setEditingEmployee(null);
            onRefresh();
          }}
        />
      )}

      {/* Deactivate/Activate Confirmation Modal */}
      {employeeToDeactivate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-md shadow-2xl">
            <div className="px-6 py-4 border-b">
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    employeeToDeactivate.active !== false ? 'bg-red-100' : 'bg-green-100'
                  }`}
                >
                  <AlertCircle
                    className={
                      employeeToDeactivate.active !== false ? 'text-red-600' : 'text-green-600'
                    }
                    size={20}
                  />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900">
                    {employeeToDeactivate.active !== false ? 'Deactivate' : 'Activate'} Employee
                  </h2>
                  <p className="text-sm text-gray-600">
                    {employeeToDeactivate.active !== false
                      ? 'This will mark the employee as inactive'
                      : 'This will reactivate the employee'}
                  </p>
                </div>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <p className="text-gray-700">
                {employeeToDeactivate.active !== false
                  ? 'Are you sure you want to deactivate this employee? They will no longer appear in active employee lists but their records will be preserved.'
                  : 'Are you sure you want to reactivate this employee? They will be restored to active status.'}
              </p>

              <div
                className={`rounded-lg p-4 border-2 ${
                  employeeToDeactivate.active !== false
                    ? 'bg-red-50 border-red-200'
                    : 'bg-green-50 border-green-200'
                }`}
              >
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Employee</span>
                    <span className="font-medium">{employeeToDeactivate.full_name}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Position</span>
                    <span className="font-medium">{employeeToDeactivate.position || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Current Status</span>
                    <span className="font-medium">
                      {employeeToDeactivate.active !== false ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="border-t px-6 py-4 bg-gray-50 flex gap-3">
              <button
                onClick={() => setEmployeeToDeactivate(null)}
                disabled={deactivating === employeeToDeactivate.id}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDeactivateConfirm}
                disabled={deactivating === employeeToDeactivate.id}
                className={`flex-1 px-4 py-2 text-white rounded-lg transition-colors font-medium disabled:opacity-50 ${
                  employeeToDeactivate.active !== false
                    ? 'bg-red-600 hover:bg-red-700'
                    : 'bg-green-600 hover:bg-green-700'
                }`}
              >
                {deactivating === employeeToDeactivate.id
                  ? 'Processing...'
                  : employeeToDeactivate.active !== false
                    ? 'Deactivate Employee'
                    : 'Activate Employee'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
