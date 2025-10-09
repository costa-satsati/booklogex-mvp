"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { PlusCircle } from "lucide-react";
import AddTransactionModal from "@/components/AddTransactionModal";

type Transaction = {
  id: string;
  txn_date: string;
  description: string;
  amount: number;
  gst_amount: number;
  type: "income" | "expense";
};

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [filter, setFilter] = useState<
    "this" | "last" | "thisQuarter" | "lastQuarter" | "all"
  >("this");

  // 🧭 Load transactions
  const loadTransactions = async () => {
    const { data, error } = await supabase
      .from("transactions")
      .select("*")
      .order("txn_date", { ascending: false });
    if (!error && data) setTransactions(data);
  };

  // 📆 Reusable date range calculator
  const getDateRange = () => {
    const now = new Date();
    const month = now.getMonth();
    const year = now.getFullYear();
    let start: Date | null = null;
    let end: Date | null = null;

    const getQuarterStart = (m: number, y: number) =>
      new Date(y, Math.floor(m / 3) * 3, 1);
    const getQuarterEnd = (m: number, y: number) =>
      new Date(y, Math.floor(m / 3) * 3 + 3, 0);

    if (filter === "this") {
      start = new Date(year, month, 1);
      end = new Date(year, month + 1, 0);
    } else if (filter === "last") {
      start = new Date(year, month - 1, 1);
      end = new Date(year, month, 0);
    } else if (filter === "thisQuarter") {
      start = getQuarterStart(month, year);
      end = getQuarterEnd(month, year);
    } else if (filter === "lastQuarter") {
      const prevQuarterMonth = month - 3;
      const adjYear = prevQuarterMonth < 0 ? year - 1 : year;
      const adjMonth = (prevQuarterMonth + 12) % 12;
      start = getQuarterStart(adjMonth, adjYear);
      end = getQuarterEnd(adjMonth, adjYear);
    }

    return { start, end };
  };

  // 💰 Totals calculator
  const getFilteredTotals = () => {
    const { start, end } = getDateRange();

    const filtered = transactions.filter((t) => {
      if (!start || !end) return true;
      const txn = new Date(t.txn_date);
      return txn >= start && txn <= end;
    });

    return filtered.reduce(
      (acc, t) => {
        if (t.type === "income") {
          acc.income += t.amount;
          acc.gst += t.gst_amount;
        } else if (t.type === "expense") {
          acc.expense += t.amount;
          acc.gst -= t.gst_amount;
        }
        return acc;
      },
      { income: 0, expense: 0, gst: 0 }
    );
  };

  // 🧾 Table filtering
  const visibleTransactions = useMemo(() => {
    if (filter === "all") return transactions;
    const { start, end } = getDateRange();
    return transactions.filter((t) => {
      if (!start || !end) return true;
      const txn = new Date(t.txn_date);
      return txn >= start && txn <= end;
    });
  }, [transactions, filter]);

  // ♻️ Load + Realtime sync
  useEffect(() => {
    loadTransactions();

    const channel = supabase
      .channel("transactions-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "transactions" },
        (payload) => {
          console.log("Realtime event:", payload);
          setTransactions((prev) => {
            const { eventType, new: newRecord, old: oldRecord } = payload;

            switch (eventType) {
              case "INSERT":
                return [newRecord as Transaction, ...prev];
              case "UPDATE":
                return prev.map((t) =>
                  t.id === oldRecord.id ? (newRecord as Transaction) : t
                );
              case "DELETE":
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
  }, []);

  const totals = getFilteredTotals();
  const net = totals.income - totals.expense;

  // 🏷 Label generator
  const periodLabel = (() => {
    const fmtMonth = (d: Date) =>
      d.toLocaleString("en-AU", { month: "long" });
    const now = new Date();

    switch (filter) {
      case "this":
        return fmtMonth(now);
      case "last":
        return fmtMonth(new Date(now.getFullYear(), now.getMonth() - 1));
      case "thisQuarter": {
        const q = Math.floor(now.getMonth() / 3) + 1;
        return `Q${q} ${now.getFullYear()}`;
      }
      case "lastQuarter": {
        const lastQMonth = now.getMonth() - 3;
        const adjYear =
          lastQMonth < 0 ? now.getFullYear() - 1 : now.getFullYear();
        const q = Math.floor(((lastQMonth + 12) % 12) / 3) + 1;
        return `Q${q} ${adjYear}`;
      }
      default:
        return "All Time";
    }
  })();

  // 💡 UI
  return (
    <div className="space-y-4">
      {/* Header + Filter */}
      <div className="flex justify-between items-center">
        <h1 className="text-xl font-semibold">Transactions</h1>
        <div className="flex items-center gap-3">
          <select
            value={filter}
            onChange={(e) =>
              setFilter(
                e.target.value as
                  | "this"
                  | "last"
                  | "thisQuarter"
                  | "lastQuarter"
                  | "all"
              )
            }
            className="border rounded p-2 text-sm text-gray-700"
          >
            <option value="this">This Month</option>
            <option value="last">Last Month</option>
            <option value="thisQuarter">This Quarter</option>
            <option value="lastQuarter">Last Quarter</option>
            <option value="all">All Time</option>
          </select>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <PlusCircle size={18} /> Add
          </button>
        </div>
      </div>

      {/* 📊 Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="p-3 bg-green-50 border rounded-lg">
          <div className="text-sm text-gray-500">Income ({periodLabel})</div>
          <div className="text-lg font-semibold text-green-700">
            {totals.income.toLocaleString("en-AU", {
              style: "currency",
              currency: "AUD",
            })}
          </div>
        </div>
        <div className="p-3 bg-red-50 border rounded-lg">
          <div className="text-sm text-gray-500">Expenses ({periodLabel})</div>
          <div className="text-lg font-semibold text-red-700">
            {totals.expense.toLocaleString("en-AU", {
              style: "currency",
              currency: "AUD",
            })}
          </div>
        </div>
        <div className="p-3 bg-blue-50 border rounded-lg">
          <div className="text-sm text-gray-500">GST</div>
          <div className="text-lg font-semibold text-blue-700">
            {totals.gst.toLocaleString("en-AU", {
              style: "currency",
              currency: "AUD",
            })}
          </div>
        </div>
        <div className="p-3 bg-gray-50 border rounded-lg">
          <div className="text-sm text-gray-500">Net</div>
          <div
            className={`text-lg font-semibold ${
              net >= 0 ? "text-green-700" : "text-red-700"
            }`}
          >
            {net.toLocaleString("en-AU", {
              style: "currency",
              currency: "AUD",
            })}
          </div>
        </div>
      </div>

      {/* BAS due hint */}
      {filter.includes("Quarter") && (
        <p className="text-xs text-gray-500 italic">
          BAS due the month after the quarter ends.
        </p>
      )}

      {/* 📋 Transactions Table */}
      <div className="bg-white rounded-lg shadow">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-100 text-gray-600 uppercase">
            <tr>
              <th className="px-4 py-2 text-left">Date</th>
              <th className="px-4 py-2 text-left">Description</th>
              <th className="px-4 py-2 text-right">Amount</th>
              <th className="px-4 py-2 text-right">GST</th>
              <th className="px-4 py-2 text-left">Type</th>
            </tr>
          </thead>
          <tbody>
            {visibleTransactions.map((t) => (
              <tr key={t.id} className="border-t">
                <td className="px-4 py-2">{t.txn_date}</td>
                <td className="px-4 py-2">{t.description}</td>
                <td className="px-4 py-2 text-right">
                  {t.amount.toLocaleString("en-AU", {
                    style: "currency",
                    currency: "AUD",
                  })}
                </td>
                <td className="px-4 py-2 text-right">
                  {t.gst_amount.toLocaleString("en-AU", {
                    style: "currency",
                    currency: "AUD",
                  })}
                </td>
                <td className="px-4 py-2 capitalize">{t.type}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && <AddTransactionModal onClose={() => setShowModal(false)} />}
    </div>
  );
}
