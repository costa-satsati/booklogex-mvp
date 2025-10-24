// src/app/dashboard/employees/[id]/page.tsx
'use client';

import { use, useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { Button } from '@/components/ui/button';
import {
  ArrowLeft,
  Edit2,
  Loader2,
  CheckCircle2,
  XCircle,
  TrendingUp,
  Calendar,
  Clock,
  AlertCircle,
} from 'lucide-react';
import { notify } from '@/lib/notify';
import type { Employee, LeaveTransaction } from '@/types/employee';
import { calculateYearsOfService, isEligibleForLeave } from '@/lib/leave-calculator';
import EditEmployeeDrawer from '../_components/EditEmployeeDrawer';
import LeaveBalanceCard from './_components/LeaveBalanceCard';
import LeaveHistoryTable from './_components/LeaveHistoryTable';
import LeaveAdjustmentModal from './_components/LeaveAdjustmentModal';

type Tab = 'personal' | 'employment' | 'bank-super' | 'tax' | 'leave';

export default function EmployeeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('personal');
  const [deactivating, setDeactivating] = useState(false);
  const [leaveTransactions, setLeaveTransactions] = useState<LeaveTransaction[]>([]);
  const [showLeaveAdjustment, setShowLeaveAdjustment] = useState(false);
  const [isEditDrawerOpen, setIsEditDrawerOpen] = useState(false);
  const [showDeactivateModal, setShowDeactivateModal] = useState(false);

  const fetchEmployee = useCallback(async () => {
    try {
      setLoading(true);

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase.from('employees').select('*').eq('id', id).single();

      if (error) throw error;

      setEmployee(data);
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
      console.error('Error fetching employee:', error);
      notify.error('Error', 'Failed to load employee details');
      router.push('/dashboard/employees');
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  useEffect(() => {
    fetchEmployee();
  }, [fetchEmployee]);

  const handleDeactivateClick = () => {
    setShowDeactivateModal(true);
  };

  const handleDeactivateConfirm = async () => {
    if (!employee) return;

    const action = employee.active !== false ? 'deactivate' : 'activate';

    setDeactivating(true);
    try {
      const { error } = await supabase
        .from('employees')
        .update({ active: employee.active === false })
        .eq('id', employee.id);

      if (error) throw error;

      notify.success('Success', `${employee.full_name} ${action}d successfully`);
      setShowDeactivateModal(false);
      fetchEmployee();
    } catch (error) {
      console.error('Error updating employee:', error);
      notify.error('Error', 'Failed to update employee');
    } finally {
      setDeactivating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Employee not found</p>
        <Button onClick={() => router.push('/dashboard/employees')} className="mt-4">
          Back to Employees
        </Button>
      </div>
    );
  }

  const yearsOfService = employee.start_date ? calculateYearsOfService(employee.start_date) : 0;
  const eligibleForLeave = isEligibleForLeave(employee, 'annual');

  const tabs: { id: Tab; label: string }[] = [
    { id: 'personal', label: 'Personal Details' },
    { id: 'employment', label: 'Employment' },
    { id: 'bank-super', label: 'Bank & Super' },
    { id: 'tax', label: 'Tax Details' },
    { id: 'leave', label: 'Leave' },
  ];

  return (
    <>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="flex-1">
            <button
              onClick={() => router.push('/dashboard/employees')}
              className="flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium mb-4"
            >
              <ArrowLeft size={18} />
              Back to Employees
            </button>

            <div className="flex items-start gap-4">
              <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-2xl flex-shrink-0">
                {employee.full_name
                  .split(' ')
                  .map((n) => n[0])
                  .join('')
                  .toUpperCase()
                  .slice(0, 2)}
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">{employee.full_name}</h1>
                <p className="text-gray-600 mt-1">
                  {employee.position || 'No position'} •{' '}
                  {employee.employment_type
                    .split('_')
                    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
                    .join('-')}
                </p>
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setIsEditDrawerOpen(true)}>
              <Edit2 size={18} className="mr-2" />
              Edit
            </Button>
            <Button
              variant="outline"
              onClick={handleDeactivateClick}
              disabled={deactivating}
              className={employee.active !== false ? 'text-red-600 hover:bg-red-50' : ''}
            >
              {deactivating ? (
                <>
                  <Loader2 size={18} className="mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  {employee.active !== false ? (
                    <>
                      <XCircle size={18} className="mr-2" />
                      Deactivate
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={18} className="mr-2" />
                      Activate
                    </>
                  )}
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Status Banner */}
        {employee.active === false && (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 flex items-center gap-3">
            <XCircle className="text-gray-600" size={20} />
            <div>
              <div className="font-medium text-gray-900">Employee Inactive</div>
              <div className="text-sm text-gray-600">
                This employee has been deactivated and will not appear in payroll runs
              </div>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="bg-white border rounded-lg overflow-hidden">
          {/* Tab Headers */}
          <div className="border-b overflow-x-auto">
            <div className="flex">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-6 py-3 font-medium text-sm whitespace-nowrap border-b-2 transition-colors ${
                    activeTab === tab.id
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {activeTab === 'personal' && <PersonalDetailsTab employee={employee} />}
            {activeTab === 'employment' && <EmploymentDetailsTab employee={employee} />}
            {activeTab === 'bank-super' && <BankSuperTab employee={employee} />}
            {activeTab === 'tax' && <TaxDetailsTab employee={employee} />}
            {activeTab === 'leave' && (
              <LeaveTab
                employee={employee}
                leaveTransactions={leaveTransactions}
                eligibleForLeave={eligibleForLeave}
                setShowLeaveAdjustment={setShowLeaveAdjustment}
              />
            )}
          </div>
        </div>
      </div>

      {/* Leave Adjustment Modal */}
      {showLeaveAdjustment && (
        <LeaveAdjustmentModal
          employee={employee}
          onClose={() => setShowLeaveAdjustment(false)}
          onSuccess={() => {
            setShowLeaveAdjustment(false);
            fetchEmployee();
          }}
        />
      )}

      {/* Edit Drawer */}
      {isEditDrawerOpen && (
        <EditEmployeeDrawer
          employee={employee}
          onClose={() => setIsEditDrawerOpen(false)}
          onUpdated={() => {
            setIsEditDrawerOpen(false);
            fetchEmployee();
          }}
        />
      )}

      {/* Deactivate/Activate Confirmation Modal */}
      {showDeactivateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-md shadow-2xl">
            <div className="px-6 py-4 border-b">
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    employee.active !== false ? 'bg-red-100' : 'bg-green-100'
                  }`}
                >
                  <AlertCircle
                    className={employee.active !== false ? 'text-red-600' : 'text-green-600'}
                    size={20}
                  />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900">
                    {employee.active !== false ? 'Deactivate' : 'Activate'} Employee
                  </h2>
                  <p className="text-sm text-gray-600">
                    {employee.active !== false
                      ? 'This will mark the employee as inactive'
                      : 'This will reactivate the employee'}
                  </p>
                </div>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <p className="text-gray-700">
                {employee.active !== false
                  ? 'Are you sure you want to deactivate this employee? They will no longer appear in active employee lists but their records will be preserved.'
                  : 'Are you sure you want to reactivate this employee? They will be restored to active status.'}
              </p>

              <div
                className={`rounded-lg p-4 border-2 ${
                  employee.active !== false
                    ? 'bg-red-50 border-red-200'
                    : 'bg-green-50 border-green-200'
                }`}
              >
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Employee</span>
                    <span className="font-medium">{employee.full_name}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Position</span>
                    <span className="font-medium">{employee.position || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Current Status</span>
                    <span className="font-medium">
                      {employee.active !== false ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="border-t px-6 py-4 bg-gray-50 flex gap-3">
              <button
                onClick={() => setShowDeactivateModal(false)}
                disabled={deactivating}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDeactivateConfirm}
                disabled={deactivating}
                className={`flex-1 px-4 py-2 text-white rounded-lg transition-colors font-medium disabled:opacity-50 ${
                  employee.active !== false
                    ? 'bg-red-600 hover:bg-red-700'
                    : 'bg-green-600 hover:bg-green-700'
                }`}
              >
                {deactivating
                  ? 'Processing...'
                  : employee.active !== false
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

// Personal Details Tab
function PersonalDetailsTab({ employee }: { employee: Employee }) {
  const InfoRow = ({ label, value }: { label: string; value?: string | null }) => (
    <div className="flex py-3 border-b last:border-b-0">
      <div className="w-1/3 text-sm font-medium text-gray-700">{label}</div>
      <div className="w-2/3 text-sm text-gray-900">{value || '-'}</div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Contact Information</h3>
        <div className="bg-gray-50 rounded-lg p-4">
          <InfoRow label="Full Name" value={employee.full_name} />
          <InfoRow label="Email" value={employee.email} />
          <InfoRow label="Phone" value={employee.phone} />
          <InfoRow label="Address" value={employee.address} />
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Personal Details</h3>
        <div className="bg-gray-50 rounded-lg p-4">
          <InfoRow
            label="Date of Birth"
            value={
              employee.date_of_birth
                ? new Date(employee.date_of_birth).toLocaleDateString('en-AU')
                : undefined
            }
          />
          <InfoRow label="Department" value={employee.department} />
          <InfoRow label="Notes" value={employee.notes} />
        </div>
      </div>
    </div>
  );
}

// Employment Details Tab
function EmploymentDetailsTab({ employee }: { employee: Employee }) {
  const InfoRow = ({ label, value }: { label: string; value?: string | null }) => (
    <div className="flex py-3 border-b last:border-b-0">
      <div className="w-1/3 text-sm font-medium text-gray-700">{label}</div>
      <div className="w-2/3 text-sm text-gray-900">{value || '-'}</div>
    </div>
  );

  const formatCurrency = (value?: number) => {
    if (!value) return undefined;
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: 'AUD',
    }).format(value);
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Employment Information</h3>
        <div className="bg-gray-50 rounded-lg p-4">
          <InfoRow label="Position" value={employee.position} />
          <InfoRow
            label="Employment Type"
            value={employee.employment_type
              .split('_')
              .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
              .join('-')}
          />
          <InfoRow
            label="Start Date"
            value={
              employee.start_date
                ? new Date(employee.start_date).toLocaleDateString('en-AU')
                : undefined
            }
          />
          <InfoRow
            label="End Date"
            value={
              employee.end_date
                ? new Date(employee.end_date).toLocaleDateString('en-AU')
                : undefined
            }
          />
          <InfoRow label="Status" value={employee.active !== false ? 'Active' : 'Inactive'} />
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Compensation</h3>
        <div className="bg-gray-50 rounded-lg p-4">
          <InfoRow
            label="Rate Type"
            value={
              employee.rate_type
                ? employee.rate_type.charAt(0).toUpperCase() + employee.rate_type.slice(1)
                : undefined
            }
          />
          <InfoRow label="Base Salary" value={formatCurrency(employee.base_salary)} />
          <InfoRow
            label="Hourly Rate"
            value={employee.hourly_rate ? `$${employee.hourly_rate}/hr` : undefined}
          />
          <InfoRow
            label="Hours per Week"
            value={employee.hours_per_week ? `${employee.hours_per_week} hours` : undefined}
          />
          <InfoRow
            label="Pay Frequency"
            value={
              employee.pay_frequency
                ? employee.pay_frequency.charAt(0).toUpperCase() + employee.pay_frequency.slice(1)
                : undefined
            }
          />
        </div>
      </div>
    </div>
  );
}

// Bank & Super Tab
function BankSuperTab({ employee }: { employee: Employee }) {
  const InfoRow = ({ label, value }: { label: string; value?: string | null }) => (
    <div className="flex py-3 border-b last:border-b-0">
      <div className="w-1/3 text-sm font-medium text-gray-700">{label}</div>
      <div className="w-2/3 text-sm text-gray-900">{value || '-'}</div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Bank Details</h3>
        <div className="bg-gray-50 rounded-lg p-4">
          <InfoRow label="BSB" value={employee.bank_bsb} />
          <InfoRow label="Account Number" value={employee.bank_account} />
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Superannuation</h3>
        <div className="bg-gray-50 rounded-lg p-4">
          <InfoRow label="Super Fund" value={employee.super_fund} />
          <InfoRow label="Member Number" value={employee.super_member_number} />
          <InfoRow
            label="Super Rate"
            value={employee.super_rate ? `${employee.super_rate}%` : undefined}
          />
        </div>
      </div>
    </div>
  );
}

// Tax Details Tab
function TaxDetailsTab({ employee }: { employee: Employee }) {
  const InfoRow = ({ label, value }: { label: string; value?: string | null }) => (
    <div className="flex py-3 border-b last:border-b-0">
      <div className="w-1/3 text-sm font-medium text-gray-700">{label}</div>
      <div className="w-2/3 text-sm text-gray-900">{value || '-'}</div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Tax Information</h3>
        <div className="bg-gray-50 rounded-lg p-4">
          <InfoRow label="TFN" value={employee.tfn ? '•••••••••' : 'Not provided'} />
          <InfoRow label="ABN" value={employee.abn} />
          <InfoRow label="Tax Free Threshold" value={employee.tax_free_threshold ? 'Yes' : 'No'} />
          <InfoRow label="HELP Debt" value={employee.help_debt ? 'Yes' : 'No'} />
          <InfoRow
            label="Tax Rate"
            value={employee.tax_rate ? `${employee.tax_rate}%` : undefined}
          />
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">STP Phase 2 Details</h3>
        <div className="bg-gray-50 rounded-lg p-4">
          <InfoRow label="Country Code" value={employee.country_code || 'AU'} />
          <InfoRow
            label="Tax Scale Type"
            value={
              employee.tax_scale_type
                ? employee.tax_scale_type
                    .split('_')
                    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
                    .join(' ')
                : undefined
            }
          />
        </div>
      </div>
    </div>
  );
}

// Leave Tab
function LeaveTab({
  employee,
  leaveTransactions,
  eligibleForLeave,
  setShowLeaveAdjustment,
}: {
  employee: Employee;
  leaveTransactions: LeaveTransaction[];
  eligibleForLeave: boolean;
  setShowLeaveAdjustment: (show: boolean) => void;
}) {
  const InfoRow = ({ label, value }: { label: string; value?: string | null }) => (
    <div className="flex py-3 border-b last:border-b-0">
      <div className="w-1/3 text-sm font-medium text-gray-700">{label}</div>
      <div className="w-2/3 text-sm text-gray-900">{value || '-'}</div>
    </div>
  );

  return (
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
              <Button onClick={() => setShowLeaveAdjustment(true)} size="sm" variant="outline">
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
  );
}
