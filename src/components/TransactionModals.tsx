// src/components/TransactionModals.tsx
'use client';

import { useState } from 'react';
import { X, Calendar, DollarSign, Edit2, AlertCircle, Trash2, Plus } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { notify } from '@/lib/notify';

type Transaction = {
  id: string;
  txn_date: string;
  description: string;
  amount: number;
  gst_amount: number;
  type: 'income' | 'expense';
  category: string;
  payment_method?: string | null;
  reference?: string | null;
  notes?: string | null;
  created_at?: string;
};

export const CATEGORIES = {
  income: [
    'Sales',
    'Consulting',
    'Services',
    'Product Sales',
    'Subscriptions',
    'Interest',
    'Other Income',
  ],
  expense: [
    'Office Supplies',
    'Travel',
    'Utilities',
    'Rent',
    'Salaries & Wages',
    'Marketing',
    'Software & Subscriptions',
    'Insurance',
    'Professional Fees',
    'Bank Fees',
    'Repairs & Maintenance',
    'Vehicle Expenses',
    'Telecommunications',
    'Other Expenses',
  ],
};

export const PAYMENT_METHODS = [
  'Bank Transfer',
  'Credit Card',
  'Debit Card',
  'Cash',
  'Direct Debit',
  'BPAY',
  'PayPal',
  'Other',
];

// ==================== ADD TRANSACTION MODAL ====================
export function AddTransactionModal({ onClose }: { onClose: () => void }) {
  const [form, setForm] = useState({
    txn_date: new Date().toISOString().split('T')[0],
    description: '',
    amount: '',
    type: '' as 'income' | 'expense' | '',
    category: '',
    payment_method: '',
    reference: '',
    notes: '',
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!form.type) {
      notify.error('Validation Error', 'Please select a transaction type');
      return;
    }
    if (!form.category) {
      notify.error('Validation Error', 'Please select a category');
      return;
    }
    if (!form.description.trim()) {
      notify.error('Validation Error', 'Please enter a description');
      return;
    }
    if (!form.amount || parseFloat(form.amount) <= 0) {
      notify.error('Validation Error', 'Please enter a valid amount');
      return;
    }

    setLoading(true);

    try {
      const amount = parseFloat(form.amount);
      const gst_amount = +(amount * 0.1).toFixed(2);

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('No user found');

      const { data: profile } = await supabase
        .from('user_profiles')
        .select('org_id')
        .eq('id', user.id)
        .single();

      if (!profile?.org_id) {
        notify.error('Error', 'Organisation not found. Please complete onboarding first.');
        setLoading(false);
        return;
      }

      const { error } = await supabase.from('transactions').insert([
        {
          txn_date: form.txn_date,
          description: form.description.trim(),
          amount,
          gst_amount,
          type: form.type,
          category: form.category,
          payment_method: form.payment_method || null,
          reference: form.reference.trim() || null,
          notes: form.notes.trim() || null,
          org_id: profile.org_id,
          user_id: user.id,
        },
      ]);

      if (error) throw error;

      notify.success('Success', 'Transaction added successfully');
      onClose();
    } catch (error) {
      console.error('Insert failed:', error);
      notify.error('Error', error instanceof Error ? error.message : 'Failed...');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-hidden shadow-2xl">
        <div className="border-b px-6 py-4 flex items-center justify-between bg-gradient-to-r from-blue-50 to-blue-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center">
              <Plus className="text-white" size={20} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Add Transaction</h2>
              <p className="text-sm text-gray-600">Record income or expense</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/50 rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-4 overflow-y-auto max-h-[calc(90vh-200px)]">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex gap-3">
            <AlertCircle className="text-blue-600 flex-shrink-0 mt-0.5" size={18} />
            <div className="text-sm text-blue-900">
              <strong>GST is calculated automatically</strong> at 10%. Enter amounts excluding GST.
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Transaction Type *
              </label>
              <select
                value={form.type}
                onChange={(e) => {
                  const newType = e.target.value as 'income' | 'expense';
                  setForm({
                    ...form,
                    type: newType,
                    category: newType ? CATEGORIES[newType][0] : '',
                  });
                }}
                className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">Select type</option>
                <option value="income">Income</option>
                <option value="expense">Expense</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Category *</label>
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={!form.type}
                required
              >
                {!form.type && <option value="">Select type first</option>}
                {form.type &&
                  CATEGORIES[form.type].map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Transaction Date *
            </label>
            <input
              type="date"
              value={form.txn_date}
              onChange={(e) => setForm({ ...form, txn_date: e.target.value })}
              className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Description *</label>
            <input
              type="text"
              placeholder="e.g., Office supplies from Officeworks"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Amount (excluding GST) *
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 font-medium">
                $
              </span>
              <input
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
                className="w-full pl-8 p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Enter amount excluding GST. GST (10%) will be added automatically.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Payment Method</label>
            <select
              value={form.payment_method}
              onChange={(e) => setForm({ ...form, payment_method: e.target.value })}
              className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select method (optional)</option>
              {PAYMENT_METHODS.map((method) => (
                <option key={method} value={method}>
                  {method}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Reference / Invoice Number
            </label>
            <input
              type="text"
              placeholder="e.g., INV-2025-001, Receipt #12345"
              value={form.reference}
              onChange={(e) => setForm({ ...form, reference: e.target.value })}
              className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
            <textarea
              placeholder="Additional information about this transaction..."
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              rows={3}
              className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          {form.amount && parseFloat(form.amount) > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Amount (excl GST)</span>
                  <span className="font-medium">${parseFloat(form.amount).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">GST (10%)</span>
                  <span className="font-medium">${(parseFloat(form.amount) * 0.1).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-base font-bold pt-2 border-t border-blue-300">
                  <span>Total (inc GST)</span>
                  <span>${(parseFloat(form.amount) * 1.1).toFixed(2)}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="border-t px-6 py-4 bg-gray-50 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Adding Transaction...' : 'Add Transaction'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ==================== VIEW TRANSACTION MODAL ====================
export function ViewTransactionModal({
  transaction,
  onClose,
  onEdit,
  onDelete,
}: {
  transaction: Transaction;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-hidden shadow-2xl">
        <div className="border-b px-6 py-4 flex items-center justify-between bg-gradient-to-r from-blue-50 to-blue-100">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center ${
                transaction.type === 'income' ? 'bg-green-600' : 'bg-red-600'
              }`}
            >
              <DollarSign className="text-white" size={20} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Transaction Details</h2>
              <p className="text-sm text-gray-600">
                {new Date(transaction.txn_date).toLocaleDateString('en-AU', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/50 rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          <div className="flex items-center gap-3">
            <span
              className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium ${
                transaction.type === 'income'
                  ? 'bg-green-100 text-green-700'
                  : 'bg-red-100 text-red-700'
              }`}
            >
              {transaction.type === 'income' ? '↑ Income' : '↓ Expense'}
            </span>
            <span className="px-3 py-1.5 rounded-full text-sm font-medium bg-blue-100 text-blue-700">
              {transaction.category}
            </span>
          </div>

          <div
            className={`rounded-lg p-6 border-2 ${
              transaction.type === 'income'
                ? 'bg-green-50 border-green-200'
                : 'bg-red-50 border-red-200'
            }`}
          >
            <div className="space-y-3">
              <div className="flex justify-between items-start">
                <span className="text-sm text-gray-600">Amount (excl GST)</span>
                <span className="text-2xl font-bold text-gray-900">
                  {transaction.amount.toLocaleString('en-AU', {
                    style: 'currency',
                    currency: 'AUD',
                  })}
                </span>
              </div>
              <div className="flex justify-between items-center pt-3 border-t">
                <span className="text-sm text-gray-600">GST (10%)</span>
                <span className="font-semibold text-gray-900">
                  {transaction.gst_amount.toLocaleString('en-AU', {
                    style: 'currency',
                    currency: 'AUD',
                  })}
                </span>
              </div>
              <div className="flex justify-between items-center pt-3 border-t-2 border-gray-300">
                <span className="text-sm font-medium text-gray-900">Total (inc GST)</span>
                <span className="text-xl font-bold text-gray-900">
                  {(transaction.amount + transaction.gst_amount).toLocaleString('en-AU', {
                    style: 'currency',
                    currency: 'AUD',
                  })}
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-500 uppercase">Description</label>
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="font-medium text-gray-900">{transaction.description}</p>
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-500 uppercase">Date</label>
              <div className="p-3 bg-gray-50 rounded-lg flex items-center gap-2">
                <Calendar size={16} className="text-gray-400" />
                <span className="font-medium text-gray-900">
                  {new Date(transaction.txn_date).toLocaleDateString('en-AU')}
                </span>
              </div>
            </div>
            {transaction.payment_method && (
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-500 uppercase">
                  Payment Method
                </label>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="font-medium text-gray-900">{transaction.payment_method}</p>
                </div>
              </div>
            )}
            {transaction.reference && (
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-500 uppercase">Reference</label>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="font-medium text-gray-900">{transaction.reference}</p>
                </div>
              </div>
            )}
          </div>

          {transaction.notes && (
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-500 uppercase">Notes</label>
              <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                <p className="text-gray-900 whitespace-pre-wrap">{transaction.notes}</p>
              </div>
            </div>
          )}

          <div className="pt-4 border-t space-y-2">
            <div className="flex items-center justify-between text-xs text-gray-500">
              <span>Transaction ID</span>
              <span className="font-mono">{transaction.id.slice(0, 8)}...</span>
            </div>
            {transaction.created_at && (
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>Created</span>
                <span>{new Date(transaction.created_at).toLocaleString('en-AU')}</span>
              </div>
            )}
          </div>
        </div>

        <div className="border-t px-6 py-4 bg-gray-50 flex gap-3">
          <button
            onClick={onDelete}
            className="px-4 py-2 border border-red-200 text-red-600 rounded-lg hover:bg-red-50 transition-colors flex items-center gap-2 font-medium"
          >
            <Trash2 size={16} />
            Delete
          </button>
          <button
            onClick={onEdit}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 font-medium"
          >
            <Edit2 size={16} />
            Edit Transaction
          </button>
        </div>
      </div>
    </div>
  );
}

// ==================== EDIT TRANSACTION MODAL ====================
export function EditTransactionModal({
  transaction,
  onClose,
  onSave,
}: {
  transaction: Transaction;
  onClose: () => void;
  onSave: (updated: Partial<Transaction>) => Promise<void>;
}) {
  const [form, setForm] = useState({
    txn_date: transaction.txn_date,
    description: transaction.description,
    amount: transaction.amount.toString(),
    type: transaction.type,
    category: transaction.category,
    payment_method: transaction.payment_method || '',
    reference: transaction.reference || '',
    notes: transaction.notes || '',
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const amount = parseFloat(form.amount);
      const gst_amount = +(amount * 0.1).toFixed(2);

      await onSave({
        txn_date: form.txn_date,
        description: form.description,
        amount,
        gst_amount,
        type: form.type,
        category: form.category,
        payment_method: form.payment_method || null,
        reference: form.reference || null,
        notes: form.notes || null,
      });

      onClose();
    } catch (error) {
      console.error('Save failed:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-hidden shadow-2xl">
        <div className="border-b px-6 py-4 flex items-center justify-between bg-gradient-to-r from-blue-50 to-blue-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center">
              <Edit2 className="text-white" size={20} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Edit Transaction</h2>
              <p className="text-sm text-gray-600">Update transaction details</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/50 rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-4 overflow-y-auto max-h-[calc(90vh-200px)]">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Transaction Type *
              </label>
              <select
                value={form.type}
                onChange={(e) => {
                  const newType = e.target.value as 'income' | 'expense';
                  setForm({ ...form, type: newType, category: CATEGORIES[newType][0] });
                }}
                className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="income">Income</option>
                <option value="expense">Expense</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Category *</label>
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {CATEGORIES[form.type].map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Transaction Date *
            </label>
            <input
              type="date"
              value={form.txn_date}
              onChange={(e) => setForm({ ...form, txn_date: e.target.value })}
              className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Description *</label>
            <input
              type="text"
              placeholder="e.g., Office supplies from Officeworks"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Amount (excluding GST) *
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 font-medium">
                $
              </span>
              <input
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
                className="w-full pl-8 p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">GST will be calculated automatically (10%)</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Payment Method</label>
            <select
              value={form.payment_method}
              onChange={(e) => setForm({ ...form, payment_method: e.target.value })}
              className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select method (optional)</option>
              {PAYMENT_METHODS.map((method) => (
                <option key={method} value={method}>
                  {method}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Reference / Invoice Number
            </label>
            <input
              type="text"
              placeholder="e.g., INV-2025-001"
              value={form.reference}
              onChange={(e) => setForm({ ...form, reference: e.target.value })}
              className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
            <textarea
              placeholder="Additional information..."
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              rows={3}
              className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Amount (excl GST)</span>
                <span className="font-medium">${parseFloat(form.amount || '0').toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">GST (10%)</span>
                <span className="font-medium">
                  ${(parseFloat(form.amount || '0') * 0.1).toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between text-base font-bold pt-2 border-t border-blue-300">
                <span>Total (inc GST)</span>
                <span>${(parseFloat(form.amount || '0') * 1.1).toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t px-6 py-4 bg-gray-50 flex gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50"
          >
            {loading ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ==================== DELETE TRANSACTION MODAL ====================
export function DeleteTransactionModal({
  transaction,
  onClose,
  onConfirm,
}: {
  transaction: Transaction;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}) {
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    setLoading(true);
    try {
      await onConfirm();
      onClose();
    } catch (error) {
      console.error('Delete failed:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-md shadow-2xl">
        <div className="px-6 py-4 border-b">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
              <AlertCircle className="text-red-600" size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Delete Transaction</h2>
              <p className="text-sm text-gray-600">This action cannot be undone</p>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-4">
          <p className="text-gray-700">
            Are you sure you want to delete this transaction? This will permanently remove it from
            your records.
          </p>

          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Date</span>
                <span className="font-medium">
                  {new Date(transaction.txn_date).toLocaleDateString('en-AU')}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Description</span>
                <span className="font-medium">{transaction.description}</span>
              </div>
              <div className="flex justify-between text-base font-bold pt-2 border-t border-red-300">
                <span>Amount</span>
                <span>
                  {(transaction.amount + transaction.gst_amount).toLocaleString('en-AU', {
                    style: 'currency',
                    currency: 'AUD',
                  })}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t px-6 py-4 bg-gray-50 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium"
          >
            Cancel
          </button>
          <button
            onClick={handleDelete}
            disabled={loading}
            className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium disabled:opacity-50"
          >
            {loading ? 'Deleting...' : 'Delete Transaction'}
          </button>
        </div>
      </div>
    </div>
  );
}
