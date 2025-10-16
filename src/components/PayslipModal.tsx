// src/components/PayslipModal.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { X, Download, Loader2, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { downloadAllPayslips, downloadEmployeePayslip } from '@/lib/payslip-generator';
import { formatCurrency } from '@/lib/tax-calculator';
import { notify } from '@/lib/notify';
import { supabase } from '@/lib/supabaseClient';
import type { PayrollRun, PayrollItem } from '@/types/payroll';
import type { OrganisationSettings } from '@/types/organisation';
import { Employee } from '@/types/employee';

interface Props {
  payrollRun: PayrollRun;
  onClose: () => void;
}

export default function PayslipModal({ payrollRun, onClose }: Props) {
  const [payrollItems, setPayrollItems] = useState<PayrollItem[]>([]);
  const [orgSettings, setOrgSettings] = useState<OrganisationSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloadingAll, setDownloadingAll] = useState(false);
  const [downloadingIndividual, setDownloadingIndividual] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      // Get session
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.user) throw new Error('Not authenticated');

      // Load payroll items with employee data
      const { data: items, error: itemsError } = await supabase
        .from('payroll_items')
        .select(
          `
          *,
          employees (*)
        `
        )
        .eq('payroll_run_id', payrollRun.id)
        .order('created_at', { ascending: false });

      if (itemsError) throw itemsError;
      setPayrollItems(items || []);

      // Load org settings
      const { data: settings, error: settingsError } = await supabase
        .from('organisation_settings')
        .select('*')
        .eq('user_id', session.user.id)
        .single();

      if (settingsError && settingsError.code !== 'PGRST116') {
        throw settingsError;
      }
      setOrgSettings(settings);
    } catch (error) {
      console.error('Error loading data:', error);
      notify.error('Error', 'Failed to load payslip data');
    } finally {
      setLoading(false);
    }
  }, [payrollRun.id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleDownloadAll = async () => {
    if (!orgSettings) {
      notify.error('Error', 'Organisation settings not found');
      return;
    }

    setDownloadingAll(true);
    try {
      await downloadAllPayslips(payrollRun, payrollItems, orgSettings);
      notify.success(
        'Payslips Downloaded',
        `${payrollItems.length} payslip(s) downloaded successfully`
      );
    } catch (error) {
      console.error('Error downloading payslips:', error);
      notify.error(
        'Download Failed',
        error instanceof Error ? error.message : 'Failed to download payslips'
      );
    } finally {
      setDownloadingAll(false);
    }
  };

  const handleDownloadIndividual = async (item: PayrollItem) => {
    if (!item.employees || !orgSettings) {
      notify.error('Error', 'Missing employee or organisation data');
      return;
    }

    setDownloadingIndividual(item.id);
    try {
      // Cast to Employee type since we fetched all fields
      const employee = item.employees as Employee;
      await downloadEmployeePayslip(payrollRun, item, employee, orgSettings);
      notify.success('Payslip Downloaded', `${employee.full_name}'s payslip downloaded`);
    } catch (error) {
      console.error('Error downloading payslip:', error);
      notify.error(
        'Download Failed',
        error instanceof Error ? error.message : 'Failed to download payslip'
      );
    } finally {
      setDownloadingIndividual(null);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FileText className="h-6 w-6 text-blue-600" />
            <div>
              <h2 className="text-xl font-bold text-gray-900">Employee Payslips</h2>
              <p className="text-sm text-gray-600">
                Pay Run:{' '}
                {payrollRun.pay_date ? new Date(payrollRun.pay_date).toLocaleDateString() : 'N/A'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-4 overflow-y-auto flex-1">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
          ) : (
            <div className="space-y-4">
              {/* Summary */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                  <div>
                    <div className="text-sm text-blue-600">Employees</div>
                    <div className="text-2xl font-bold text-blue-900">{payrollItems.length}</div>
                  </div>
                  <div>
                    <div className="text-sm text-blue-600">Gross</div>
                    <div className="text-2xl font-bold text-blue-900">
                      {formatCurrency(payrollItems.reduce((sum, item) => sum + item.gross, 0))}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-blue-600">Tax</div>
                    <div className="text-2xl font-bold text-blue-900">
                      {formatCurrency(payrollItems.reduce((sum, item) => sum + item.tax, 0))}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-blue-600">Net</div>
                    <div className="text-2xl font-bold text-blue-900">
                      {formatCurrency(payrollItems.reduce((sum, item) => sum + item.net, 0))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Download All Button */}
              <Button
                onClick={handleDownloadAll}
                disabled={downloadingAll}
                className="w-full bg-blue-600 hover:bg-blue-700"
              >
                {downloadingAll ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating All Payslips...
                  </>
                ) : (
                  <>
                    <Download className="mr-2 h-4 w-4" />
                    Download All Payslips ({payrollItems.length})
                  </>
                )}
              </Button>

              {/* Individual Payslips */}
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-gray-700 mb-2">Individual Payslips</h3>
                {payrollItems.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border hover:bg-blue-50 hover:border-blue-300 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-sm font-bold text-blue-600">
                        {item.employees?.full_name
                          ?.split(' ')
                          .map((n) => n[0])
                          .join('') || '??'}
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">
                          {item.employees?.full_name || 'Unknown Employee'}
                        </div>
                        <div className="text-sm text-gray-600">
                          Net: {formatCurrency(item.net)}
                          {item.employees?.employment_type === 'contractor' && (
                            <span className="ml-2 px-2 py-0.5 text-xs bg-purple-100 text-purple-700 rounded">
                              Contractor
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <Button
                      onClick={() => handleDownloadIndividual(item)}
                      disabled={downloadingIndividual === item.id}
                      size="sm"
                      variant="outline"
                    >
                      {downloadingIndividual === item.id ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Generating...
                        </>
                      ) : (
                        <>
                          <Download className="mr-2 h-4 w-4" />
                          Download
                        </>
                      )}
                    </Button>
                  </div>
                ))}
              </div>

              {/* Info */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <p className="text-sm text-gray-700">
                  <strong>📄 About Payslips:</strong> Each payslip is generated as a professional
                  PDF with your company branding. It includes gross pay, deductions, net pay, and
                  YTD summaries. Contractor payslips show special treatment for tax and super.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t flex justify-end gap-3">
          <Button onClick={onClose} variant="outline">
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}
