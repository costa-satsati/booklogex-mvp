'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { PlusCircle } from 'lucide-react';

type Employee = {
  id: string;
  name: string;
  tax_code: string | null;
  salary: number | null;
  created_at: string;
};

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    name: '',
    tax_code: '',
    salary: '',
  });
  const [loading, setLoading] = useState(false);

  // 🧭 Load employees
  const loadEmployees = async () => {
    const { data, error } = await supabase
      .from('employees')
      .select('*')
      .order('created_at', { ascending: false });
    if (!error && data) setEmployees(data);
  };

  // 🔁 Realtime subscription
  useEffect(() => {
    loadEmployees();

    const channel = supabase
      .channel('employees-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'employees' }, (payload) => {
        console.log('Realtime:', payload);
        setEmployees((prev) => {
          const { eventType, new: newRecord, old: oldRecord } = payload;

          switch (eventType) {
            case 'INSERT':
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

  // 🧾 Handle form input
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  // 💾 Add employee
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('org_id')
      .eq('id', user?.id)
      .single();

    if (!profile?.org_id) {
      alert('Organisation not found. Please complete onboarding first.');
      setLoading(false);
      return;
    }

    const { error } = await supabase.from('employees').insert([
      {
        org_id: profile.org_id,
        name: form.name,
        tax_code: form.tax_code,
        salary: parseFloat(form.salary),
      },
    ]);

    setLoading(false);

    if (error) {
      console.error('❌ Insert failed:', error);
      alert('Error adding employee: ' + error.message);
    } else {
      setForm({ name: '', tax_code: '', salary: '' });
      setShowModal(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-xl font-semibold">Employees</h1>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <PlusCircle size={18} /> Add
        </button>
      </div>

      {/* 🧾 Employees Table */}
      <div className="bg-white rounded-lg shadow">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-100 text-gray-600 uppercase">
            <tr>
              <th className="px-4 py-2 text-left">Name</th>
              <th className="px-4 py-2 text-left">Tax Code</th>
              <th className="px-4 py-2 text-right">Annual Salary</th>
              <th className="px-4 py-2 text-left">Added</th>
            </tr>
          </thead>
          <tbody>
            {employees.length === 0 ? (
              <tr>
                <td colSpan={4} className="text-center py-6 text-gray-500 italic">
                  No employees yet.
                </td>
              </tr>
            ) : (
              employees.map((e) => (
                <tr key={e.id} className="border-t">
                  <td className="px-4 py-2">{e.name}</td>
                  <td className="px-4 py-2">{e.tax_code || '-'}</td>
                  <td className="px-4 py-2 text-right">
                    {e.salary
                      ? e.salary.toLocaleString('en-AU', {
                          style: 'currency',
                          currency: 'AUD',
                        })
                      : '-'}
                  </td>
                  <td className="px-4 py-2">
                    {new Date(e.created_at).toLocaleDateString('en-AU')}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* ➕ Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <form
            onSubmit={handleSubmit}
            className="bg-white p-6 rounded-lg w-96 space-y-4 shadow-lg"
          >
            <h2 className="text-lg font-semibold">Add Employee</h2>
            <input
              type="text"
              name="name"
              placeholder="Full Name"
              required
              value={form.name}
              onChange={handleChange}
              className="w-full border rounded p-2"
            />
            <input
              type="text"
              name="tax_code"
              placeholder="Tax Code (e.g. 1, 2, 3 or Resident)"
              value={form.tax_code}
              onChange={handleChange}
              className="w-full border rounded p-2"
            />
            <input
              type="number"
              name="salary"
              placeholder="Annual Salary (AUD)"
              required
              step="0.01"
              value={form.salary}
              onChange={handleChange}
              className="w-full border rounded p-2"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="px-4 py-2 border rounded"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 bg-blue-600 text-white rounded"
              >
                {loading ? 'Saving...' : 'Save'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
