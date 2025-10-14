// src/app/dashboard/payroll/[id]/page.tsx (COMPLETE REPLACEMENT)
'use client';

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { notify } from '@/lib/notify';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { PayrollRun, PayrollItem, Employee } from '@/types/payroll';

// Import step components (we'll create these next)
import PayrollSteps from './_components/PayrollSteps';
import SetupStep from './_components/SetupStep';
import EmployeesStep from './_components/EmployeesStep';
import ReviewStep from './_components/ReviewStep';
import CompleteStep from './_components/CompleteStep';

type PayrollStep = 'setup' | 'employees' | 'review' | 'complete';

export default function ModernPayrollFlow({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();

  const [currentStep, setCurrentStep] = useState<PayrollStep>('setup');
  const [loading, setLoading] = useState(true);
  const [payrollRun, setPayrollRun] = useState<PayrollRun | null>(null);
  const [payrollItems, setPayrollItems] = useState<PayrollItem[]>([]);
  const [allEmployees, setAllEmployees] = useState<Employee[]>([]);
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<string[]>([]);

  // Load payroll run, items, and employees
  useEffect(() => {
    loadPayrollData();
  }, [id]);

  const loadPayrollData = async () => {
    setLoading(true);
    try {
      // Load payroll run
      const { data: runData, error: runError } = await supabase
        .from('payroll_runs')
        .select('*')
        .eq('id', id)
        .single();

      if (runError) throw runError;
      setPayrollRun(runData);

      // Load payroll items
      const { data: itemsData, error: itemsError } = await supabase
        .from('payroll_items')
        .select('*, employees(full_name, email, position, tfn)')
        .eq('payroll_run_id', id);

      if (itemsError) throw itemsError;
      setPayrollItems(itemsData || []);
      setSelectedEmployeeIds(itemsData?.map((item) => item.employee_id) || []);

      // Load all active employees
      const { data: employeesData, error: employeesError } = await supabase
        .from('employees')
        .select('*')
        .eq('org_id', runData.org_id)
        .eq('active', true)
        .order('full_name');

      if (employeesError) throw employeesError;
      setAllEmployees(employeesData || []);

      // Determine which step to show based on status
      if (runData.status === 'completed') {
        setCurrentStep('complete');
      } else if (itemsData && itemsData.length > 0) {
        setCurrentStep('review');
      } else {
        setCurrentStep('employees');
      }
    } catch (error) {
      console.error('Error loading payroll:', error);
      notify.error('Error', 'Failed to load payroll data');
    } finally {
      setLoading(false);
    }
  };

  const handleStepChange = (step: PayrollStep) => {
    if (payrollRun?.status === 'completed') {
      notify.info('Pay run completed', 'This pay run cannot be edited');
      return;
    }
    setCurrentStep(step);
  };

  const handleEmployeesConfirmed = (items: PayrollItem[]) => {
    setPayrollItems(items);
    setCurrentStep('review');
  };

  const handleFinalize = async () => {
    try {
      const { error } = await supabase.rpc('finalize_payrun', { p_run: id });
      if (error) throw error;

      notify.success('Success', 'Pay run finalized successfully');
      setCurrentStep('complete');
      await loadPayrollData();
    } catch (error) {
      console.error('Error finalizing:', error);
      notify.error('Error', 'Failed to finalize pay run');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!payrollRun) {
    return (
      <div className="p-6 text-center">
        <p className="text-gray-600">Pay run not found</p>
        <Button onClick={() => router.push('/dashboard/payroll')} className="mt-4">
          Back to Payroll
        </Button>
      </div>
    );
  }

  const isReadOnly = payrollRun.status === 'completed';

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-5xl mx-auto px-6 py-4">
          <Button
            variant="ghost"
            onClick={() => router.push('/dashboard/payroll')}
            className="mb-4"
          >
            <ArrowLeft size={16} className="mr-2" />
            Back to Payroll
          </Button>

          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                {isReadOnly ? 'Completed Pay Run' : 'Create Pay Run'}
              </h1>
              <p className="text-gray-600 mt-1">
                {payrollRun.pay_period_start} to {payrollRun.pay_period_end}
              </p>
            </div>
            {isReadOnly && (
              <div className="px-4 py-2 bg-green-50 border border-green-200 rounded-lg">
                <span className="text-sm font-medium text-green-700">✓ Completed</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Progress Steps */}
      <div className="bg-white border-b">
        <div className="max-w-5xl mx-auto px-6 py-6">
          <PayrollSteps
            currentStep={currentStep}
            onStepClick={handleStepChange}
            isReadOnly={isReadOnly}
          />
        </div>
      </div>

      {/* Step Content */}
      <div className="max-w-5xl mx-auto px-6 py-8">
        {currentStep === 'setup' && (
          <SetupStep payrollRun={payrollRun} onContinue={() => setCurrentStep('employees')} />
        )}

        {currentStep === 'employees' && (
          <EmployeesStep
            payrollRun={payrollRun}
            allEmployees={allEmployees}
            currentItems={payrollItems}
            selectedEmployeeIds={selectedEmployeeIds}
            onBack={() => setCurrentStep('setup')}
            onContinue={handleEmployeesConfirmed}
            isReadOnly={isReadOnly}
          />
        )}

        {currentStep === 'review' && (
          <ReviewStep
            payrollRun={payrollRun}
            payrollItems={payrollItems}
            onBack={() => setCurrentStep('employees')}
            onFinalize={handleFinalize}
            isReadOnly={isReadOnly}
          />
        )}

        {currentStep === 'complete' && (
          <CompleteStep
            payrollRun={payrollRun}
            payrollItems={payrollItems}
            onBackToDashboard={() => router.push('/dashboard/payroll')}
          />
        )}
      </div>
    </div>
  );
}
