// src/lib/stp/stp-storage.ts
import { supabase } from '@/lib/supabaseClient';
import type { StpReport, StpReportDb } from '@/types/stp';
import { exportStpToCsv } from './stp-csv-exporter';

/**
 * Save STP report to database
 */
export async function saveStpReport(
  report: StpReport,
  payrollRunId: string,
  orgId: string,
  userId: string
): Promise<{ success: boolean; reportId?: string; error?: string }> {
  try {
    // Generate CSV for storage
    const csvData = exportStpToCsv(report);

    // Generate unique submission key
    const submissionKey = `STP-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Insert report
    const { data, error } = await supabase
      .from('stp_reports')
      .insert({
        org_id: orgId,
        payroll_run_id: payrollRunId,
        report_type: report.reportType,
        lodgement_method: 'manual',
        lodgement_status: 'pending',
        submission_key: submissionKey,
        report_data: report as unknown as Record<string, unknown>,
        csv_data: csvData,
        created_by: userId,
      })
      .select()
      .single();

    if (error) throw error;

    return { success: true, reportId: data.id };
  } catch (error) {
    console.error('Error saving STP report:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Mark STP report as lodged
 */
export async function markStpReportLodged(
  reportId: string,
  stpIdentifier?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('stp_reports')
      .update({
        lodgement_status: 'lodged',
        lodged_at: new Date().toISOString(),
        stp_identifier: stpIdentifier,
        updated_at: new Date().toISOString(),
      })
      .eq('id', reportId);

    if (error) throw error;

    return { success: true };
  } catch (error) {
    console.error('Error marking STP report as lodged:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Update payroll run with STP lodgement info
 */
export async function markPayrollRunStpLodged(
  payrollRunId: string,
  stpReportId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('payroll_runs')
      .update({
        stp_lodged: true,
        stp_lodged_at: new Date().toISOString(),
        stp_report_id: stpReportId,
      })
      .eq('id', payrollRunId);

    if (error) throw error;

    return { success: true };
  } catch (error) {
    console.error('Error updating payroll run STP status:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Fetch all STP reports for organisation
 */
export async function fetchStpReports(
  orgId: string
): Promise<{ success: boolean; reports?: StpReportDb[]; error?: string }> {
  try {
    const { data, error } = await supabase
      .from('stp_reports')
      .select('*')
      .eq('org_id', orgId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return { success: true, reports: data || [] };
  } catch (error) {
    console.error('Error fetching STP reports:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Fetch single STP report
 */
export async function fetchStpReport(
  reportId: string
): Promise<{ success: boolean; report?: StpReportDb; error?: string }> {
  try {
    const { data, error } = await supabase
      .from('stp_reports')
      .select('*')
      .eq('id', reportId)
      .single();

    if (error) throw error;

    return { success: true, report: data };
  } catch (error) {
    console.error('Error fetching STP report:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
