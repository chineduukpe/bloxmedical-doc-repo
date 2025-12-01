'use client';

interface DeleteConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  documentName: string;
  isDeleting?: boolean;
}

export default function DeleteConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  documentName,
  isDeleting = false,
}: DeleteConfirmationModalProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 backdrop-blur-sm flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className="bg-white bg-opacity-95 backdrop-blur-md rounded-lg p-6 w-full max-w-md mx-4 shadow-2xl transform transition-all duration-200 hover:shadow-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Warning Icon */}
        <div className="flex justify-center mb-4">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
            <img src="/et_caution.svg" alt="Caution" className="w-8 h-8" />
          </div>
        </div>

        {/* Title */}
        <h2 className="text-xl font-bold text-gray-800 text-center mb-4">
          {documentName.includes('document(s)')
            ? 'Delete Documents Permanently'
            : 'Delete Document Permanently'}
        </h2>

        {/* Confirmation Message */}
        <p className="text-gray-600 text-center mb-6">
          Are you sure you want to delete{' '}
          <strong>{documentName}</strong>? This action cannot be undone.
        </p>

        {/* Action Buttons */}
        <div className="flex space-x-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isDeleting}
            className="flex-1 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
          >
            {isDeleting
              ? 'Deleting...'
              : documentName.includes('document(s)')
                ? 'Delete Documents'
                : 'Delete Document'}
          </button>
        </div>
      </div>
    </div>
  );
}
