"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function AddTransactionModal({ onClose }: { onClose: () => void }) {
  const [form, setForm] = useState({
    txn_date: "",
    description: "",
    amount: "",
    type: "expense" as "income" | "expense" | "",
    category: "Office Supplies",
  });
  const [loading, setLoading] = useState(false);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const amount = parseFloat(form.amount);
    const gst_amount = +(amount * 0.1).toFixed(2);

    // 👇 Fetch current user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    // 👇 Get user’s org_id
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("org_id")
      .eq("id", user?.id)
      .single();

    if (!profile?.org_id) {
      alert("Organisation not found. Please complete onboarding first.");
      setLoading(false);
      return;
    }

    // 👇 Insert transaction
    const { error } = await supabase.from("transactions").insert([
      {
        txn_date: form.txn_date,
        description: form.description,
        amount,
        gst_amount,
        type: form.type,
        category: form.category,
        org_id: profile.org_id,
        user_id: user?.id,
      },
    ]);

    setLoading(false);

    if (error) {
      console.error("❌ Insert failed:", error);
      alert("Error: " + error.message);
    } else {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <form
        onSubmit={handleSubmit}
        className="bg-white p-6 rounded-lg w-96 space-y-4 shadow-lg"
      >
        <h2 className="text-lg font-semibold">Add Transaction</h2>

        <input
          type="date"
          name="txn_date"
          required
          value={form.txn_date}
          onChange={handleChange}
          className="w-full border rounded p-2"
        />

        <input
          type="text"
          name="description"
          placeholder="Description"
          required
          value={form.description}
          onChange={handleChange}
          className="w-full border rounded p-2"
        />

        <input
          type="number"
          name="amount"
          step="0.01"
          placeholder="Amount"
          required
          value={form.amount}
          onChange={handleChange}
          className="w-full border rounded p-2"
        />

        {/* Transaction type */}
        <label className="block text-sm font-medium text-gray-700">Type</label>
        <select
          name="type"
          value={form.type}
          onChange={(e) => {
            const newType = e.target.value as "income" | "expense";
            setForm({
              ...form,
              type: newType,
              category: newType === "income" ? "Sales" : "Office Supplies",
            });
          }}
          className="w-full p-2 border rounded"
          required
        >
          <option value="">Select type</option>
          <option value="income">Income</option>
          <option value="expense">Expense</option>
        </select>

        {/* Category dropdown */}
        <label className="block text-sm font-medium text-gray-700 mt-2">
          Category
        </label>
        <select
          name="category"
          value={form.category}
          onChange={handleChange}
          className="w-full p-2 border rounded"
          required
        >
          {form.type === "income" ? (
            <>
              <option value="Sales">Sales</option>
              <option value="Consulting">Consulting</option>
            </>
          ) : form.type === "expense" ? (
            <>
              <option value="Office Supplies">Office Supplies</option>
              <option value="Travel">Travel</option>
              <option value="Utilities">Utilities</option>
            </>
          ) : (
            <option value="">Select type first</option>
          )}
        </select>

        {/* Buttons */}
        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border rounded hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            {loading ? "Saving..." : "Save"}
          </button>
        </div>
      </form>
    </div>
  );
}
