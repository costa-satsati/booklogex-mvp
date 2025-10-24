// src/app/dashboard/employees/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Search, Filter, Download, Upload, Loader2 } from 'lucide-react';
import { notify } from '@/lib/notify';
import type { Employee } from '@/types/employee';
import EmployeeListTable from './_components/EmployeeListTable';
import EmployeeListCards from './_components/EmployeeListCards';

export default function EmployeesPage() {
  const router = useRouter();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [filteredEmployees, setFilteredEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('active');
  const [filterType, setFilterType] = useState<string>('all');

  // Stats
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    fullTime: 0,
    partTime: 0,
    casual: 0,
    contractors: 0,
  });

  useEffect(() => {
    fetchEmployees();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [employees, searchQuery, filterStatus, filterType]);

  const fetchEmployees = async () => {
    try {
      setLoading(true);

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Get user's org_id
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('org_id')
        .eq('id', user.id)
        .single();

      if (!profile?.org_id) throw new Error('No organisation found');

      // Fetch employees
      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .eq('org_id', profile.org_id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setEmployees(data || []);

      // Calculate stats
      const total = data?.length || 0;
      const active = data?.filter((e) => e.active !== false).length || 0;
      const fullTime = data?.filter((e) => e.employment_type === 'full_time').length || 0;
      const partTime = data?.filter((e) => e.employment_type === 'part_time').length || 0;
      const casual = data?.filter((e) => e.employment_type === 'casual').length || 0;
      const contractors = data?.filter((e) => e.employment_type === 'contractor').length || 0;

      setStats({ total, active, fullTime, partTime, casual, contractors });
    } catch (error) {
      console.error('Error fetching employees:', error);
      notify.error('Error', 'Failed to load employees');
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...employees];

    // Status filter
    if (filterStatus === 'active') {
      filtered = filtered.filter((e) => e.active !== false);
    } else if (filterStatus === 'inactive') {
      filtered = filtered.filter((e) => e.active === false);
    }

    // Type filter
    if (filterType !== 'all') {
      filtered = filtered.filter((e) => e.employment_type === filterType);
    }

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (e) =>
          e.full_name?.toLowerCase().includes(query) ||
          e.email?.toLowerCase().includes(query) ||
          e.position?.toLowerCase().includes(query) ||
          e.phone?.toLowerCase().includes(query)
      );
    }

    setFilteredEmployees(filtered);
  };

  const handleEmployeeClick = (employeeId: string) => {
    router.push(`/dashboard/employees/${employeeId}`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Employees</h1>
          <p className="text-gray-600 mt-1">Manage your team members</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="hidden sm:flex items-center gap-2"
            onClick={() => notify.info('Coming Soon', 'CSV import feature')}
          >
            <Upload size={16} />
            Import
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="hidden sm:flex items-center gap-2"
            onClick={() => notify.info('Coming Soon', 'CSV export feature')}
          >
            <Download size={16} />
            Export
          </Button>
          <Button
            onClick={() => router.push('/dashboard/employees/new')}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white"
          >
            <Plus size={18} />
            Add Employee
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="bg-white border rounded-lg p-4">
          <div className="text-sm text-gray-600 mb-1">Total</div>
          <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="text-sm text-green-600 mb-1">Active</div>
          <div className="text-2xl font-bold text-green-900">{stats.active}</div>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="text-sm text-blue-600 mb-1">Full-time</div>
          <div className="text-2xl font-bold text-blue-900">{stats.fullTime}</div>
        </div>
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
          <div className="text-sm text-purple-600 mb-1">Part-time</div>
          <div className="text-2xl font-bold text-purple-900">{stats.partTime}</div>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <div className="text-sm text-amber-600 mb-1">Casual</div>
          <div className="text-2xl font-bold text-amber-900">{stats.casual}</div>
        </div>
        <div className="bg-gray-50 border rounded-lg p-4">
          <div className="text-sm text-gray-600 mb-1">Contractors</div>
          <div className="text-2xl font-bold text-gray-900">{stats.contractors}</div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white border rounded-lg p-4">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search
              className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
              size={18}
            />
            <Input
              placeholder="Search by name, email, position..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Status Filter */}
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as 'all' | 'active' | 'inactive')}
            className="border rounded-lg px-3 py-2 text-sm bg-white min-w-[120px]"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>

          {/* Type Filter */}
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="border rounded-lg px-3 py-2 text-sm bg-white min-w-[140px]"
          >
            <option value="all">All Types</option>
            <option value="full_time">Full-time</option>
            <option value="part_time">Part-time</option>
            <option value="casual">Casual</option>
            <option value="contractor">Contractor</option>
          </select>
        </div>

        {/* Active filters summary */}
        {(searchQuery || filterStatus !== 'active' || filterType !== 'all') && (
          <div className="mt-3 flex items-center gap-2 text-sm text-gray-600">
            <Filter size={14} />
            <span>
              Showing {filteredEmployees.length} of {employees.length} employees
            </span>
            <button
              onClick={() => {
                setSearchQuery('');
                setFilterStatus('active');
                setFilterType('all');
              }}
              className="text-blue-600 hover:text-blue-700 ml-2"
            >
              Clear filters
            </button>
          </div>
        )}
      </div>

      {/* Desktop: Table View */}
      <div className="hidden md:block">
        <EmployeeListTable
          employees={filteredEmployees}
          onEmployeeClick={handleEmployeeClick}
          onRefresh={fetchEmployees}
        />
      </div>

      {/* Mobile: Cards View */}
      <div className="block md:hidden">
        <EmployeeListCards
          employees={filteredEmployees}
          onEmployeeClick={handleEmployeeClick}
          onRefresh={fetchEmployees}
        />
      </div>

      {/* Empty State */}
      {filteredEmployees.length === 0 && !loading && (
        <div className="bg-white border rounded-lg p-12 text-center">
          <div className="text-gray-400 text-5xl mb-4">👥</div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            {searchQuery || filterStatus !== 'active' || filterType !== 'all'
              ? 'No employees found'
              : 'No employees yet'}
          </h3>
          <p className="text-gray-600 mb-6">
            {searchQuery || filterStatus !== 'active' || filterType !== 'all'
              ? 'Try adjusting your filters'
              : 'Get started by adding your first team member'}
          </p>
          {employees.length === 0 && (
            <Button onClick={() => router.push('/dashboard/employees/new')}>
              <Plus size={18} className="mr-2" />
              Add First Employee
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
