'use client';

import { Button } from '@/components/ui/button';
import { Loader2, AlertTriangle, X } from 'lucide-react';

interface ConfirmDeleteModalProps {
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
  employeeName?: string;
}

export default function ConfirmDeleteModal({
  title,
  message,
  onConfirm,
  onCancel,
  loading = false,
  employeeName,
}: ConfirmDeleteModalProps) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full">
        {/* Header with danger color */}
        <div className="bg-red-50 border-b border-red-200 px-6 py-4 flex items-center justify-between rounded-t-lg">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
              <AlertTriangle className="text-red-600" size={20} />
            </div>
            <h3 className="text-lg font-semibold text-red-900">{title}</h3>
          </div>
          <button
            onClick={onCancel}
            disabled={loading}
            className="text-red-400 hover:text-red-600 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <p className="text-gray-700">{message}</p>

          {employeeName && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <p className="text-sm text-amber-900">
                <strong>Warning:</strong> Deleting <strong>{employeeName}</strong> will:
              </p>
              <ul className="text-sm text-amber-800 mt-2 ml-4 space-y-1 list-disc">
                <li>Remove all their payroll history</li>
                <li>Delete associated pay runs</li>
                <li>Cannot be undone</li>
              </ul>
            </div>
          )}

          <div className="flex gap-3 mt-6">
            <Button variant="outline" onClick={onCancel} disabled={loading} className="flex-1">
              Cancel
            </Button>
            <Button
              onClick={onConfirm}
              disabled={loading}
              className="flex-1 bg-red-600 hover:bg-red-700 text-white"
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete Employee'
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
