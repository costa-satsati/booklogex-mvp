'use client';

export default function ConfirmDeleteModal({
  title = 'Confirm Deletion',
  message = 'Are you sure you want to delete this item?',
  onConfirm,
  onCancel,
  loading = false,
}: {
  title?: string;
  message?: string;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
  loading?: boolean;
}) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg p-6 w-96 space-y-4">
        <h2 className="text-lg font-semibold text-gray-800">{title}</h2>
        <p className="text-gray-600">{message}</p>

        <div className="flex justify-end gap-2 mt-4">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 border rounded text-gray-700 hover:bg-gray-100"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            {loading ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  );
}
