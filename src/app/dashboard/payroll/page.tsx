// src/app/dashboard/payroll/page.tsx - IMPROVED VERSION
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { Button } from '@/components/ui/button';
import {
  Loader2,
  Plus,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  Calendar,
  DollarSign,
  Trash2,
  Edit2,
  MoreVertical,
} from 'lucide-react';
import { notify } from '@/lib/notify';
import { format, differenceInDays, startOfWeek, endOfWeek, addDays } from 'date-fns';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/tax-calculator';
import type { PayrollRun } from '@/types/payroll';
import { useOrgContext } from '@/context/OrgContext';

export default function PayrollPage() {
  const router = useRouter();
  const { organisation, loading: orgLoading } = useOrgContext();
  const [runs, setRuns] = useState<PayrollRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [stats, setStats] = useState({
    activeEmployees: 0,
    ytdPayroll: 0,
    pendingSuper: 0,
    nextPayDate: null as string | null,
  });

  const loadRuns = async () => {
    if (!organisation?.id) return;

    setLoading(true);
    const { data, error } = await supabase
      .from('payroll_runs')
      .select('*')
      .eq('org_id', organisation.id) // ← Use from context
      .order('created_at', { ascending: false });

    if (error) {
      console.error(error);
      notify.error('Error', 'Failed to load payroll runs');
    } else {
      setRuns(data || []);
      calculateStats(data || []);
    }
    setLoading(false);
  };

  const calculateStats = async (payrollRuns: PayrollRun[]) => {
    if (!organisation?.id) return;

    const ytd = payrollRuns
      .filter((r) => r.status === 'finalized' || r.status === 'completed')
      .reduce((sum, r) => sum + (r.total_gross || 0), 0);

    const pendingSuper = payrollRuns
      .filter((r) => r.status === 'finalized' || r.status === 'completed')
      .reduce((sum, r) => sum + (r.total_super || 0), 0);

    const upcomingRuns = payrollRuns
      .filter((r) => r.pay_date && new Date(r.pay_date) > new Date())
      .sort((a, b) => new Date(a.pay_date!).getTime() - new Date(b.pay_date!).getTime());

    const { count } = await supabase
      .from('employees')
      .select('id', { count: 'exact', head: true })
      .eq('org_id', organisation.id)
      .eq('active', true);

    setStats({
      activeEmployees: count || 0,
      ytdPayroll: ytd,
      pendingSuper: pendingSuper,
      nextPayDate: upcomingRuns[0]?.pay_date || null,
    });
  };

  // NEW: Delete draft pay run
  const handleDeleteDraft = async (runId: string) => {
    setDeletingId(runId);
    try {
      // First delete all payroll items
      const { error: itemsError } = await supabase
        .from('payroll_items')
        .delete()
        .eq('payroll_run_id', runId);

      if (itemsError) throw itemsError;

      // Then delete the pay run
      const { error: runError } = await supabase.from('payroll_runs').delete().eq('id', runId);

      if (runError) throw runError;

      notify.success('Deleted', 'Draft pay run deleted successfully');
      setShowDeleteConfirm(null);
      await loadRuns();
    } catch (error) {
      console.error('Error deleting draft:', error);
      notify.error('Error', 'Failed to delete draft pay run');
    } finally {
      setDeletingId(null);
    }
  };

  // IMPROVED: Create pay run with modal/wizard instead of direct creation
  const handleCreatePayRun = () => {
    if (!organisation?.id) {
      notify.error('Error', 'Organisation not found');
      return;
    }

    // Navigate to setup wizard (we'll create a new route for this)
    router.push('/dashboard/payroll/new');
  };

  // Load runs when organisation is available
  useEffect(() => {
    if (organisation?.id) {
      loadRuns();
    }
  }, [organisation?.id]);

  // Show loading state while org is loading
  if (orgLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  // Show error if no organisation
  if (!organisation) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-600 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">Organisation Not Found</h2>
          <p className="text-gray-600">Please complete your organisation setup first.</p>
        </div>
      </div>
    );
  }

  const draftRuns = runs.filter((r) => r.status === 'draft');
  const completedRuns = runs.filter((r) => r.status === 'finalized' || r.status === 'completed');

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-4xl font-bold text-gray-900">Pay Your Team</h1>
            <p className="text-gray-600 mt-2">Manage payroll runs and track payments</p>
          </div>
          <Button
            onClick={handleCreatePayRun}
            disabled={!organisation?.id}
            size="lg"
            className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg"
          >
            <Plus size={20} className="mr-2" />
            Create Pay Run
          </Button>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm text-blue-600 font-medium">Active Employees</div>
              <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                <span className="text-blue-600 text-lg">👥</span>
              </div>
            </div>
            <div className="text-3xl font-bold text-blue-900">{stats.activeEmployees}</div>
            <div className="text-xs text-blue-600 mt-2">Ready to pay</div>
          </div>

          <div className="bg-green-50 border border-green-200 rounded-lg p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm text-green-600 font-medium">Next Payment</div>
              <Calendar className="text-green-600" size={20} />
            </div>
            <div className="text-3xl font-bold text-green-900">
              {stats.nextPayDate ? format(new Date(stats.nextPayDate), 'd MMM') : '—'}
            </div>
            <div className="text-xs text-green-600 mt-2">
              {stats.nextPayDate
                ? `${differenceInDays(new Date(stats.nextPayDate), new Date())} days away`
                : 'No upcoming runs'}
            </div>
          </div>

          <div className="bg-purple-50 border border-purple-200 rounded-lg p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm text-purple-600 font-medium">YTD Payroll</div>
              <TrendingUp className="text-purple-600" size={20} />
            </div>
            <div className="text-3xl font-bold text-purple-900">
              {formatCurrency(stats.ytdPayroll)}
            </div>
            <div className="text-xs text-purple-600 mt-2">Total processed</div>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm text-amber-600 font-medium">Super Due</div>
              <DollarSign className="text-amber-600" size={20} />
            </div>
            <div className="text-3xl font-bold text-amber-900">
              {formatCurrency(stats.pendingSuper)}
            </div>
            <div className="text-xs text-amber-600 mt-2">Quarterly payment</div>
          </div>
        </div>

        {/* Draft Pay Runs with Actions */}
        {draftRuns.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Draft Pay Runs</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {draftRuns.map((run) => (
                <div
                  key={run.id}
                  className="bg-white border-2 border-blue-200 rounded-lg p-6 hover:shadow-lg transition-all group relative"
                >
                  {/* Delete Confirmation Overlay */}
                  {showDeleteConfirm === run.id && (
                    <div className="absolute inset-0 bg-white/95 rounded-lg flex items-center justify-center z-10 p-6">
                      <div className="text-center">
                        <AlertCircle className="h-12 w-12 text-red-600 mx-auto mb-3" />
                        <h3 className="text-lg font-bold text-gray-900 mb-2">Delete Draft?</h3>
                        <p className="text-sm text-gray-600 mb-4">
                          This will permanently delete this draft pay run. This action cannot be
                          undone.
                        </p>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setShowDeleteConfirm(null)}
                            className="flex-1"
                          >
                            Cancel
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => handleDeleteDraft(run.id)}
                            disabled={deletingId === run.id}
                            className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                          >
                            {deletingId === run.id ? (
                              <>
                                <Loader2 size={14} className="mr-1 animate-spin" />
                                Deleting...
                              </>
                            ) : (
                              'Delete'
                            )}
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Draft Card Content */}
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="px-3 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">
                          DRAFT
                        </span>
                        <span className="text-xs text-gray-500">
                          Created {format(new Date(run.created_at!), 'd MMM yyyy')}
                        </span>
                      </div>
                      <h3 className="text-xl font-bold text-gray-900 mb-1">
                        {run.frequency} Pay Run
                      </h3>
                      <p className="text-sm text-gray-600 mb-4">
                        {format(new Date(run.pay_period_start), 'd MMM')} →{' '}
                        {format(new Date(run.pay_period_end), 'd MMM yyyy')}
                      </p>
                      <div className="flex gap-4 text-sm">
                        <div>
                          <div className="text-gray-500">Gross</div>
                          <div className="font-semibold text-gray-900">
                            {formatCurrency(run.total_gross)}
                          </div>
                        </div>
                        <div>
                          <div className="text-gray-500">Net</div>
                          <div className="font-semibold text-gray-900">
                            {formatCurrency(run.total_net)}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-col gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => router.push(`/dashboard/payroll/${run.id}`)}
                        className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                      >
                        <Edit2 size={14} className="mr-1" />
                        Continue
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setShowDeleteConfirm(run.id)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 size={14} className="mr-1" />
                        Delete
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recent Completed Runs */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Recent Pay Runs</h2>
            {completedRuns.length > 5 && (
              <Button variant="outline" size="sm">
                View All
              </Button>
            )}
          </div>

          {loading ? (
            <div className="bg-white rounded-lg border p-12 flex items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-gray-400 mr-3" />
              <span className="text-gray-500">Loading payroll runs...</span>
            </div>
          ) : completedRuns.length === 0 && draftRuns.length === 0 ? (
            <div className="bg-white rounded-lg border p-12 text-center">
              <div className="text-gray-400 text-5xl mb-4">📋</div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No payroll runs yet</h3>
              <p className="text-gray-600 mb-6">
                Create your first pay run to get started with payroll processing
              </p>
              <Button
                onClick={handleCreatePayRun}
                disabled={!organisation?.id}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Plus size={18} className="mr-2" />
                Create Your First Pay Run
              </Button>
            </div>
          ) : (
            <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Period
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Pay Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Status
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                      Gross
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                      Tax
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                      Super
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                      Net
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {completedRuns.slice(0, 10).map((run) => (
                    <tr
                      key={run.id}
                      className="hover:bg-gray-50 transition-colors cursor-pointer"
                      onClick={() => router.push(`/dashboard/payroll/${run.id}`)}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {format(new Date(run.pay_period_start), 'd MMM')} →{' '}
                          {format(new Date(run.pay_period_end), 'd MMM yyyy')}
                        </div>
                        <div className="text-xs text-gray-500">{run.frequency}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {run.pay_date ? format(new Date(run.pay_date), 'd MMM yyyy') : '—'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={cn(
                            'inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium',
                            run.status === 'finalized' || run.status === 'completed'
                              ? 'bg-green-100 text-green-700'
                              : 'bg-gray-100 text-gray-700'
                          )}
                        >
                          {(run.status === 'finalized' || run.status === 'completed') && (
                            <CheckCircle2 size={14} />
                          )}
                          {run.status.charAt(0).toUpperCase() + run.status.slice(1)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                        {formatCurrency(run.total_gross)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                        {formatCurrency(run.total_tax)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                        {formatCurrency(run.total_super)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-semibold text-gray-900">
                        {formatCurrency(run.total_net)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push(`/dashboard/payroll/${run.id}`);
                          }}
                          className="text-blue-600 hover:text-blue-800 font-medium"
                        >
                          View →
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Compliance Status */}
        {completedRuns.length > 0 && (
          <div className="bg-white rounded-lg border p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Compliance Status</h3>
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded">
                <CheckCircle2 className="text-green-600" size={20} />
                <div className="flex-1">
                  <div className="font-medium text-gray-900">STP Up to Date</div>
                  <div className="text-xs text-gray-600">
                    Last lodged:{' '}
                    {completedRuns[0]?.finalized_at
                      ? format(new Date(completedRuns[0].finalized_at), 'd MMM yyyy')
                      : 'N/A'}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 bg-amber-50 border border-amber-200 rounded">
                <AlertCircle className="text-amber-600" size={20} />
                <div className="flex-1">
                  <div className="font-medium text-gray-900">Super Payment Due</div>
                  <div className="text-xs text-gray-600">
                    {formatCurrency(stats.pendingSuper)} due by 28 October 2025
                  </div>
                </div>
                <Button size="sm" variant="outline" className="text-amber-700 border-amber-300">
                  Pay Now
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
