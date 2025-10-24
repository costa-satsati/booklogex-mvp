// src/app/dashboard/employees/_components/EmployeeListCards.tsx
'use client';

import { Mail, Phone, Calendar, DollarSign, ChevronRight } from 'lucide-react';
import type { Employee } from '@/types/employee';

type EmployeeListCardsProps = {
  employees: Employee[];
  onEmployeeClick: (id: string) => void;
  onRefresh: () => void;
};

export default function EmployeeListCards({ employees, onEmployeeClick }: EmployeeListCardsProps) {
  const formatCurrency = (value?: number) => {
    if (!value) return null;
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

  const formatDate = (dateString?: string) => {
    if (!dateString) return null;
    return new Date(dateString).toLocaleDateString('en-AU', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  return (
    <div className="space-y-3">
      {employees.map((employee) => (
        <div
          key={employee.id}
          onClick={() => onEmployeeClick(employee.id)}
          className="bg-white border rounded-lg p-4 hover:shadow-md hover:border-blue-300 transition-all cursor-pointer"
        >
          {/* Header */}
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-semibold flex-shrink-0">
                {employee.full_name
                  .split(' ')
                  .map((n) => n[0])
                  .join('')
                  .toUpperCase()
                  .slice(0, 2)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-gray-900 truncate">{employee.full_name}</div>
                <div className="text-sm text-gray-600 truncate">
                  {employee.position || 'No position'}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0 ml-2">
              {employee.active !== false ? (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  Active
                </span>
              ) : (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                  Inactive
                </span>
              )}
            </div>
          </div>

          {/* Employment Type */}
          <div className="mb-3">
            <span
              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getEmploymentTypeBadge(
                employee.employment_type
              )}`}
            >
              {getEmploymentTypeLabel(employee.employment_type)}
            </span>
          </div>

          {/* Contact Info */}
          <div className="space-y-2 mb-3">
            {employee.email && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Mail size={14} className="flex-shrink-0" />
                <span className="truncate">{employee.email}</span>
              </div>
            )}
            {employee.phone && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Phone size={14} className="flex-shrink-0" />
                <span>{employee.phone}</span>
              </div>
            )}
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-2 gap-3 mb-3 pb-3 border-b">
            {/* Salary */}
            <div>
              <div className="flex items-center gap-1 text-xs text-gray-500 mb-1">
                <DollarSign size={12} />
                <span>Salary</span>
              </div>
              <div className="text-sm font-medium text-gray-900">
                {employee.base_salary
                  ? formatCurrency(employee.base_salary)
                  : employee.hourly_rate
                    ? `$${employee.hourly_rate}/hr`
                    : '-'}
              </div>
            </div>

            {/* Start Date */}
            <div>
              <div className="flex items-center gap-1 text-xs text-gray-500 mb-1">
                <Calendar size={12} />
                <span>Started</span>
              </div>
              <div className="text-sm font-medium text-gray-900">
                {formatDate(employee.start_date) || '-'}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between">
            <div className="text-xs text-gray-500">
              {employee.department && <span>{employee.department}</span>}
            </div>
            <ChevronRight size={16} className="text-gray-400" />
          </div>
        </div>
      ))}
    </div>
  );
}
