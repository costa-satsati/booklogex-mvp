// src/app/api/email/send-payslip/route.ts
// CORRECTED VERSION - Fixed to use synchronous PDF generation

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabaseServer';
import { sendPayslipEmail } from '@/lib/email/send-payslip';
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
    const { payrollRunId, payrollItemId } = body;

    if (!payrollRunId || !payrollItemId) {
      return NextResponse.json(
        { error: 'Missing required parameters: payrollRunId and payrollItemId' },
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

    // Fetch payroll item with employee data
    const { data: payrollItem, error: itemError } = await supabase
      .from('payroll_items')
      .select('*, employees(*)')
      .eq('id', payrollItemId)
      .single();

    if (itemError || !payrollItem) {
      console.error('Error fetching payroll item:', itemError);
      return NextResponse.json({ error: 'Payroll item not found' }, { status: 404 });
    }

    // Validate employee data exists
    if (!payrollItem.employees) {
      return NextResponse.json(
        { error: 'Employee data not found for this payroll item' },
        { status: 404 }
      );
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

    // Type assertions for safety
    const employee = payrollItem.employees as Employee;
    const run = payrollRun as PayrollRun;
    const item = payrollItem as PayrollItem;
    const org = orgSettings as Organisation;

    // Generate PDF as base64
    // ✅ FIXED: This is now synchronous (no await needed)
    let pdfBase64: string;
    try {
      pdfBase64 = generatePayslipPDFBase64(run, item, employee, org);
    } catch (pdfError) {
      console.error('Error generating PDF:', pdfError);
      return NextResponse.json({ error: 'Failed to generate payslip PDF' }, { status: 500 });
    }

    // Send email
    const result = await sendPayslipEmail({
      payrollRun: run,
      payrollItem: item,
      employee,
      orgSettings: org,
      pdfBase64,
    });

    if (!result.success) {
      console.error('Error sending email:', result.error);
      return NextResponse.json({ error: result.error || 'Failed to send email' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      messageId: result.messageId,
      message: `Payslip sent successfully to ${employee.full_name}`,
    });
  } catch (error) {
    console.error('Error in send-payslip API:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
