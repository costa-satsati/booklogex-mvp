// src/app/api/email/send-batch/route.ts
// CORRECTED VERSION - matches your existing types

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabaseServer';
import { sendBatchPayslips } from '@/lib/email/send-batch-payslips';
import { generatePayslipPDFBase64 } from '@/lib/payslip-generator';
import type { PayrollRun, PayrollItem } from '@/types/payroll';
import type { Employee } from '@/types/employee';
import type { Organisation } from '@/types/organisation';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Authenticate user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse request body
    const body = await request.json();
    const { payrollRunId } = body;

    if (!payrollRunId) {
      return NextResponse.json(
        { error: 'Missing required parameter: payrollRunId' },
        { status: 400 }
      );
    }

    // Fetch payroll run
    const { data: payrollRun, error: runError } = await supabase
      .from('payroll_runs')
      .select('*')
      .eq('id', payrollRunId)
      .single();

    if (runError || !payrollRun) {
      console.error('Error fetching payroll run:', runError);
      return NextResponse.json({ error: 'Payroll run not found' }, { status: 404 });
    }

    // Fetch all payroll items with employee data
    const { data: payrollItems, error: itemsError } = await supabase
      .from('payroll_items')
      .select('*, employees(*)')
      .eq('payroll_run_id', payrollRunId);

    if (itemsError || !payrollItems || payrollItems.length === 0) {
      console.error('Error fetching payroll items:', itemsError);
      return NextResponse.json({ error: 'No payroll items found for this run' }, { status: 404 });
    }

    // Fetch organisation settings
    const { data: orgSettings, error: settingsError } = await supabase
      .from('organisations')
      .select('*')
      .eq('owner_id', user.id)
      .single();

    if (settingsError || !orgSettings) {
      console.error('Error fetching organisation:', settingsError);
      return NextResponse.json({ error: 'Organisation settings not found' }, { status: 404 });
    }

    // Type assertions
    const run = payrollRun as PayrollRun;
    const items = payrollItems as PayrollItem[];
    const org = orgSettings as Organisation;

    // Generate PDFs for all employees (cache them)
    const pdfCache = new Map<string, string>();
    const pdfGenerationErrors: string[] = [];

    console.log(`Generating ${items.length} PDFs...`);

    for (const item of items) {
      const employee = item.employees as Employee;

      // Skip if no employee data
      if (!employee) {
        console.warn(`Skipping item ${item.id}: No employee data`);
        pdfGenerationErrors.push(`Item ${item.id}: No employee data`);
        continue;
      }

      // Skip if no email address (will be caught later in validation)
      if (!employee.email) {
        console.log(`Skipping PDF generation for ${employee.full_name}: No email address`);
        continue;
      }

      // Generate PDF
      try {
        const pdfBase64 = await generatePayslipPDFBase64(run, item, employee, org);
        pdfCache.set(employee.id, pdfBase64);
        console.log(`✓ Generated PDF for ${employee.full_name}`);
      } catch (pdfError) {
        const errorMsg = `Failed to generate PDF for ${employee.full_name}`;
        console.error(errorMsg, pdfError);
        pdfGenerationErrors.push(errorMsg);
      }
    }

    // Log PDF generation summary
    console.log(
      `PDF Generation Complete: ${pdfCache.size} successful, ${pdfGenerationErrors.length} failed`
    );

    if (pdfGenerationErrors.length > 0) {
      console.warn('PDF generation errors:', pdfGenerationErrors);
    }

    // Send batch emails
    console.log('Starting batch email send...');
    const results = await sendBatchPayslips(run, items, pdfCache, org);

    console.log(
      `Batch send complete: ${results.sent} sent, ${results.failed} failed, ${results.skipped} skipped`
    );

    // Format results for response
    const formattedResults = results.results.map((r) => ({
      name: r.employee.full_name,
      email: r.employee.email || 'No email',
      success: r.success,
      error: r.error,
      skipped: r.skipped,
      skipReason: r.skipReason,
    }));

    return NextResponse.json({
      success: true,
      total: results.total,
      sent: results.sent,
      failed: results.failed,
      skipped: results.skipped,
      duration: results.duration,
      results: formattedResults,
      pdfGenerationErrors: pdfGenerationErrors.length > 0 ? pdfGenerationErrors : undefined,
    });
  } catch (error) {
    console.error('Error in batch send API:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
