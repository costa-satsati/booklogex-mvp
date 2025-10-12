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
} from 'recharts';
import { saveAs } from 'file-saver';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

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
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<PeriodOption>('thisMonth');

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
    setLoading(true);
    const { start, end } = getDateRange();

    try {
      let txnQuery = supabase.from('transactions').select('type, amount, gst_amount, txn_date');
      let payrollQuery = supabase
        .from('payroll_runs')
        .select('total_gross, total_tax, total_super, pay_period_end');

      if (start && end) {
        txnQuery = txnQuery.gte('txn_date', start.toISOString()).lte('txn_date', end.toISOString());
        payrollQuery = payrollQuery
          .gte('pay_period_end', start.toISOString())
          .lte('pay_period_end', end.toISOString());
      }

      const [{ data: txns, error: txnError }, { data: payroll, error: payrollError }] =
        await Promise.all([txnQuery, payrollQuery]);

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
    } catch (err) {
      console.error('❌ Failed to load dashboard summary:', err);
    } finally {
      setLoading(false);
    }
  }, [getDateRange]);

  useEffect(() => {
    void loadSummary();
  }, [loadSummary]);

  if (loading || !summary) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500">
        Loading summary...
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
    { name: 'Income', value: summary.income },
    { name: 'Expenses', value: summary.expenses },
    { name: 'Wages', value: summary.wages },
    { name: 'GST Payable', value: gstPayable },
  ];

  // 📄 CSV Export
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
    saveAs(blob, `BAS_Summary_${labelMap[period].replace(/\s/g, '_')}.csv`);
  };

  const exportPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text(`BAS Summary - ${labelMap[period]}`, 14, 20);
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

    doc.save(`BAS_Summary_${labelMap[period].replace(/\s/g, '_')}.pdf`);
  };

  return (
    <div className="space-y-6">
      {/* Header + Actions */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold">Dashboard Summary</h1>
        <div className="flex gap-2">
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value as PeriodOption)}
            className="border rounded p-2 text-sm"
          >
            {Object.entries(labelMap).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>

          {/* 📄 Export Buttons */}
          <button
            onClick={exportCSV}
            className="border border-gray-300 rounded px-3 py-2 text-sm hover:bg-gray-50"
          >
            Export CSV
          </button>
          <button
            onClick={exportPDF}
            className="border border-gray-300 rounded px-3 py-2 text-sm hover:bg-gray-50"
          >
            Export PDF
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard label="Income (excl. GST)" value={summary.income} color="green" />
        <SummaryCard label="Expenses (excl. GST)" value={summary.expenses} color="red" />
        <SummaryCard label="GST Payable" value={gstPayable} color="blue" />
        <SummaryCard
          label="Net Profit (pre-tax)"
          value={netProfit}
          color={netProfit >= 0 ? 'green' : 'red'}
        />
      </div>

      {/* Payroll */}
      <h2 className="text-lg font-semibold mt-6">Payroll Summary</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <SummaryCard label="Wages" value={summary.wages} color="gray" />
        <SummaryCard label="PAYG Withheld" value={summary.payg} color="red" />
        <SummaryCard label="Superannuation" value={summary.super} color="blue" />
      </div>

      {/* Chart */}
      <h2 className="text-lg font-semibold mt-6">Overview Chart</h2>
      <div className="bg-white border rounded-lg shadow p-4 h-80">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 20, right: 20, left: 0, bottom: 10 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip
              formatter={(val: number) =>
                val.toLocaleString('en-AU', { style: 'currency', currency: 'AUD' })
              }
            />
            <Legend />
            <Bar dataKey="value" fill="#2563eb" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  color = 'gray',
}: {
  label: string;
  value: number;
  color?: 'green' | 'red' | 'blue' | 'gray';
}) {
  const colorMap: Record<string, string> = {
    green: 'text-green-700 bg-green-50 border-green-200',
    red: 'text-red-700 bg-red-50 border-red-200',
    blue: 'text-blue-700 bg-blue-50 border-blue-200',
    gray: 'text-gray-700 bg-gray-50 border-gray-200',
  };

  return (
    <div className={`p-4 border rounded-lg shadow-sm ${colorMap[color]}`}>
      <div className="text-sm text-gray-600">{label}</div>
      <div className="text-xl font-semibold mt-1">
        {value.toLocaleString('en-AU', { style: 'currency', currency: 'AUD' })}
      </div>
    </div>
  );
}
