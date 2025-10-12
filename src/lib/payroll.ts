// ---------------------------------------------
// 3) lib/payroll.ts — shared helpers (server‑side)
// ---------------------------------------------

import type { SupabaseClient } from '@supabase/supabase-js';

export async function checkOverlap(
  supabase: SupabaseClient,
  orgId: string,
  start: Date,
  end: Date
): Promise<{ exists: boolean; error?: string }> {
  const startIso = start.toISOString().slice(0, 10);
  const endIso = end.toISOString().slice(0, 10);

  // NOT (existing_end < start OR existing_start > end)
  const { error } = await supabase
    .from('payroll_runs')
    .select('id, period_start, period_end')
    .eq('org_id', orgId)
    .neq('status', 'CANCELLED')
    .or(`and(period_end.lt.${startIso}),and(period_start.gt.${endIso})`, {
      referencedTable: 'payroll_runs',
    });

  if (error) return { exists: false, error: error.message };

  // If query returns 0 rows due to OR logic nuance, do a second pass client‑side
  const { data: all, error: e2 } = await supabase
    .from('payroll_runs')
    .select('id, period_start, period_end')
    .eq('org_id', orgId)
    .neq('status', 'CANCELLED');
  if (e2) return { exists: false, error: e2.message };

  const overlap = (all ?? []).some((r) => {
    const aStart = new Date(r.period_start as unknown as string);
    const aEnd = new Date(r.period_end as unknown as string);
    return !(aEnd < start || aStart > end);
  });

  return { exists: overlap };
}

export async function getLastRun(supabase: SupabaseClient, orgId: string) {
  const { data } = await supabase
    .from('payroll_runs')
    .select('frequency, period_start, period_end, pay_date')
    .eq('org_id', orgId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  return data ?? null;
}
