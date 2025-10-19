// src/components/OnboardingBanner.tsx
'use client';

import { useState, useEffect } from 'react';
import { X, CheckCircle2, ArrowRight, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  href: string;
  completed: boolean;
}

interface Props {
  hasBusinessName: boolean;
  hasEmployees: boolean;
  hasPayrollRun: boolean;
}

export default function OnboardingBanner({ hasBusinessName, hasEmployees, hasPayrollRun }: Props) {
  const router = useRouter();
  const [dismissed, setDismissed] = useState(false);

  // Check if banner was previously dismissed
  useEffect(() => {
    const wasDismissed = localStorage.getItem('onboarding-banner-dismissed');
    if (wasDismissed === 'true') {
      setDismissed(true);
    }
  }, []);

  const steps: OnboardingStep[] = [
    {
      id: 'business',
      title: 'Add business details',
      description: 'Business name and ABN',
      href: '/dashboard/settings',
      completed: hasBusinessName,
    },
    {
      id: 'employee',
      title: 'Add your first employee',
      description: 'Set up your team',
      href: '/dashboard/employees/new',
      completed: hasEmployees,
    },
    {
      id: 'payroll',
      title: 'Run your first payroll',
      description: 'Pay your team',
      href: '/dashboard/payroll/new',
      completed: hasPayrollRun,
    },
  ];

  const completedSteps = steps.filter((s) => s.completed).length;
  const allComplete = completedSteps === steps.length;
  const nextStep = steps.find((s) => !s.completed);

  // Don't show if dismissed or all complete
  if (dismissed || allComplete) {
    return null;
  }

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem('onboarding-banner-dismissed', 'true');
  };

  const progressPercentage = (completedSteps / steps.length) * 100;

  return (
    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl p-6 mb-6 shadow-sm relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-blue-100 rounded-full blur-3xl opacity-30 -mr-32 -mt-32"></div>

      <button
        onClick={handleDismiss}
        className="absolute top-4 right-4 p-1 hover:bg-blue-100 rounded-full transition-colors z-10"
        aria-label="Dismiss"
      >
        <X size={18} className="text-gray-600" />
      </button>

      <div className="relative z-10">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center flex-shrink-0 shadow-lg">
            <Sparkles className="text-white" size={24} />
          </div>

          <div className="flex-1">
            <h3 className="text-xl font-bold text-gray-900 mb-1">Welcome to BookLogex! 🎉</h3>
            <p className="text-gray-600 mb-4">
              Let&apos;s get you set up in 3 quick steps ({completedSteps}/{steps.length} complete)
            </p>

            {/* Progress bar */}
            <div className="w-full bg-blue-100 rounded-full h-2 mb-6 overflow-hidden">
              <div
                className="bg-gradient-to-r from-blue-600 to-indigo-600 h-full rounded-full transition-all duration-500 ease-out"
                style={{ width: `${progressPercentage}%` }}
              ></div>
            </div>

            {/* Steps */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
              {steps.map((step, index) => (
                <button
                  key={step.id}
                  onClick={() => router.push(step.href)}
                  disabled={step.completed}
                  className={`text-left p-4 rounded-lg border-2 transition-all ${
                    step.completed
                      ? 'bg-green-50 border-green-200 cursor-default'
                      : 'bg-white border-blue-200 hover:border-blue-400 hover:shadow-md cursor-pointer'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
                        step.completed
                          ? 'bg-green-600'
                          : 'bg-blue-100 text-blue-600 font-bold text-sm'
                      }`}
                    >
                      {step.completed ? (
                        <CheckCircle2 size={16} className="text-white" />
                      ) : (
                        index + 1
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div
                        className={`font-semibold text-sm mb-0.5 ${
                          step.completed ? 'text-green-900' : 'text-gray-900'
                        }`}
                      >
                        {step.title}
                      </div>
                      <div
                        className={`text-xs ${step.completed ? 'text-green-600' : 'text-gray-600'}`}
                      >
                        {step.completed ? '✓ Complete' : step.description}
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>

            {/* CTA */}
            {nextStep && (
              <Button
                onClick={() => router.push(nextStep.href)}
                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg"
              >
                {nextStep.title}
                <ArrowRight size={16} className="ml-2" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
