// src/app/dashboard/employees/page.tsx (COMPLETE REPLACEMENT)
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Loader2,
  Plus,
  Search,
  Mail,
  Building2,
  DollarSign,
  TrendingUp,
  Users,
  AlertCircle,
  ChevronRight,
} from 'lucide-react';
import { notify } from '@/lib/notify';
import { formatCurrency } from '@/lib/tax-calculator';
import type { Employee } from '@/types/employee';
import { useOrgContext } from '@/context/OrgContext';

export default function EmployeesPage() {
  const router = useRouter();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive' | 'contractors'>(
    'all'
  );
  const [stats, setStats] = useState({
    total: 0,
    fullTime: 0,
    contractors: 0,
    avgSalary: 0,
  });
  const { organisation, loading: orgLoading } = useOrgContext();

  // Load employees
  const loadEmployees = async () => {
    if (!organisation?.id) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .eq('org_id', organisation.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setEmployees(data || []);
      calculateStats(data || []);
    } catch (error) {
      console.error('Error loading employees:', error);
      notify.error('Error', 'Failed to load employees');
    } finally {
      setLoading(false);
    }
  };

  // Calculate stats
  const calculateStats = (emps: Employee[]) => {
    const active = emps.filter((e) => e.active);
    const fullTime = active.filter((e) => e.employment_type === 'full_time');
    const contractors = active.filter((e) => e.employment_type === 'contractor');

    const salaries = active.filter((e) => e.base_salary).map((e) => e.base_salary as number);

    const avgSalary =
      salaries.length > 0 ? salaries.reduce((a, b) => a + b, 0) / salaries.length : 0;

    setStats({
      total: active.length,
      fullTime: fullTime.length,
      contractors: contractors.length,
      avgSalary,
    });
  };

  // Real-time subscription
  useEffect(() => {
    loadEmployees();

    const channel = supabase
      .channel('employees-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'employees',
        },
        () => {
          loadEmployees(); // Reload on any change
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Filter employees
  const filteredEmployees = employees.filter((emp) => {
    const matchesSearch =
      emp.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.position?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesFilter =
      filterStatus === 'all' ||
      (filterStatus === 'active' && emp.active) ||
      (filterStatus === 'inactive' && !emp.active) ||
      (filterStatus === 'contractors' && emp.employment_type === 'contractor');

    return matchesSearch && matchesFilter;
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-4xl font-bold text-gray-900">Employees</h1>
            <p className="text-gray-600 mt-2">Manage your team and their details</p>
          </div>
          <Button
            onClick={() => router.push('/dashboard/employees/new')}
            size="lg"
            className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg"
          >
            <Plus size={20} className="mr-2" />
            Add Employee
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm text-blue-600 font-medium">Total Employees</div>
              <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                <Users className="text-blue-600" size={18} />
              </div>
            </div>
            <div className="text-3xl font-bold text-blue-900">{stats.total}</div>
            <div className="text-xs text-blue-600 mt-2">Active staff</div>
          </div>

          <div className="bg-green-50 border border-green-200 rounded-lg p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm text-green-600 font-medium">Full-time</div>
              <Building2 className="text-green-600" size={18} />
            </div>
            <div className="text-3xl font-bold text-green-900">{stats.fullTime}</div>
            <div className="text-xs text-green-600 mt-2">
              {stats.total > 0 ? Math.round((stats.fullTime / stats.total) * 100) : 0}% of workforce
            </div>
          </div>

          <div className="bg-purple-50 border border-purple-200 rounded-lg p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm text-purple-600 font-medium">Contractors</div>
              <TrendingUp className="text-purple-600" size={18} />
            </div>
            <div className="text-3xl font-bold text-purple-900">{stats.contractors}</div>
            <div className="text-xs text-purple-600 mt-2">
              {stats.total > 0 ? Math.round((stats.contractors / stats.total) * 100) : 0}% of
              workforce
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm text-amber-600 font-medium">Avg Salary</div>
              <DollarSign className="text-amber-600" size={18} />
            </div>
            <div className="text-3xl font-bold text-amber-900">
              {stats.avgSalary > 0 ? `$${Math.round(stats.avgSalary / 1000)}k` : '—'}
            </div>
            <div className="text-xs text-amber-600 mt-2">Annual average</div>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="bg-white border rounded-lg p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search
                className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                size={18}
              />
              <Input
                type="text"
                placeholder="Search employees by name, email, or position..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2">
              {[
                { key: 'all', label: 'All' },
                { key: 'active', label: 'Active' },
                { key: 'inactive', label: 'Inactive' },
                { key: 'contractors', label: 'Contractors' },
              ].map((filter) => (
                <button
                  key={filter.key}
                  onClick={() => setFilterStatus(filter.key as typeof filterStatus)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    filterStatus === filter.key
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {filter.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Employee Cards */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600 mr-3" />
            <span className="text-gray-600">Loading employees...</span>
          </div>
        ) : filteredEmployees.length === 0 ? (
          <div className="bg-white border rounded-lg p-12 text-center">
            <div className="text-gray-400 text-5xl mb-4">
              {searchQuery || filterStatus !== 'all' ? '🔍' : '👥'}
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {searchQuery || filterStatus !== 'all' ? 'No employees found' : 'No employees yet'}
            </h3>
            <p className="text-gray-600 mb-6">
              {searchQuery || filterStatus !== 'all'
                ? 'Try adjusting your search or filters'
                : 'Add your first employee to get started'}
            </p>
            {!searchQuery && filterStatus === 'all' && (
              <Button
                onClick={() => router.push('/dashboard/employees/new')}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Plus size={18} className="mr-2" />
                Add Your First Employee
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredEmployees.map((emp) => (
              <button
                key={emp.id}
                onClick={() => router.push(`/dashboard/employees/${emp.id}`)}
                className="bg-white border rounded-lg p-6 hover:shadow-lg hover:border-blue-300 transition-all text-left group"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-lg font-bold text-blue-600">
                      {emp.full_name
                        .split(' ')
                        .map((n) => n[0])
                        .join('')}
                    </div>
                    <div>
                      <div className="font-semibold text-gray-900">{emp.full_name}</div>
                      <div className="text-xs text-gray-600">{emp.position || 'No position'}</div>
                    </div>
                  </div>
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-medium ${
                      emp.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    {emp.active ? 'Active' : 'Inactive'}
                  </span>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-gray-600">
                    <Mail size={14} />
                    <span className="truncate">{emp.email || 'No email'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-600">
                    <Building2 size={14} />
                    <span className="capitalize">{emp.employment_type?.replace('_', '-')}</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-600">
                    <DollarSign size={14} />
                    <span>
                      {emp.base_salary
                        ? formatCurrency(emp.base_salary)
                        : emp.hourly_rate
                          ? `$${emp.hourly_rate}/hr`
                          : 'No rate set'}
                    </span>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t flex justify-between items-center">
                  <span className="text-xs text-gray-500">
                    {emp.start_date
                      ? `Started ${new Date(emp.start_date).toLocaleDateString('en-AU', { month: 'short', year: 'numeric' })}`
                      : 'No start date'}
                  </span>
                  <ChevronRight
                    size={16}
                    className="text-gray-400 group-hover:text-blue-600 group-hover:translate-x-1 transition-all"
                  />
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
