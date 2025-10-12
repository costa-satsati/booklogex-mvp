'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Button } from '@/components/ui/button';
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { notify } from '@/lib/notify';

interface ValidationResult {
  rule: string;
  passed: boolean;
}

interface Props {
  runId: string;
  runStatus: string;
}

export default function ReviewPanel({ runId, runStatus }: Props) {
  const [results, setResults] = useState<ValidationResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [finalizing, setFinalizing] = useState(false);
  const [validated, setValidated] = useState(false);
  const router = useRouter();

  const runValidation = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('validate_payrun', { p_run: runId });
      if (error) throw error;
      setResults(data || []);
      setValidated(true);

      const passed = data.every((r: ValidationResult) => r.passed);
      if (passed) notify.success('All checks passed', 'You can now finalize this pay run.');
      else notify.info('Some checks need review', 'See the list below.');
    } catch (e: any) {
      console.error(e);
      notify.error('Validation failed', e.message ?? 'Could not run validation.');
    } finally {
      setLoading(false);
    }
  };

  const finalize = async () => {
    setFinalizing(true);
    try {
      const { error } = await supabase.rpc('finalize_payrun', { p_run: runId });
      if (error) throw error;

      notify.success('Pay run finalized', 'Redirecting to Payroll Overview…');
      setTimeout(() => router.push('/dashboard/payroll'), 1200);
    } catch (e: any) {
      console.error(e);
      notify.error('Failed to finalize pay run', e.message ?? 'Please try again.');
    } finally {
      setFinalizing(false);
    }
  };

  const allPassed = results.length > 0 && results.every((r) => r.passed);

  return (
    <div className="rounded-xl border bg-white p-6 shadow-sm space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-slate-800">Review & Validation</h3>
        {runStatus === 'draft' && (
          <Button
            variant="outline"
            size="sm"
            onClick={runValidation}
            disabled={loading}
            className="border-slate-300"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Checking...
              </>
            ) : (
              'Validate Now'
            )}
          </Button>
        )}
      </div>

      {results.length > 0 && (
        <ul className="space-y-1 text-sm">
          {results.map((r) => (
            <li
              key={r.rule}
              className={`flex items-center gap-2 ${
                r.passed ? 'text-emerald-700' : 'text-amber-700'
              }`}
            >
              {r.passed ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
              {r.rule}
            </li>
          ))}
        </ul>
      )}

      {runStatus === 'draft' && validated && (
        <Button
          onClick={finalize}
          disabled={!allPassed || finalizing}
          className="w-full bg-emerald-600 hover:bg-emerald-700"
        >
          {finalizing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Finalizing…
            </>
          ) : (
            '✅ Finalize Pay Run'
          )}
        </Button>
      )}

      {runStatus === 'finalized' && (
        <div className="flex items-center gap-2 text-emerald-700 text-sm font-medium">
          <CheckCircle2 className="h-4 w-4" />
          This pay run is finalized — editing disabled.
        </div>
      )}
    </div>
  );
}
