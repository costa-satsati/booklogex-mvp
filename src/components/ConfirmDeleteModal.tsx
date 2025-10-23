// src/components/ConfirmDeleteModal.tsx (FIXED)
'use client';

import { AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

type ConfirmDeleteModalProps = {
  title: string;
  message: string;
  onCancel: () => void;
  onConfirm: () => void;
  loading?: boolean;
};

export default function ConfirmDeleteModal({
  title,
  message,
  onCancel,
  onConfirm,
  loading = false,
}: ConfirmDeleteModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop - Changed from bg-black to bg-gray-900 with opacity */}
      <div className="absolute inset-0 bg-gray-900/50 backdrop-blur-sm" onClick={onCancel} />

      {/* Modal */}
      <div className="relative bg-white rounded-xl shadow-2xl max-w-md w-full mx-4 p-6 animate-in fade-in zoom-in duration-200">
        <div className="text-center">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
            <AlertCircle className="h-6 w-6 text-red-600" />
          </div>

          <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
          <p className="text-sm text-gray-600 mb-6">{message}</p>

          <div className="flex gap-3">
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
                'Delete'
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
