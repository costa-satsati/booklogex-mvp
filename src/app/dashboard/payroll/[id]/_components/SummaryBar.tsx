import type { PayrollItem } from '@/types/payroll';

export default function SummaryBar({ items }: { items: PayrollItem[] }) {
  const totals = items.reduce(
    (acc, i) => ({
      gross: acc.gross + (i.gross || 0),
      tax: acc.tax + (i.tax || 0),
      super: acc.super + (i.super || 0),
      net: acc.net + (i.net || 0),
    }),
    { gross: 0, tax: 0, super: 0, net: 0 }
  );

  const fmt = (v: number) => v.toLocaleString('en-AU', { style: 'currency', currency: 'AUD' });

  return (
    <div className="mt-4 flex justify-end">
      <div className="bg-slate-50 border rounded-lg px-5 py-3 flex flex-wrap items-center gap-4 text-sm text-slate-700 shadow-sm">
        <span>
          <strong>Gross:</strong> {fmt(totals.gross)}
        </span>
        <span>
          <strong>Tax:</strong> {fmt(totals.tax)}
        </span>
        <span>
          <strong>Super:</strong> {fmt(totals.super)}
        </span>
        <span className="text-emerald-700 font-semibold">
          <strong>Net:</strong> {fmt(totals.net)}
        </span>
      </div>
    </div>
  );
}
