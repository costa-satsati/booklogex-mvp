// src/app/dashboard/employees/[id]/page.tsx - COMPLETE VERSION
'use client';

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { notify } from '@/lib/notify';
import { useOrgContext } from '@/context/OrgContext';
import { Button } from '@/components/ui/button';
import {
  ArrowLeft,
  Edit2,
  Trash2,
  CheckCircle2,
  X,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Clock,
  TrendingUp,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { format } from 'date-fns';
import { formatCurrency } from '@/lib/tax-calculator';
import type { Employee, LeaveTransaction } from '@/types/employee';
import {
  formatLeaveBalance,
  calculateYearsOfService,
  isEligibleForLeave,
} from '@/lib/leave-calculator';
import EditEmployeeModal from '@/components/EditEmployeeModal';
import ConfirmDeleteModal from '@/components/ConfirmDeleteModal';
import LeaveBalanceCard from './_components/LeaveBalanceCard';
import LeaveHistoryTable from './_components/LeaveHistoryTable';
import LeaveAdjustmentModal from './_components/LeaveAdjustmentModal';

type TabKey = 'overview' | 'leave' | 'payment' | 'documents';

export default function EmployeeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { organisation } = useOrgContext();

  const [employee, setEmployee] = useState<Employee | null>(null);
  const [leaveTransactions, setLeaveTransactions] = useState<LeaveTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabKey>('overview');
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showLeaveAdjustment, setShowLeaveAdjustment] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (organisation?.id) {
      loadEmployeeData();
    }
  }, [id, organisation?.id]);

  const loadEmployeeData = async () => {
    if (!organisation?.id) return;

    setLoading(true);
    try {
      // Fetch employee
      const { data: empData, error: empError } = await supabase
        .from('employees')
        .select('*')
        .eq('id', id)
        .eq('org_id', organisation.id)
        .single();

      if (empError) throw empError;
      setEmployee(empData);

      // Fetch leave transactions
      const { data: txData, error: txError } = await supabase
        .from('leave_transactions')
        .select('*')
        .eq('employee_id', id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (txError) throw txError;
      setLeaveTransactions(txData || []);
    } catch (error) {
      console.error('Error loading employee:', error);
      notify.error('Error', 'Failed to load employee data');
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

  const yearsOfService = employee.start_date ? calculateYearsOfService(employee.start_date) : 0;
  const eligibleForLeave = isEligibleForLeave(employee, 'annual');

  const tabs: Array<{ key: TabKey; label: string }> = [
    { key: 'overview', label: 'Overview' },
    { key: 'leave', label: 'Leave' },
    { key: 'payment', label: 'Payment' },
    { key: 'documents', label: 'Documents' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => router.push('/dashboard/employees')}
            className="mb-4"
          >
            <ArrowLeft size={16} className="mr-2" />
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
                className="text-red-600 border-red-200 hover:bg-red-50"
              >
                <Trash2 size={16} className="mr-2" />
                Delete
              </Button>
            </div>
          </div>
        </div>

        {/* Status Banner */}
        <div
          className={`rounded-lg p-4 mb-6 flex items-center gap-3 ${
            employee.active
              ? 'bg-green-50 border border-green-200'
              : 'bg-amber-50 border border-amber-200'
          }`}
        >
          {employee.active ? (
            <CheckCircle2 className="text-green-600" size={20} />
          ) : (
            <X className="text-amber-600" size={20} />
          )}
          <div>
            <div className="font-medium text-gray-900">
              {employee.active ? 'Active Employee' : 'Inactive'}
            </div>
            <div className="text-sm text-gray-600">
              {employee.active ? `${yearsOfService} years of service` : 'No longer employed'}
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white border rounded-lg p-5">
            <div className="text-sm text-gray-600 mb-2">Pay Frequency</div>
            <div className="text-2xl font-bold text-gray-900 capitalize">
              {employee.pay_frequency || 'Not set'}
            </div>
          </div>
          <div className="bg-white border rounded-lg p-5">
            <div className="text-sm text-gray-600 mb-2">Base Rate</div>
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
            <div className="text-2xl font-bold text-gray-900">{employee.super_rate || 11.5}%</div>
          </div>
          <div className="bg-white border rounded-lg p-5">
            <div className="text-sm text-gray-600 mb-2">Employment Type</div>
            <div className="text-lg font-bold text-gray-900 capitalize">
              {employee.employment_type?.replace('_', ' ') || 'Not set'}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white border rounded-lg mb-6">
          <div className="border-b flex">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-6 py-3 font-medium text-sm transition-colors ${
                  activeTab === tab.key
                    ? 'border-b-2 border-blue-600 text-blue-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {activeTab === 'overview' && (
              <div className="space-y-6">
                {/* Personal Information */}
                <div>
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
                    {employee.phone && (
                      <div className="flex items-start gap-3 p-3 bg-gray-50 rounded">
                        <Phone className="text-gray-400 mt-0.5" size={18} />
                        <div>
                          <div className="text-xs text-gray-600">Phone</div>
                          <div className="font-medium text-gray-900">{employee.phone}</div>
                        </div>
                      </div>
                    )}
                    {employee.address && (
                      <div className="flex items-start gap-3 p-3 bg-gray-50 rounded md:col-span-2">
                        <MapPin className="text-gray-400 mt-0.5" size={18} />
                        <div>
                          <div className="text-xs text-gray-600">Address</div>
                          <div className="font-medium text-gray-900">{employee.address}</div>
                        </div>
                      </div>
                    )}
                    {employee.start_date && (
                      <div className="flex items-start gap-3 p-3 bg-gray-50 rounded">
                        <Calendar className="text-gray-400 mt-0.5" size={18} />
                        <div>
                          <div className="text-xs text-gray-600">Start Date</div>
                          <div className="font-medium text-gray-900">
                            {format(new Date(employee.start_date), 'd MMMM yyyy')}
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            {yearsOfService} years of service
                          </div>
                        </div>
                      </div>
                    )}
                    {employee.date_of_birth && (
                      <div className="flex items-start gap-3 p-3 bg-gray-50 rounded">
                        <Calendar className="text-gray-400 mt-0.5" size={18} />
                        <div>
                          <div className="text-xs text-gray-600">Date of Birth</div>
                          <div className="font-medium text-gray-900">
                            {format(new Date(employee.date_of_birth), 'd MMMM yyyy')}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Employment Details */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Employment Details</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 border rounded-lg">
                      <div className="text-sm text-gray-600 mb-1">Position</div>
                      <div className="font-medium text-gray-900">
                        {employee.position || 'Not specified'}
                      </div>
                    </div>
                    <div className="p-4 border rounded-lg">
                      <div className="text-sm text-gray-600 mb-1">Department</div>
                      <div className="font-medium text-gray-900">
                        {employee.department || 'Not specified'}
                      </div>
                    </div>
                    <div className="p-4 border rounded-lg">
                      <div className="text-sm text-gray-600 mb-1">Employment Type</div>
                      <div className="font-medium text-gray-900 capitalize">
                        {employee.employment_type?.replace('_', ' ')}
                      </div>
                    </div>
                    <div className="p-4 border rounded-lg">
                      <div className="text-sm text-gray-600 mb-1">Hours Per Week</div>
                      <div className="font-medium text-gray-900">
                        {employee.hours_per_week || 'Not specified'}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Tax & Compliance */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Tax & Compliance</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 border rounded-lg">
                      <div className="text-sm text-gray-600 mb-1">
                        {employee.employment_type === 'contractor' ? 'ABN' : 'TFN'}
                      </div>
                      <div className="font-medium text-gray-900">
                        {employee.tfn || 'Not provided'}
                      </div>
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
                      <div className="font-medium text-gray-900">
                        {employee.super_rate || 11.5}%
                      </div>
                    </div>
                  </div>
                </div>

                {/* Notes */}
                {employee.notes && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Notes</h3>
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <p className="text-gray-700 whitespace-pre-wrap">{employee.notes}</p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'leave' && (
              <div className="space-y-6">
                {/* Leave Eligibility Banner */}
                {!eligibleForLeave && (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                    <div className="flex items-center gap-2 text-amber-900 font-medium mb-1">
                      <Clock size={18} />
                      Not Eligible for Paid Leave
                    </div>
                    <p className="text-sm text-amber-700">
                      {employee.employment_type === 'casual'
                        ? 'Casual employees receive leave loading instead of paid leave.'
                        : 'Contractors manage their own leave arrangements.'}
                    </p>
                  </div>
                )}

                {eligibleForLeave && (
                  <>
                    {/* Leave Balance Cards */}
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-gray-900">Leave Balances</h3>
                        <Button
                          onClick={() => setShowLeaveAdjustment(true)}
                          size="sm"
                          variant="outline"
                        >
                          <TrendingUp size={16} className="mr-2" />
                          Adjust Leave
                        </Button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <LeaveBalanceCard
                          title="Annual Leave"
                          hours={employee.annual_leave_hours || 0}
                          hoursPerDay={employee.hours_per_week ? employee.hours_per_week / 5 : 7.6}
                          color="blue"
                          icon={<Calendar size={20} />}
                        />
                        <LeaveBalanceCard
                          title="Sick Leave"
                          hours={employee.sick_leave_hours || 0}
                          hoursPerDay={employee.hours_per_week ? employee.hours_per_week / 5 : 7.6}
                          color="green"
                          icon={<Clock size={20} />}
                        />
                        <LeaveBalanceCard
                          title="Personal Leave"
                          hours={employee.personal_leave_hours || 0}
                          hoursPerDay={employee.hours_per_week ? employee.hours_per_week / 5 : 7.6}
                          color="purple"
                          icon={<Clock size={20} />}
                        />
                      </div>
                    </div>

                    {/* Leave History */}
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Leave History</h3>
                      <LeaveHistoryTable
                        transactions={leaveTransactions}
                        hoursPerDay={employee.hours_per_week ? employee.hours_per_week / 5 : 7.6}
                      />
                    </div>
                  </>
                )}
              </div>
            )}

            {activeTab === 'payment' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Payment Details</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 border rounded-lg">
                      <div className="text-sm text-gray-600 mb-1">Pay Frequency</div>
                      <div className="font-medium text-gray-900 capitalize">
                        {employee.pay_frequency || 'Not set'}
                      </div>
                    </div>
                    <div className="p-4 border rounded-lg">
                      <div className="text-sm text-gray-600 mb-1">Rate Type</div>
                      <div className="font-medium text-gray-900 capitalize">
                        {employee.rate_type || 'Not set'}
                      </div>
                    </div>
                    <div className="p-4 border rounded-lg">
                      <div className="text-sm text-gray-600 mb-1">Base Salary/Rate</div>
                      <div className="font-medium text-gray-900">
                        {employee.base_salary ? formatCurrency(employee.base_salary) : 'Not set'}
                      </div>
                    </div>
                    <div className="p-4 border rounded-lg">
                      <div className="text-sm text-gray-600 mb-1">Hours Per Week</div>
                      <div className="font-medium text-gray-900">
                        {employee.hours_per_week || 'Not set'}
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Superannuation</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 border rounded-lg">
                      <div className="text-sm text-gray-600 mb-1">Super Fund</div>
                      <div className="font-medium text-gray-900">
                        {employee.super_fund || 'Not specified'}
                      </div>
                    </div>
                    <div className="p-4 border rounded-lg">
                      <div className="text-sm text-gray-600 mb-1">Member Number</div>
                      <div className="font-medium text-gray-900">
                        {employee.super_member_number || 'Not specified'}
                      </div>
                    </div>
                    <div className="p-4 border rounded-lg">
                      <div className="text-sm text-gray-600 mb-1">Super Rate</div>
                      <div className="font-medium text-gray-900">
                        {employee.super_rate || 11.5}%
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Banking Details</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 border rounded-lg">
                      <div className="text-sm text-gray-600 mb-1">BSB</div>
                      <div className="font-medium text-gray-900">
                        {employee.bank_bsb || 'Not provided'}
                      </div>
                    </div>
                    <div className="p-4 border rounded-lg">
                      <div className="text-sm text-gray-600 mb-1">Account Number</div>
                      <div className="font-medium text-gray-900">
                        {employee.bank_account || 'Not provided'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'documents' && (
              <div className="text-center py-12 text-gray-500">
                <p>Document management coming soon</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      {showEditModal && (
        <EditEmployeeModal
          employee={employee}
          onClose={() => setShowEditModal(false)}
          onUpdated={() => {
            loadEmployeeData();
            setShowEditModal(false);
          }}
        />
      )}

      {/* Delete Modal */}
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

      {/* Leave Adjustment Modal */}
      {showLeaveAdjustment && (
        <LeaveAdjustmentModal
          employee={employee}
          onClose={() => setShowLeaveAdjustment(false)}
          onSuccess={() => {
            setShowLeaveAdjustment(false);
            loadEmployeeData();
          }}
        />
      )}
    </div>
  );
}
