// src/app/dashboard/employees/[id]/page.tsx (NEW FILE)
'use client';

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { Button } from '@/components/ui/button';
import {
  ArrowLeft,
  Edit2,
  Trash2,
  Mail,
  Phone,
  MapPin,
  CheckCircle2,
  X,
  Calendar,
  DollarSign,
  TrendingUp,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { notify } from '@/lib/notify';
import { format } from 'date-fns';
import { formatCurrency } from '@/lib/tax-calculator';
import type { Employee } from '@/types/employee';
import EditEmployeeModal from '@/components/EditEmployeeModal';
import ConfirmDeleteModal from '@/components/ConfirmDeleteModal';

export default function EmployeeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(true);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    loadEmployee();
  }, [id]);

  const loadEmployee = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from('employees').select('*').eq('id', id).single();

      if (error) throw error;
      setEmployee(data);
    } catch (error) {
      console.error('Error loading employee:', error);
      notify.error('Error', 'Failed to load employee');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const { error } = await supabase.from('employees').delete().eq('id', id);

      if (error) throw error;

      notify.success('Deleted', 'Employee removed successfully');
      router.push('/dashboard/employees');
    } catch (error) {
      console.error('Error deleting employee:', error);
      notify.error('Error', 'Failed to delete employee');
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="p-6 text-center">
        <p className="text-gray-600">Employee not found</p>
        <Button onClick={() => router.push('/dashboard/employees')} className="mt-4">
          Back to Employees
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="border-b pb-6">
          <Button
            variant="ghost"
            onClick={() => router.push('/dashboard/employees')}
            className="mb-4"
          >
            <ArrowLeft size={18} className="mr-2" />
            Back to Employees
          </Button>

          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center text-2xl font-bold text-blue-600">
                {employee.full_name
                  .split(' ')
                  .map((n) => n[0])
                  .join('')}
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">{employee.full_name}</h1>
                <p className="text-gray-600 mt-1">
                  {employee.position || 'No position'} •{' '}
                  {employee.employment_type?.replace('_', ' ')}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setShowEditModal(true)}>
                <Edit2 size={16} className="mr-2" />
                Edit
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowDeleteModal(true)}
                className="border-red-200 text-red-600 hover:bg-red-50"
              >
                <Trash2 size={16} className="mr-2" />
                Delete
              </Button>
            </div>
          </div>
        </div>

        {/* Status Banner */}
        <div
          className={`rounded-lg p-4 flex items-center gap-3 ${
            employee.active
              ? 'bg-green-50 border border-green-200'
              : 'bg-gray-50 border border-gray-200'
          }`}
        >
          {employee.active ? (
            <CheckCircle2 className="text-green-600" size={20} />
          ) : (
            <AlertCircle className="text-gray-600" size={20} />
          )}
          <div>
            <div className="font-medium text-gray-900">
              {employee.active ? 'Active Employee' : 'Inactive Employee'}
            </div>
            <div className="text-sm text-gray-600">
              {employee.start_date
                ? `Working since ${format(new Date(employee.start_date), 'd MMMM yyyy')}`
                : 'No start date set'}
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white border rounded-lg p-5">
            <div className="text-sm text-gray-600 mb-2">Pay Frequency</div>
            <div className="text-2xl font-bold text-gray-900 capitalize">
              {employee.pay_frequency}
            </div>
          </div>
          <div className="bg-white border rounded-lg p-5">
            <div className="text-sm text-gray-600 mb-2">Rate</div>
            <div className="text-2xl font-bold text-gray-900">
              {employee.base_salary
                ? formatCurrency(employee.base_salary)
                : employee.hourly_rate
                  ? `$${employee.hourly_rate}/hr`
                  : 'Not set'}
            </div>
          </div>
          <div className="bg-white border rounded-lg p-5">
            <div className="text-sm text-gray-600 mb-2">Super Rate</div>
            <div className="text-2xl font-bold text-gray-900">{employee.super_rate}%</div>
          </div>
        </div>

        {/* Personal Information */}
        <div className="bg-white border rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Personal Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {employee.email && (
              <div className="flex items-start gap-3 p-3 bg-gray-50 rounded">
                <Mail className="text-gray-400 mt-0.5" size={18} />
                <div>
                  <div className="text-xs text-gray-600">Email</div>
                  <div className="font-medium text-gray-900">{employee.email}</div>
                </div>
              </div>
            )}

            <div className="flex items-start gap-3 p-3 bg-gray-50 rounded">
              <Calendar className="text-gray-400 mt-0.5" size={18} />
              <div>
                <div className="text-xs text-gray-600">Start Date</div>
                <div className="font-medium text-gray-900">
                  {employee.start_date
                    ? format(new Date(employee.start_date), 'd MMMM yyyy')
                    : 'Not set'}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tax & Compliance */}
        <div className="bg-white border rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Tax & Compliance</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 border rounded-lg">
              <div className="text-sm text-gray-600 mb-1">
                {employee.employment_type === 'contractor' ? 'ABN' : 'TFN'}
              </div>
              <div className="font-medium text-gray-900">{employee.tfn || 'Not provided'}</div>
            </div>

            <div className="p-4 border rounded-lg">
              <div className="text-sm text-gray-600 mb-1">Tax-free Threshold</div>
              <div className="flex items-center gap-2">
                {employee.tax_free_threshold ? (
                  <>
                    <CheckCircle2 size={16} className="text-green-600" />
                    <span className="font-medium text-gray-900">Yes</span>
                  </>
                ) : (
                  <>
                    <X size={16} className="text-gray-600" />
                    <span className="font-medium text-gray-900">No</span>
                  </>
                )}
              </div>
            </div>

            <div className="p-4 border rounded-lg">
              <div className="text-sm text-gray-600 mb-1">HELP Debt</div>
              <div className="flex items-center gap-2">
                {employee.help_debt ? (
                  <>
                    <CheckCircle2 size={16} className="text-amber-600" />
                    <span className="font-medium text-gray-900">Yes</span>
                  </>
                ) : (
                  <>
                    <X size={16} className="text-gray-600" />
                    <span className="font-medium text-gray-900">No</span>
                  </>
                )}
              </div>
            </div>

            <div className="p-4 border rounded-lg">
              <div className="text-sm text-gray-600 mb-1">Super Rate</div>
              <div className="font-medium text-gray-900">{employee.super_rate}%</div>
            </div>
          </div>
        </div>

        {/* Notes */}
        {employee.notes && (
          <div className="bg-white border rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Notes</h3>
            <p className="text-gray-700 whitespace-pre-wrap">{employee.notes}</p>
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {showEditModal && (
        <EditEmployeeModal
          employee={employee}
          onClose={() => setShowEditModal(false)}
          onUpdated={() => {
            loadEmployee();
            setShowEditModal(false);
          }}
        />
      )}

      {showDeleteModal && (
        <ConfirmDeleteModal
          title="Delete Employee"
          message={`Are you sure you want to delete ${employee.full_name}? This action cannot be undone.`}
          employeeName={employee.full_name}
          onCancel={() => setShowDeleteModal(false)}
          onConfirm={handleDelete}
          loading={deleting}
        />
      )}
    </div>
  );
}
