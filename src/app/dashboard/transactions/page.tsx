'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import {
  Plus,
  Search,
  Download,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Loader2,
  FileText,
  Eye,
  Edit2,
  Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { notify } from '@/lib/notify';
import { saveAs } from 'file-saver';
import type { Transaction } from '@/types/transaction';
import TransactionModals from '@/components/TransactionModals';

type FilterOption = 'this' | 'last' | 'thisQuarter' | 'lastQuarter' | 'all';
type ModalState = 'add' | 'view' | 'edit' | 'delete' | null;

const computeDateRange = (filter: FilterOption) => {
  const now = new Date();
  const month = now.getMonth();
  const year = now.getFullYear();
  let start: Date | null = null;
  let end: Date | null = null;

  const getQuarterStart = (m: number, y: number) => new Date(y, Math.floor(m / 3) * 3, 1);
  const getQuarterEnd = (m: number, y: number) => new Date(y, Math.floor(m / 3) * 3 + 3, 0);

  if (filter === 'this') {
    start = new Date(year, month, 1);
    end = new Date(year, month + 1, 0);
  } else if (filter === 'last') {
    start = new Date(year, month - 1, 1);
    end = new Date(year, month, 0);
  } else if (filter === 'thisQuarter') {
    start = getQuarterStart(month, year);
    end = getQuarterEnd(month, year);
  } else if (filter === 'lastQuarter') {
    const prevQuarterMonth = month - 3;
    const adjYear = prevQuarterMonth < 0 ? year - 1 : year;
    const adjMonth = (prevQuarterMonth + 12) % 12;
    start = getQuarterStart(adjMonth, adjYear);
    end = getQuarterEnd(adjMonth, adjYear);
  }

  return { start, end };
};

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalState, setModalState] = useState<ModalState>(null);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [filter, setFilter] = useState<FilterOption>('this');
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'income' | 'expense'>('all');

  const loadTransactions = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .order('txn_date', { ascending: false });

      if (error) throw error;
      setTransactions(data || []);
    } catch (error) {
      console.error('Error loading transactions:', error);
      notify.error('Error', 'Failed to load transactions');
    } finally {
      setLoading(false);
    }
  }, []);

  const dateRange = useMemo(() => computeDateRange(filter), [filter]);

  const filteredTransactions = useMemo(() => {
    const { start, end } = dateRange;

    return transactions.filter((t) => {
      // Date filter
      if (filter !== 'all') {
        if (!start || !end) return false;
        const txnDate = new Date(t.txn_date);
        if (txnDate < start || txnDate > end) return false;
      }

      // Search filter (include category and reference)
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesDescription = t.description.toLowerCase().includes(query);
        const matchesCategory = t.category?.toLowerCase().includes(query);
        const matchesReference = t.reference?.toLowerCase().includes(query);
        if (!matchesDescription && !matchesCategory && !matchesReference) return false;
      }

      // Type filter
      if (typeFilter !== 'all' && t.type !== typeFilter) return false;

      return true;
    });
  }, [transactions, filter, dateRange, searchQuery, typeFilter]);

  const totals = useMemo(() => {
    return filteredTransactions.reduce(
      (acc, t) => {
        if (t.type === 'income') {
          acc.income += t.amount;
          acc.gst += t.gst_amount;
        } else if (t.type === 'expense') {
          acc.expense += t.amount;
          acc.gst -= t.gst_amount;
        }
        return acc;
      },
      { income: 0, expense: 0, gst: 0 }
    );
  }, [filteredTransactions]);

  useEffect(() => {
    void loadTransactions();

    const channel = supabase
      .channel('transactions-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'transactions' },
        (payload) => {
          setTransactions((prev) => {
            const { eventType, new: newRecord, old: oldRecord } = payload;

            switch (eventType) {
              case 'INSERT':
                return [newRecord as Transaction, ...prev];
              case 'UPDATE':
                return prev.map((t) => (t.id === oldRecord.id ? (newRecord as Transaction) : t));
              case 'DELETE':
                return prev.filter((t) => t.id !== oldRecord.id);
              default:
                return prev;
            }
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadTransactions]);

  const handleAdd = async () => {
    await loadTransactions();
    setModalState(null);
  };

  const handleEdit = async (updates: Partial<Transaction>) => {
    if (!selectedTransaction) return;

    try {
      const { error } = await supabase
        .from('transactions')
        .update(updates)
        .eq('id', selectedTransaction.id);

      if (error) throw error;

      await loadTransactions();
      notify.success('Updated', 'Transaction updated successfully');
      setModalState(null);
      setSelectedTransaction(null);
    } catch (error) {
      console.error('Error updating transaction:', error);
      notify.error(
        'Error',
        error instanceof Error ? error.message : 'Failed to update transaction'
      );
      throw error;
    }
  };

  const handleDelete = async () => {
    if (!selectedTransaction) return;

    try {
      const { error } = await supabase
        .from('transactions')
        .delete()
        .eq('id', selectedTransaction.id);

      if (error) throw error;

      await loadTransactions();
      notify.success('Deleted', 'Transaction deleted successfully');
      setModalState(null);
      setSelectedTransaction(null);
    } catch (error) {
      console.error('Error deleting transaction:', error);
      notify.error(
        'Error',
        error instanceof Error ? error.message : 'Failed to delete transaction'
      );
      throw error;
    }
  };

  const net = totals.income - totals.expense;

  const periodLabel = useMemo(() => {
    const fmtMonth = (d: Date) => d.toLocaleString('en-AU', { month: 'long' });
    const now = new Date();

    switch (filter) {
      case 'this':
        return fmtMonth(now);
      case 'last':
        return fmtMonth(new Date(now.getFullYear(), now.getMonth() - 1));
      case 'thisQuarter': {
        const q = Math.floor(now.getMonth() / 3) + 1;
        return `Q${q} ${now.getFullYear()}`;
      }
      case 'lastQuarter': {
        const lastQMonth = now.getMonth() - 3;
        const adjYear = lastQMonth < 0 ? now.getFullYear() - 1 : now.getFullYear();
        const q = Math.floor(((lastQMonth + 12) % 12) / 3) + 1;
        return `Q${q} ${adjYear}`;
      }
      default:
        return 'All Time';
    }
  }, [filter]);

  const exportCSV = () => {
    if (filteredTransactions.length === 0) {
      notify.info('No data to export');
      return;
    }

    const headers = [
      'Date',
      'Description',
      'Type',
      'Category',
      'Payment Method',
      'Reference',
      'Amount',
      'GST',
      'Total',
    ];
    const rows = filteredTransactions.map((t) => [
      t.txn_date,
      t.description,
      t.type,
      t.category || '',
      t.payment_method || '',
      t.reference || '',
      t.amount.toFixed(2),
      t.gst_amount.toFixed(2),
      (t.amount + t.gst_amount).toFixed(2),
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    saveAs(blob, `Transactions_${periodLabel.replace(/\s/g, '_')}.csv`);
    notify.success('Exported', 'CSV file downloaded successfully');
  };

  return (
    <div className="max-w-7xl space-y-4 md:space-y-6">
      {/* Header */}
      <div className="border-b pb-4 md:pb-6">
        <h1 className="text-2xl md:text-4xl font-bold text-gray-900">Transactions</h1>
        <p className="text-sm md:text-base text-gray-600 mt-1 md:mt-2">Track your income and expenses</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <div className="bg-gradient-to-br from-green-50 to-green-100 border border-green-200 rounded-xl p-4 md:p-6">
          <div className="flex items-center justify-between mb-2 md:mb-3">
            <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-green-600 flex items-center justify-center shadow-lg">
              <TrendingUp className="text-white" size={20} />
            </div>
          </div>
          <div className="text-xs md:text-sm text-green-600 font-medium">Income</div>
          <div className="text-xl md:text-3xl font-bold text-green-900 mt-1">
            {totals.income.toLocaleString('en-AU', {
              style: 'currency',
              currency: 'AUD',
              minimumFractionDigits: 0,
            })}
          </div>
          <div className="text-xs text-green-600 mt-1 md:mt-2">
            {filteredTransactions.filter((t) => t.type === 'income').length} txns
          </div>
        </div>

        <div className="bg-gradient-to-br from-red-50 to-red-100 border border-red-200 rounded-xl p-4 md:p-6">
          <div className="flex items-center justify-between mb-2 md:mb-3">
            <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-red-600 flex items-center justify-center shadow-lg">
              <TrendingDown className="text-white" size={20} />
            </div>
          </div>
          <div className="text-xs md:text-sm text-red-600 font-medium">Expenses</div>
          <div className="text-xl md:text-3xl font-bold text-red-900 mt-1">
            {totals.expense.toLocaleString('en-AU', {
              style: 'currency',
              currency: 'AUD',
              minimumFractionDigits: 0,
            })}
          </div>
          <div className="text-xs text-red-600 mt-1 md:mt-2">
            {filteredTransactions.filter((t) => t.type === 'expense').length} txns
          </div>
        </div>

        <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-xl p-4 md:p-6">
          <div className="flex items-center justify-between mb-2 md:mb-3">
            <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-blue-600 flex items-center justify-center shadow-lg">
              <FileText className="text-white" size={20} />
            </div>
          </div>
          <div className="text-xs md:text-sm text-blue-600 font-medium">Net GST</div>
          <div className="text-xl md:text-3xl font-bold text-blue-900 mt-1">
            {totals.gst.toLocaleString('en-AU', {
              style: 'currency',
              currency: 'AUD',
              minimumFractionDigits: 0,
            })}
          </div>
          <div className="text-xs text-blue-600 mt-1 md:mt-2 hidden md:block">
            {totals.gst >= 0 ? 'Payable to ATO' : 'Refund from ATO'}
          </div>
        </div>

        <div
          className={`bg-gradient-to-br ${net >= 0 ? 'from-purple-50 to-purple-100 border-purple-200' : 'from-amber-50 to-amber-100 border-amber-200'} border rounded-xl p-4 md:p-6`}
        >
          <div className="flex items-center justify-between mb-2 md:mb-3">
            <div
              className={`w-10 h-10 md:w-12 md:h-12 rounded-full ${net >= 0 ? 'bg-purple-600' : 'bg-amber-600'} flex items-center justify-center shadow-lg`}
            >
              <DollarSign className="text-white" size={20} />
            </div>
          </div>
          <div className={`text-xs md:text-sm ${net >= 0 ? 'text-purple-600' : 'text-amber-600'} font-medium`}>
            Net
          </div>
          <div
            className={`text-xl md:text-3xl font-bold ${net >= 0 ? 'text-purple-900' : 'text-amber-900'} mt-1`}
          >
            {net.toLocaleString('en-AU', {
              style: 'currency',
              currency: 'AUD',
              minimumFractionDigits: 0,
            })}
          </div>
          <div className={`text-xs ${net >= 0 ? 'text-purple-600' : 'text-amber-600'} mt-1 md:mt-2 hidden md:block`}>
            Income - Expenses
          </div>
        </div>
      </div>

      {/* Filters and Actions */}
      <div className="bg-white border rounded-lg shadow-sm p-3 md:p-4">
        <div className="flex flex-col gap-3 md:gap-4">
          {/* Search */}
          <div className="relative">
            <Search
              className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
              size={18}
            />
            <Input
              type="text"
              placeholder="Search transactions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-10"
            />
          </div>

          {/* Filters Row */}
          <div className="flex flex-col sm:flex-row gap-2 md:gap-3">
            {/* Period Filter */}
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as FilterOption)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 h-10"
            >
              <option value="this">This Month</option>
              <option value="last">Last Month</option>
              <option value="thisQuarter">This Quarter</option>
              <option value="lastQuarter">Last Quarter</option>
              <option value="all">All Time</option>
            </select>

            {/* Type Filter */}
            <div className="flex gap-2 flex-1 sm:flex-none">
              {[
                { key: 'all', label: 'All' },
                { key: 'income', label: 'Income' },
                { key: 'expense', label: 'Expense' },
              ].map((type) => (
                <button
                  key={type.key}
                  onClick={() => setTypeFilter(type.key as typeof typeFilter)}
                  className={`flex-1 sm:flex-none px-3 md:px-4 py-2 rounded-lg text-sm font-medium transition-colors min-h-[44px] sm:min-h-0 ${
                    typeFilter === type.key
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {type.label}
                </button>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={exportCSV}
              className="flex-1 sm:flex-none items-center gap-2 min-h-[44px] sm:min-h-0"
            >
              <Download size={16} />
              <span className="hidden sm:inline">Export</span>
            </Button>
            <Button
              onClick={() => setModalState('add')}
              size="sm"
              className="flex-1 sm:flex-none items-center gap-2 bg-blue-600 hover:bg-blue-700 min-h-[44px] sm:min-h-0"
            >
              <Plus size={16} />
              <span>Add</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600 mr-3" />
            <span className="text-gray-600 text-sm md:text-base">Loading transactions...</span>
          </div>
        ) : filteredTransactions.length === 0 ? (
          <div className="text-center py-12 px-4">
            <div className="text-gray-400 text-4xl md:text-5xl mb-4">📊</div>
            <h3 className="text-base md:text-lg font-semibold text-gray-900 mb-2">No transactions found</h3>
            <p className="text-sm md:text-base text-gray-600 mb-6">
              {searchQuery || typeFilter !== 'all'
                ? 'Try adjusting your filters'
                : 'Add your first transaction to get started'}
            </p>
            {!searchQuery && typeFilter === 'all' && (
              <Button
                onClick={() => setModalState('add')}
                className="bg-blue-600 hover:bg-blue-700 min-h-[44px]"
              >
                <Plus size={18} className="mr-2" />
                Add Your First Transaction
              </Button>
            )}
          </div>
        ) : (
          <>
            {/* Mobile Card View */}
            <div className="md:hidden divide-y">
              {filteredTransactions.map((t) => (
                <div key={t.id} className="p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                            t.type === 'income'
                              ? 'bg-green-100 text-green-700'
                              : 'bg-red-100 text-red-700'
                          }`}
                        >
                          {t.type === 'income' ? '↑' : '↓'}
                        </span>
                        <span className="text-xs text-gray-500">
                          {new Date(t.txn_date).toLocaleDateString('en-AU', {
                            day: 'numeric',
                            month: 'short',
                          })}
                        </span>
                      </div>
                      <div className="font-medium text-gray-900 mb-0.5 truncate">{t.description}</div>
                      {t.category && (
                        <div className="text-xs text-gray-500">{t.category}</div>
                      )}
                    </div>
                    <div className="text-right ml-3">
                      <div className="font-semibold text-gray-900">
                        {(t.amount + t.gst_amount).toLocaleString('en-AU', {
                          style: 'currency',
                          currency: 'AUD',
                        })}
                      </div>
                      {t.gst_amount > 0 && (
                        <div className="text-xs text-gray-500">
                          +{t.gst_amount.toLocaleString('en-AU', {
                            style: 'currency',
                            currency: 'AUD',
                          })} GST
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mt-3">
                    <button
                      onClick={() => {
                        setSelectedTransaction(t);
                        setModalState('view');
                      }}
                      className="flex-1 px-3 py-2 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors min-h-[44px] flex items-center justify-center gap-1"
                    >
                      <Eye size={14} />
                      View
                    </button>
                    <button
                      onClick={() => {
                        setSelectedTransaction(t);
                        setModalState('edit');
                      }}
                      className="flex-1 px-3 py-2 text-xs font-medium text-gray-600 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors min-h-[44px] flex items-center justify-center gap-1"
                    >
                      <Edit2 size={14} />
                      Edit
                    </button>
                    <button
                      onClick={() => {
                        setSelectedTransaction(t);
                        setModalState('delete');
                      }}
                      className="px-3 py-2 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50 text-gray-600 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium">Date</th>
                    <th className="px-4 py-3 text-left font-medium">Description</th>
                    <th className="px-4 py-3 text-left font-medium">Type</th>
                    <th className="px-4 py-3 text-right font-medium">Amount (excl GST)</th>
                    <th className="px-4 py-3 text-right font-medium">GST</th>
                    <th className="px-4 py-3 text-right font-medium">Total</th>
                    <th className="px-4 py-3 text-right font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTransactions.map((t) => (
                    <tr key={t.id} className="border-b hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        {new Date(t.txn_date).toLocaleDateString('en-AU', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900">{t.description}</div>
                        {t.category && (
                          <div className="text-xs text-gray-500 mt-0.5">{t.category}</div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            t.type === 'income'
                              ? 'bg-green-100 text-green-700'
                              : 'bg-red-100 text-red-700'
                          }`}
                        >
                          {t.type === 'income' ? '↑ Income' : '↓ Expense'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-medium">
                        {t.amount.toLocaleString('en-AU', {
                          style: 'currency',
                          currency: 'AUD',
                        })}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {t.gst_amount.toLocaleString('en-AU', {
                          style: 'currency',
                          currency: 'AUD',
                        })}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-gray-900">
                        {(t.amount + t.gst_amount).toLocaleString('en-AU', {
                          style: 'currency',
                          currency: 'AUD',
                        })}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => {
                              setSelectedTransaction(t);
                              setModalState('view');
                            }}
                            className="p-1 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                            title="View details"
                          >
                            <Eye size={16} />
                          </button>
                          <button
                            onClick={() => {
                              setSelectedTransaction(t);
                              setModalState('edit');
                            }}
                            className="p-1 text-gray-600 hover:bg-gray-50 rounded transition-colors"
                            title="Edit transaction"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button
                            onClick={() => {
                              setSelectedTransaction(t);
                              setModalState('delete');
                            }}
                            className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                            title="Delete transaction"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* Transaction Count */}
      {filteredTransactions.length > 0 && (
        <div className="text-sm text-gray-500 text-center">
          Showing {filteredTransactions.length} of {transactions.length} transactions
        </div>
      )}

      {/* Modals */}
      <TransactionModals
        modalState={modalState}
        selectedTransaction={selectedTransaction}
        onClose={() => {
          setModalState(null);
          setSelectedTransaction(null);
        }}
        onAdd={handleAdd}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onModalStateChange={(newState) => setModalState(newState)}
      />
    </div>
  );
}
