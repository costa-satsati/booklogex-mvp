'use server';

import { createClient } from '@/lib/supabaseServer';
import { checkOverlap } from '@/lib/payroll';

export async function createDraftPayRun(params: {
  orgId: string;
  frequency: 'WEEKLY' | 'FORTNIGHTLY' | 'MONTHLY';
  periodStart: string;
  periodEnd: string;
  payDate: string;
}): Promise<{ ok: true; id: string } | { error: string }> {
  try {
    const supabase = createClient(); // ✅ no await

    // Validation
    const start = new Date(params.periodStart);
    const end = new Date(params.periodEnd);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()))
      return { error: 'Invalid dates' };
    if (start > end) return { error: 'Period start must be before end' };

    // Overlap check
    const overlap = await checkOverlap(supabase, params.orgId, start, end);
    if (overlap.error) return { error: overlap.error };
    if (overlap.exists) return { error: 'Selected period overlaps an existing pay run.' };

    const idempotencyKey = `${params.orgId}:${params.periodStart}:${params.periodEnd}`;

    const { data, error } = await supabase
      .from('payroll_runs')
      .insert([
        {
          org_id: params.orgId,
          frequency: params.frequency,
          pay_period_start: params.periodStart,
          pay_period_end: params.periodEnd,
          pay_date: params.payDate,
          status: 'draft',
          idempotency_key: idempotencyKey,
          total_gross: 0,
          total_tax: 0,
          total_super: 0,
          total_net: 0,
        },
      ])
      .select('id')
      .single();

    if (error) {
      // Handle duplicate key gracefully
      if (error.code === '23505') {
        const { data: existing } = await supabase
          .from('payroll_runs')
          .select('id')
          .eq('idempotency_key', idempotencyKey)
          .single();
        if (existing?.id) return { ok: true, id: existing.id };
      }
      return { error: error.message };
    }

    return { ok: true, id: data.id };
  } catch (e: unknown) {
    console.error('❌ createDraftPayRun failed:', e);
    const message = e instanceof Error ? e.message : 'Unknown error';
    return { error: message };
  }
}
