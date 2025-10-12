'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import type { Employee } from '@/types/employee';
import { PlusCircle } from 'lucide-react';
import AddEmployeeModal from '@/components/AddEmployeeModal';
import EditEmployeeModal from '@/components/EditEmployeeModal';
import ConfirmDeleteModal from '@/components/ConfirmDeleteModal';

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [deletingEmployee, setDeletingEmployee] = useState<Employee | null>(null);

  // 🧭 Load employees
  const loadEmployees = async () => {
    const { data, error } = await supabase
      .from('employees')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) setEmployees(data);
  };

  // 🔁 Realtime sync
  useEffect(() => {
    loadEmployees();

    const channel = supabase
      .channel('employees-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'employees' }, (payload) => {
        const { eventType, new: newRecord, old: oldRecord } = payload;
        setEmployees((prev) => {
          switch (eventType) {
            case 'INSERT':
              if (prev.find((e) => e.id === (newRecord as Employee).id)) return prev;
              return [newRecord as Employee, ...prev];
            case 'UPDATE':
              return prev.map((e) => (e.id === oldRecord.id ? (newRecord as Employee) : e));
            case 'DELETE':
              return prev.filter((e) => e.id !== oldRecord.id);
            default:
              return prev;
          }
        });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // 🗑️ Delete handler
  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('employees').delete().eq('id', id);
    if (error) {
      console.error('❌ Delete failed:', error);
      alert('Error deleting employee: ' + error.message);
    } else {
      await loadEmployees();
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-xl font-semibold">Employees</h1>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <PlusCircle size={18} /> Add
        </button>
      </div>

      {/* 🧾 Employees Table */}
      <div className="bg-white rounded-lg shadow overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-100 text-gray-600 uppercase">
            <tr>
              <th className="px-4 py-2 text-left">Name</th>
              <th className="px-4 py-2 text-left">Email</th>
              <th className="px-4 py-2 text-left">Type</th>
              <th className="px-4 py-2 text-left">Pay Freq</th>
              <th className="px-4 py-2 text-right">Salary / Rate</th>
              <th className="px-4 py-2 text-right">Super %</th>
              <th className="px-4 py-2 text-left">Start Date</th>
              <th className="px-4 py-2 text-center">Active</th>
              <th className="px-4 py-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {employees.length === 0 ? (
              <tr>
                <td colSpan={9} className="text-center py-6 text-gray-500 italic">
                  No employees yet.
                </td>
              </tr>
            ) : (
              employees.map((e) => (
                <tr key={e.id} className="border-t hover:bg-gray-50">
                  <td className="px-4 py-2 font-medium">{e.full_name}</td>
                  <td className="px-4 py-2">{e.email || '-'}</td>
                  <td className="px-4 py-2">{e.employment_type}</td>
                  <td className="px-4 py-2">{e.pay_frequency}</td>
                  <td className="px-4 py-2 text-right">
                    {e.base_salary
                      ? e.base_salary.toLocaleString('en-AU', {
                          style: 'currency',
                          currency: 'AUD',
                        })
                      : e.hourly_rate
                        ? `${e.hourly_rate.toFixed(2)} /hr`
                        : '-'}
                  </td>
                  <td className="px-4 py-2 text-right">
                    {e.super_rate ? `${e.super_rate.toFixed(1)}%` : '-'}
                  </td>
                  <td className="px-4 py-2">
                    {e.start_date ? new Date(e.start_date).toLocaleDateString('en-AU') : '-'}
                  </td>
                  <td className="px-4 py-2 text-center">
                    {e.active ? (
                      <span className="text-green-600 font-medium">✓</span>
                    ) : (
                      <span className="text-gray-400">–</span>
                    )}
                  </td>
                  <td className="px-4 py-2 text-right">
                    <button
                      onClick={() => setEditingEmployee(e)}
                      className="text-blue-600 hover:underline mr-3"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => setDeletingEmployee(e)}
                      className="text-red-600 hover:underline"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* ➕ Add Modal */}
      {showAddModal && (
        <AddEmployeeModal
          onClose={() => setShowAddModal(false)}
          onAdded={loadEmployees}
          runId={''}
        />
      )}

      {/* ✏️ Edit Modal */}
      {editingEmployee && (
        <EditEmployeeModal
          employee={editingEmployee}
          onClose={() => setEditingEmployee(null)}
          onUpdated={loadEmployees}
        />
      )}

      {/* ❌ Delete Confirmation */}
      {deletingEmployee && (
        <ConfirmDeleteModal
          title="Delete Employee"
          message={`Are you sure you want to delete ${deletingEmployee.full_name}?`}
          onCancel={() => setDeletingEmployee(null)}
          onConfirm={() => {
            handleDelete(deletingEmployee.id);
            setDeletingEmployee(null);
          }}
        />
      )}
    </div>
  );
}
