// src/app/dashboard/payroll/[id]/_components/PayrollSteps.tsx
'use client';

import { CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

type PayrollStep = 'setup' | 'employees' | 'review' | 'complete';

interface Props {
  currentStep: PayrollStep;
  onStepClick: (step: PayrollStep) => void;
  isReadOnly?: boolean;
}

const steps: { key: PayrollStep; label: string; icon: string }[] = [
  { key: 'setup', label: 'Details', icon: '📋' },
  { key: 'employees', label: 'Employees', icon: '👥' },
  { key: 'review', label: 'Review', icon: '✓' },
  { key: 'complete', label: 'Complete', icon: '✨' },
];

export default function PayrollSteps({ currentStep, onStepClick, isReadOnly }: Props) {
  const stepIndex = steps.findIndex((s) => s.key === currentStep);

  return (
    <div className="flex items-center justify-between max-w-3xl mx-auto">
      {steps.map((step, idx) => {
        const isActive = step.key === currentStep;
        const isCompleted = idx < stepIndex;
        const isClickable = !isReadOnly && idx <= stepIndex;

        return (
          <div key={step.key} className="flex items-center flex-1">
            {/* Step Circle */}
            <button
              onClick={() => isClickable && onStepClick(step.key)}
              disabled={!isClickable}
              className={cn(
                'flex flex-col items-center gap-2 transition-all',
                isClickable ? 'cursor-pointer' : 'cursor-not-allowed'
              )}
            >
              <div
                className={cn(
                  'w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold transition-all',
                  isActive && 'bg-blue-600 text-white scale-110 shadow-lg',
                  isCompleted && 'bg-green-100 text-green-700',
                  !isActive && !isCompleted && 'bg-gray-100 text-gray-600'
                )}
              >
                {isCompleted ? <CheckCircle2 size={24} /> : step.icon}
              </div>
              <div
                className={cn(
                  'text-xs font-medium text-center transition-colors',
                  isActive && 'text-blue-700',
                  isCompleted && 'text-green-700',
                  !isActive && !isCompleted && 'text-gray-600'
                )}
              >
                {step.label}
              </div>
            </button>

            {/* Connector Line */}
            {idx < steps.length - 1 && (
              <div
                className={cn(
                  'flex-1 h-1 mx-4 rounded transition-all',
                  idx < stepIndex ? 'bg-green-200' : 'bg-gray-200'
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
