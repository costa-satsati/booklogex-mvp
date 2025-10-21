'use client';

import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  PieChart,
  PieLabelRenderProps,
  Pie,
  Cell,
} from 'recharts';
import { saveAs } from 'file-saver';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Users,
  FileText,
  AlertCircle,
  CheckCircle2,
  Calendar,
  Download,
  ChevronRight,
  Briefcase,
  Receipt,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import OnboardingBanner from '@/components/OnboardingBanner';
import { useOrgContext } from '@/context/OrgContext';
import { checkLeaveAlerts, LeaveAlert } from '@/lib/leave-alerts';
import type { Employee } from '@/types/employee';

type Summary = {
  income: number;
  expenses: number;
  gstCollected: number;
  gstPaid: number;
  wages: number;
  payg: number;
  super: number;
};

type PeriodOption = 'thisMonth' | 'lastMonth' | 'quarterToDate' | 'financialYearToDate' | 'allTime';

export default function DashboardPage() {
  const router = useRouter();
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<PeriodOption>('thisMonth');
  const [employeeCount, setEmployeeCount] = useState(0);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [upcomingPayDate, setUpcomingPayDate] = useState<string | null>(null);
  const [onboardingStatus, setOnboardingStatus] = useState({
    hasBusinessName: false,
    hasEmployees: false,
    hasPayrollRun: false,
  });
  const [checkingOnboarding, setCheckingOnboarding] = useState(true);
  const { organisation, loading: orgLoading } = useOrgContext();
  const [leaveAlerts, setLeaveAlerts] = useState<LeaveAlert[]>([]);

  useEffect(() => {
    if (employees.length > 0) {
      const alerts = checkLeaveAlerts(employees);
      setLeaveAlerts(alerts);
    } else {
      setLeaveAlerts([]); // ✅ Clear alerts when no employees
    }
  }, [employees]);

  const getDateRange = useCallback(() => {
    const now = new Date();
    let start: Date | null = null;
    let end: Date | null = new Date(now);
    const fyStartMonth = 6;

    switch (period) {
      case 'thisMonth':
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'lastMonth':
        start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        end = new Date(now.getFullYear(), now.getMonth(), 0);
        break;
      case 'quarterToDate': {
        const quarter = Math.floor(now.getMonth() / 3);
        start = new Date(now.getFullYear(), quarter * 3, 1);
        break;
      }
      case 'financialYearToDate': {
        const fyStart =
          now.getMonth() >= fyStartMonth
            ? new Date(now.getFullYear(), fyStartMonth, 1)
            : new Date(now.getFullYear() - 1, fyStartMonth, 1);
        start = fyStart;
        break;
      }
      case 'allTime':
      default:
        start = null;
        end = null;
    }
    return { start, end };
  }, [period]);

  const loadSummary = useCallback(async () => {
    if (!organisation?.id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const { start, end } = getDateRange();

    try {
      let txnQuery = supabase
        .from('transactions')
        .select('type, amount, gst_amount, txn_date')
        .eq('org_id', organisation.id);

      let payrollQuery = supabase
        .from('payroll_runs')
        .select('total_gross, total_tax, total_super, pay_period_end')
        .eq('org_id', organisation.id)
        .in('status', ['finalized', 'completed']);

      if (start && end) {
        txnQuery = txnQuery.gte('txn_date', start.toISOString()).lte('txn_date', end.toISOString());
        payrollQuery = payrollQuery
          .gte('pay_period_end', start.toISOString())
          .lte('pay_period_end', end.toISOString());
      }

      const [
        { data: txns, error: txnError },
        { data: payroll, error: payrollError },
        { error: empError, count: empCount },
        { data: employeesData, error: empDataError },
        { data: upcomingRun, error: runError },
      ] = await Promise.all([
        txnQuery,
        payrollQuery,
        supabase
          .from('employees')
          .select('id', { count: 'exact', head: true })
          .eq('org_id', organisation.id)
          .eq('active', true),
        supabase
          .from('employees')
          .select('*')
          .eq('org_id', organisation.id)
          .eq('active', true)
          .order('full_name'),
        supabase
          .from('payroll_runs')
          .select('pay_date')
          .eq('org_id', organisation.id)
          .gte('pay_date', new Date().toISOString())
          .order('pay_date', { ascending: true })
          .limit(1)
          .maybeSingle(),
      ]);

      if (txnError) throw txnError;
      if (payrollError) throw payrollError;

      const income =
        txns
          ?.filter((t) => t.type === 'income')
          .reduce((s, t) => s + (t.amount - (t.gst_amount || 0)), 0) || 0;
      const expenses =
        txns
          ?.filter((t) => t.type === 'expense')
          .reduce((s, t) => s + (t.amount - (t.gst_amount || 0)), 0) || 0;
      const gstCollected =
        txns?.filter((t) => t.type === 'income').reduce((s, t) => s + (t.gst_amount || 0), 0) || 0;
      const gstPaid =
        txns?.filter((t) => t.type === 'expense').reduce((s, t) => s + (t.gst_amount || 0), 0) || 0;

      const wages = payroll?.reduce((s, p) => s + (p.total_gross || 0), 0) || 0;
      const payg = payroll?.reduce((s, p) => s + (p.total_tax || 0), 0) || 0;
      const superTotal = payroll?.reduce((s, p) => s + (p.total_super || 0), 0) || 0;

      setSummary({
        income,
        expenses,
        gstCollected,
        gstPaid,
        wages,
        payg,
        super: superTotal,
      });

      // ✅ FIX: Set employee count
      if (!empError) {
        setEmployeeCount(empCount || 0);
      }

      // ✅ FIX: Set employees data for leave alerts
      if (!empDataError && employeesData) {
        setEmployees(employeesData);
      }

      if (!runError && upcomingRun?.pay_date) {
        setUpcomingPayDate(upcomingRun.pay_date);
      }
    } catch (err) {
      console.error('❌ Failed to load dashboard summary:', err);
    } finally {
      setLoading(false);
    }
  }, [getDateRange, organisation?.id]);

  // Check onboarding status
  useEffect(() => {
    async function checkOnboarding() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return;

        // Check business name
        const { data: settings } = await supabase
          .from('organisations')
          .select('name')
          .eq('owner_id', user.id)
          .single();

        // Check employees
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('org_id')
          .eq('id', user.id)
          .single();

        const { count: employeeCount } = await supabase
          .from('employees')
          .select('id', { count: 'exact', head: true })
          .eq('org_id', profile?.org_id || '')
          .eq('active', true);

        // Check payroll runs
        const { count: payrollCount } = await supabase
          .from('payroll_runs')
          .select('id', { count: 'exact', head: true })
          .eq('org_id', profile?.org_id || '');

        setOnboardingStatus({
          hasBusinessName: !!settings?.name,
          hasEmployees: (employeeCount || 0) > 0,
          hasPayrollRun: (payrollCount || 0) > 0,
        });
      } catch (error) {
        console.error('Error checking onboarding:', error);
      } finally {
        setCheckingOnboarding(false);
      }
    }

    checkOnboarding();
  }, []);

  useEffect(() => {
    void loadSummary();
  }, [loadSummary]);

  if (loading || !summary) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p>Loading dashboard...</p>
        </div>
      </div>
    );
  }

  const gstPayable = summary.gstCollected - summary.gstPaid;
  const netProfit = summary.income - summary.expenses - summary.wages;

  const labelMap: Record<PeriodOption, string> = {
    thisMonth: 'This Month',
    lastMonth: 'Last Month',
    quarterToDate: 'Quarter-to-Date',
    financialYearToDate: 'FY-to-Date',
    allTime: 'All Time',
  };

  const chartData = [
    { name: 'Income', value: summary.income, color: '#3b82f6' },
    { name: 'Expenses', value: summary.expenses, color: '#ef4444' },
    { name: 'Wages', value: summary.wages, color: '#8b5cf6' },
  ];

  const pieData = [
    { name: 'Income', value: summary.income, color: '#10b981' },
    { name: 'Expenses', value: summary.expenses, color: '#f59e0b' },
    { name: 'Wages', value: summary.wages, color: '#6366f1' },
  ];

  // Export functions
  const exportCSV = () => {
    const rows = [
      ['Metric', 'Amount (AUD)'],
      ['Income (excl. GST)', summary.income],
      ['Expenses (excl. GST)', summary.expenses],
      ['GST Collected', summary.gstCollected],
      ['GST Paid', summary.gstPaid],
      ['GST Payable', gstPayable],
      ['Wages', summary.wages],
      ['PAYG Withheld', summary.payg],
      ['Superannuation', summary.super],
      ['Net Profit (pre-tax)', netProfit],
    ];
    const csvContent = rows.map((r) => r.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    saveAs(blob, `Dashboard_Summary_${labelMap[period].replace(/\s/g, '_')}.csv`);
  };

  const exportPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text(`Dashboard Summary - ${labelMap[period]}`, 14, 20);
    doc.setFontSize(12);

    autoTable(doc, {
      startY: 30,
      head: [['Metric', 'Amount (AUD)']],
      body: [
        [
          'Income (excl. GST)',
          summary.income.toLocaleString('en-AU', { style: 'currency', currency: 'AUD' }),
        ],
        [
          'Expenses (excl. GST)',
          summary.expenses.toLocaleString('en-AU', { style: 'currency', currency: 'AUD' }),
        ],
        [
          'GST Collected',
          summary.gstCollected.toLocaleString('en-AU', { style: 'currency', currency: 'AUD' }),
        ],
        [
          'GST Paid',
          summary.gstPaid.toLocaleString('en-AU', { style: 'currency', currency: 'AUD' }),
        ],
        ['GST Payable', gstPayable.toLocaleString('en-AU', { style: 'currency', currency: 'AUD' })],
        ['Wages', summary.wages.toLocaleString('en-AU', { style: 'currency', currency: 'AUD' })],
        [
          'PAYG Withheld',
          summary.payg.toLocaleString('en-AU', { style: 'currency', currency: 'AUD' }),
        ],
        [
          'Superannuation',
          summary.super.toLocaleString('en-AU', { style: 'currency', currency: 'AUD' }),
        ],
        [
          'Net Profit (pre-tax)',
          netProfit.toLocaleString('en-AU', { style: 'currency', currency: 'AUD' }),
        ],
      ],
    });

    doc.save(`Dashboard_Summary_${labelMap[period].replace(/\s/g, '_')}.pdf`);
  };

  const daysUntilPayDate = upcomingPayDate
    ? Math.ceil(
        (new Date(upcomingPayDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
      )
    : null;

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Onboarding Banner */}
      {!checkingOnboarding && (
        <OnboardingBanner
          hasBusinessName={onboardingStatus.hasBusinessName}
          hasEmployees={onboardingStatus.hasEmployees}
          hasPayrollRun={onboardingStatus.hasPayrollRun}
        />
      )}

      {/* Leave Alerts */}
      {leaveAlerts.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle size={18} className="text-amber-600" />
            <h3 className="font-semibold text-amber-900">Leave Balance Alerts</h3>
          </div>
          <div className="space-y-2">
            {leaveAlerts.slice(0, 3).map((alert, i) => (
              <div key={i} className="text-sm text-amber-700">
                • {alert.message}
              </div>
            ))}
            {leaveAlerts.length > 3 && (
              <button
                onClick={() => router.push('/dashboard/employees')}
                className="text-sm text-amber-600 hover:text-amber-700 font-medium"
              >
                View all {leaveAlerts.length} alerts →
              </button>
            )}
          </div>
        </div>
      )}

      {/* Header */}
      <div className="border-b pb-6">
        <h1 className="text-4xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-2">Here&apos;s what&apos;s happening with your business</p>
      </div>
      {/* Top Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <select
          value={period}
          onChange={(e) => setPeriod(e.target.value as PeriodOption)}
          className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {Object.entries(labelMap).map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </select>

        <div className="flex gap-2">
          <button
            onClick={exportCSV}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            <Download size={16} />
            CSV
          </button>
          <button
            onClick={exportPDF}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            <Download size={16} />
            PDF
          </button>
        </div>
      </div>
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-xl p-6 hover:shadow-lg transition-all hover:scale-105 cursor-pointer">
          <div className="flex items-center justify-between mb-3">
            <div className="w-12 h-12 rounded-full bg-blue-600 flex items-center justify-center shadow-lg">
              <DollarSign className="text-white" size={24} />
            </div>
            {summary.income > 0 && <TrendingUp className="text-blue-600" size={20} />}
          </div>
          <div className="text-sm text-blue-600 font-medium">Income (excl. GST)</div>
          <div className="text-3xl font-bold text-blue-900 mt-1">
            {summary.income.toLocaleString('en-AU', {
              style: 'currency',
              currency: 'AUD',
              minimumFractionDigits: 0,
            })}
          </div>
        </div>

        <div className="bg-gradient-to-br from-red-50 to-red-100 border border-red-200 rounded-xl p-6 hover:shadow-lg transition-all hover:scale-105 cursor-pointer">
          <div className="flex items-center justify-between mb-3">
            <div className="w-12 h-12 rounded-full bg-red-600 flex items-center justify-center shadow-lg">
              <TrendingDown className="text-white" size={24} />
            </div>
          </div>
          <div className="text-sm text-red-600 font-medium">Expenses (excl. GST)</div>
          <div className="text-3xl font-bold text-red-900 mt-1">
            {summary.expenses.toLocaleString('en-AU', {
              style: 'currency',
              currency: 'AUD',
              minimumFractionDigits: 0,
            })}
          </div>
        </div>

        <div className="bg-gradient-to-br from-amber-50 to-amber-100 border border-amber-200 rounded-xl p-6 hover:shadow-lg transition-all hover:scale-105 cursor-pointer">
          <div className="flex items-center justify-between mb-3">
            <div className="w-12 h-12 rounded-full bg-amber-600 flex items-center justify-center shadow-lg">
              <FileText className="text-white" size={24} />
            </div>
          </div>
          <div className="text-sm text-amber-600 font-medium">GST Payable</div>
          <div className="text-3xl font-bold text-amber-900 mt-1">
            {gstPayable.toLocaleString('en-AU', {
              style: 'currency',
              currency: 'AUD',
              minimumFractionDigits: 0,
            })}
          </div>
        </div>

        <div
          className={`bg-gradient-to-br ${netProfit >= 0 ? 'from-green-50 to-green-100 border-green-200' : 'from-red-50 to-red-100 border-red-200'} border rounded-xl p-6 hover:shadow-lg transition-all hover:scale-105 cursor-pointer`}
        >
          <div className="flex items-center justify-between mb-3">
            <div
              className={`w-12 h-12 rounded-full ${netProfit >= 0 ? 'bg-green-600' : 'bg-red-600'} flex items-center justify-center shadow-lg`}
            >
              {netProfit >= 0 ? (
                <TrendingUp className="text-white" size={24} />
              ) : (
                <TrendingDown className="text-white" size={24} />
              )}
            </div>
          </div>
          <div
            className={`text-sm ${netProfit >= 0 ? 'text-green-600' : 'text-red-600'} font-medium`}
          >
            Net Profit
          </div>
          <div
            className={`text-3xl font-bold ${netProfit >= 0 ? 'text-green-900' : 'text-red-900'} mt-1`}
          >
            {netProfit.toLocaleString('en-AU', {
              style: 'currency',
              currency: 'AUD',
              minimumFractionDigits: 0,
            })}
          </div>
        </div>
      </div>
      {/* Leave Overview Card */}
      <div className="bg-white border rounded-lg p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Calendar size={18} className="text-blue-600" />
          Leave Overview
        </h3>
        <div className="space-y-3">
          {employees && employees.length > 0 ? (
            <>
              {employees
                .filter(
                  (emp) =>
                    emp.employment_type === 'full_time' || emp.employment_type === 'part_time'
                )
                .slice(0, 5)
                .map((emp) => (
                  <div
                    key={emp.id}
                    className="flex items-center justify-between p-2 hover:bg-gray-50 rounded"
                  >
                    <div>
                      <div className="font-medium text-gray-900 text-sm">{emp.full_name}</div>
                      <div className="text-xs text-gray-600">
                        {emp.position || emp.employment_type}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-semibold text-blue-600">
                        {(emp.annual_leave_hours || 0).toFixed(0)}h
                      </div>
                      <div className="text-xs text-gray-500">annual</div>
                    </div>
                  </div>
                ))}

              {/* Show message if no eligible employees */}
              {employees.filter(
                (emp) => emp.employment_type === 'full_time' || emp.employment_type === 'part_time'
              ).length === 0 && (
                <div className="text-center py-8 text-gray-500 text-sm">
                  No employees with leave entitlements
                </div>
              )}
            </>
          ) : (
            // ✅ Show loading or empty state
            <div className="text-center py-8 text-gray-500 text-sm">
              {loading ? 'Loading employees...' : 'No employees yet'}
            </div>
          )}
        </div>

        <button
          onClick={() => router.push('/dashboard/employees')}
          className="w-full mt-4 text-sm text-blue-600 hover:text-blue-700 font-medium"
        >
          {employees && employees.length > 0 ? 'View all employees' : 'Add your first employee'} →
        </button>
      </div>
      {/* Action Items & Quick Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border rounded-xl p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <AlertCircle className="text-amber-500" size={20} />
            <h3 className="font-semibold text-gray-900">Action Required</h3>
          </div>
          <div className="space-y-3">
            {daysUntilPayDate && daysUntilPayDate <= 7 && (
              <button
                onClick={() => router.push('/dashboard/payroll')}
                className="w-full p-4 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors text-left"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-medium text-gray-900">Next Pay Run</div>
                    <div className="text-sm text-gray-600 mt-1">
                      Payment due in {daysUntilPayDate} days
                    </div>
                  </div>
                  <ChevronRight className="text-blue-600" size={20} />
                </div>
              </button>
            )}
            <button
              onClick={() => router.push('/dashboard/bas')}
              className="w-full p-4 bg-amber-50 border border-amber-200 rounded-lg hover:bg-amber-100 transition-colors text-left"
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-medium text-gray-900">BAS Reporting</div>
                  <div className="text-sm text-gray-600 mt-1">Review quarterly GST summary</div>
                </div>
                <ChevronRight className="text-amber-600" size={20} />
              </div>
            </button>
          </div>
        </div>

        <div className="bg-white border rounded-xl p-6 shadow-sm">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <CheckCircle2 className="text-green-500" size={20} />
            Quick Stats
          </h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
                  <Users className="text-purple-600" size={20} />
                </div>
                <div>
                  <div className="text-sm text-gray-600">Active Employees</div>
                  <div className="font-semibold text-gray-900">{employeeCount}</div>
                </div>
              </div>
              <button
                onClick={() => router.push('/dashboard/employees')}
                className="text-blue-600 hover:text-blue-700"
              >
                <ChevronRight size={20} />
              </button>
            </div>
            <div className="flex justify-between p-3 bg-gray-50 rounded-lg">
              <span className="text-sm text-gray-600">PAYG Tax Withheld</span>
              <span className="font-semibold text-gray-900">
                {summary.payg.toLocaleString('en-AU', {
                  style: 'currency',
                  currency: 'AUD',
                  minimumFractionDigits: 0,
                })}
              </span>
            </div>
            <div className="flex justify-between p-3 bg-gray-50 rounded-lg">
              <span className="text-sm text-gray-600">Super Contributions</span>
              <span className="font-semibold text-gray-900">
                {summary.super.toLocaleString('en-AU', {
                  style: 'currency',
                  currency: 'AUD',
                  minimumFractionDigits: 0,
                })}
              </span>
            </div>
          </div>
        </div>
      </div>
      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border rounded-xl shadow-sm p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Financial Overview</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 20, right: 20, left: 0, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="name" stroke="#6b7280" />
                <YAxis stroke="#6b7280" />
                <Tooltip
                  formatter={(val: number) =>
                    val.toLocaleString('en-AU', { style: 'currency', currency: 'AUD' })
                  }
                  contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }}
                />
                <Legend />
                <Bar dataKey="value" fill="#3b82f6" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white border rounded-xl shadow-sm p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Expense Breakdown</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={(props: PieLabelRenderProps) => {
                    const percent = props.percent || 0;
                    return `${props.name} ${((percent as number) * 100).toFixed(0)}%`;
                  }}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(val: number) =>
                    val.toLocaleString('en-AU', { style: 'currency', currency: 'AUD' })
                  }
                  contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
      {/* Payroll Summary */}
      <div className="bg-white border rounded-xl shadow-sm p-6">
        <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Briefcase className="text-blue-600" size={20} />
          Payroll Summary ({labelMap[period]})
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
            <div className="text-sm text-purple-600 font-medium">Wages Paid</div>
            <div className="text-2xl font-bold text-purple-900 mt-2">
              {summary.wages.toLocaleString('en-AU', {
                style: 'currency',
                currency: 'AUD',
                minimumFractionDigits: 0,
              })}
            </div>
          </div>
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="text-sm text-red-600 font-medium">PAYG Withheld</div>
            <div className="text-2xl font-bold text-red-900 mt-2">
              {summary.payg.toLocaleString('en-AU', {
                style: 'currency',
                currency: 'AUD',
                minimumFractionDigits: 0,
              })}
            </div>
          </div>
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="text-sm text-blue-600 font-medium">Superannuation</div>
            <div className="text-2xl font-bold text-blue-900 mt-2">
              {summary.super.toLocaleString('en-AU', {
                style: 'currency',
                currency: 'AUD',
                minimumFractionDigits: 0,
              })}
            </div>
          </div>
        </div>
      </div>
      {/* Quick Actions Banner */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl p-6 text-white shadow-lg">
        <h3 className="text-xl font-semibold mb-4">Quick Actions</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <button
            onClick={() => router.push('/dashboard/transactions')}
            className="bg-white/10 hover:bg-white/20 backdrop-blur-sm border border-white/20 rounded-lg p-4 transition-all hover:scale-105"
          >
            <Receipt className="mx-auto mb-2" size={24} />
            <div className="text-sm font-medium">New Transaction</div>
          </button>
          <button
            onClick={() => router.push('/dashboard/payroll')}
            className="bg-white/10 hover:bg-white/20 backdrop-blur-sm border border-white/20 rounded-lg p-4 transition-all hover:scale-105"
          >
            <Users className="mx-auto mb-2" size={24} />
            <div className="text-sm font-medium">Run Payroll</div>
          </button>
          <button
            onClick={() => router.push('/dashboard/employees')}
            className="bg-white/10 hover:bg-white/20 backdrop-blur-sm border border-white/20 rounded-lg p-4 transition-all hover:scale-105"
          >
            <Briefcase className="mx-auto mb-2" size={24} />
            <div className="text-sm font-medium">Add Employee</div>
          </button>
          <button
            onClick={() => router.push('/dashboard/bas')}
            className="bg-white/10 hover:bg-white/20 backdrop-blur-sm border border-white/20 rounded-lg p-4 transition-all hover:scale-105"
          >
            <FileText className="mx-auto mb-2" size={24} />
            <div className="text-sm font-medium">View BAS</div>
          </button>
        </div>
      </div>
    </div>
  );
}
