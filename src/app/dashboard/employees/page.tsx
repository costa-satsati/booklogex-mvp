'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { getCurrentOrgId } from '@/lib/org';
import { Employee } from '@/types/employee';
import AddEmployeeModal from '@/components/AddEmployeeModal';
import EditEmployeeModal from '@/components/EditEmployeeModal';
import ConfirmDeleteModal from '@/components/ConfirmDeleteModal';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { notify } from '@/lib/notify';
import { Plus, Pencil, Trash2 } from 'lucide-react';

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [editEmployee, setEditEmployee] = useState<Employee | null>(null);
  const [deleteEmployee, setDeleteEmployee] = useState<Employee | null>(null);

  // Fetch employees
  const fetchEmployees = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from<'employees', Employee>('employees')
      .select('*')
      .order('full_name', { ascending: true });

    if (error) {
      console.error(error);
      notify.error('Failed to load employees', error.message);
    } else {
      setEmployees(data || []);
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  // Add new employee
  const handleAdd = async (emp: Employee) => {
    try {
      const orgId = await getCurrentOrgId();

      const { error } = await supabase.from('employees').insert([
        {
          org_id: orgId,
          full_name: emp.full_name,
          email: emp.email,
          tfn: emp.tfn,
          position: emp.position,
          employment_type: emp.employment_type,
          hourly_rate: emp.hourly_rate,
          pay_frequency: emp.pay_frequency,
          start_date: emp.start_date,
          super_rate: emp.super_rate,
          active: true,
        },
      ]);

      if (error) throw error;
      notify.success('Employee added');
      await fetchEmployees();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to add employee';
      notify.error('Add employee failed', message);
    }
  };

  // Edit employee
  const handleUpdate = async (emp: Employee) => {
    try {
      const orgId = await getCurrentOrgId();

      const { error } = await supabase
        .from('employees')
        .update({
          org_id: orgId,
          full_name: emp.full_name,
          email: emp.email,
          tfn: emp.tfn,
          position: emp.position,
          employment_type: emp.employment_type,
          hourly_rate: emp.hourly_rate,
          pay_frequency: emp.pay_frequency,
          start_date: emp.start_date,
          super_rate: emp.super_rate,
          active: emp.active ?? true,
        })
        .eq('id', emp.id);

      if (error) throw error;
      notify.success('Employee updated');
      await fetchEmployees();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update employee';
      notify.error('Update employee failed', message);
    }
  };

  // Delete employee
  const handleDelete = async () => {
    if (!deleteEmployee) return;
    const { error } = await supabase.from('employees').delete().eq('id', deleteEmployee.id);

    if (error) {
      notify.error('Failed to delete employee', error.message);
    } else {
      notify.success('Employee deleted');
      await fetchEmployees();
    }

    setDeleteEmployee(null);
  };

  // ---- UI ----
  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-800">Employees</h1>
        <Button
          onClick={() => setAddOpen(true)}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white"
        >
          <Plus size={16} />
          Add Employee
        </Button>
      </div>

      {/* Content */}
      {loading ? (
        <p className="text-slate-500">Loading employees...</p>
      ) : employees.length === 0 ? (
        <Card className="p-6 text-center text-slate-500">
          No employees found. Add your first employee to begin payroll setup.
        </Card>
      ) : (
        <div className="overflow-x-auto bg-white border rounded-xl shadow-sm">
          <table className="min-w-full text-sm text-left border-collapse">
            <thead className="bg-slate-100 text-slate-700">
              <tr>
                <th className="px-4 py-2">Name</th>
                <th className="px-4 py-2">Email</th>
                <th className="px-4 py-2">Position</th>
                <th className="px-4 py-2">Type</th>
                <th className="px-4 py-2 text-right">Hourly Rate</th>
                <th className="px-4 py-2 text-right">Super %</th>
                <th className="px-4 py-2 text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {employees.map((emp) => (
                <tr key={emp.id} className="border-t hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-2">{emp.full_name}</td>
                  <td className="px-4 py-2">{emp.email || '-'}</td>
                  <td className="px-4 py-2">{emp.position || '-'}</td>
                  <td className="px-4 py-2 capitalize">{emp.employment_type.replace('_', ' ')}</td>
                  <td className="px-4 py-2 text-right">
                    {emp.hourly_rate
                      ? emp.hourly_rate.toLocaleString('en-AU', {
                          style: 'currency',
                          currency: 'AUD',
                        })
                      : '-'}
                  </td>
                  <td className="px-4 py-2 text-right">{emp.super_rate ?? '-'}</td>
                  <td className="px-4 py-2 text-center">
                    <div className="flex justify-center gap-2">
                      <Button size="icon" variant="ghost" onClick={() => setEditEmployee(emp)}>
                        <Pencil size={16} className="text-slate-600" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => setDeleteEmployee(emp)}>
                        <Trash2 size={16} className="text-red-500" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modals */}
      <AddEmployeeModal open={addOpen} onClose={() => setAddOpen(false)} onSave={handleAdd} />

      <EditEmployeeModal
        open={!!editEmployee}
        employee={editEmployee}
        onClose={() => setEditEmployee(null)}
        onSave={handleUpdate}
      />

      <ConfirmDeleteModal
        open={!!deleteEmployee}
        title="Delete Employee"
        description={`Are you sure you want to delete ${deleteEmployee?.full_name}?`}
        onCancel={() => setDeleteEmployee(null)}
        onConfirm={handleDelete}
      />
    </div>
  );
}
