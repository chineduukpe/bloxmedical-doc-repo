'use client';

import { useState, useEffect } from 'react';

interface Document {
  id?: string;
  name: string;
  description: string;
  category: string;
  file?: File;
  fileUrl?: string;
  fileType?: string;
}

interface DocumentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (document: Document) => void;
  document?: Document | null;
  isEditing?: boolean;
}

const categories = [
  'Cardiology',
  'Gastrointestinal',
  'Urgent Care',
  'Respiratory',
  'Procedures',
  'Neurology',
  'Orthopaedics',
];

export default function DocumentModal({
  isOpen,
  onClose,
  onSubmit,
  document,
  isEditing = false,
}: DocumentModalProps) {
  const [formData, setFormData] = useState<Document>({
    name: document?.name || '',
    description: document?.description || '',
    category: document?.category || '',
    file: undefined,
    fileUrl: document?.fileUrl || '',
    fileType: document?.fileType || '',
  });

  const [isUploading, setIsUploading] = useState(false);
  const [fileError, setFileError] = useState<string>('');

  // Update form data when document prop changes
  useEffect(() => {
    if (document) {
      setFormData({
        name: document.name || '',
        description: document.description || '',
        category: document.category || '',
        file: undefined,
        fileUrl: document.fileUrl || '',
        fileType: document.fileType || '',
      });
    } else {
      setFormData({
        name: '',
        description: '',
        category: '',
        file: undefined,
        fileUrl: '',
        fileType: '',
      });
    }
  }, [document]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate file type on submit as well
    if (formData.file) {
      const allowedTypes = [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      ];
      const allowedExtensions = ['.pdf', '.doc', '.docx', '.xls', '.xlsx'];
      const fileExtension = '.' + formData.file.name.split('.').pop()?.toLowerCase();
      
      const isValidType = allowedTypes.includes(formData.file.type.toLowerCase());
      const isValidExtension = allowedExtensions.includes(fileExtension);
      
      if (!isValidType && !isValidExtension) {
        setFileError('Only Word documents (.doc, .docx), PDF (.pdf), and Excel files (.xls, .xlsx) are allowed.');
        return;
      }
    }
    
    setIsUploading(true);

    try {
      await onSubmit(formData);
      setFormData({
        name: '',
        description: '',
        category: '',
        file: undefined,
        fileUrl: '',
      });
      setFileError('');
      onClose();
    } catch (error) {
      console.error('Error submitting document:', error);
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setFileError('');
    
    if (file) {
      // Allowed MIME types
      const allowedTypes = [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      ];
      
      // Allowed file extensions
      const allowedExtensions = ['.pdf', '.doc', '.docx', '.xls', '.xlsx'];
      const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
      
      // Check both MIME type and file extension
      const isValidType = allowedTypes.includes(file.type.toLowerCase());
      const isValidExtension = allowedExtensions.includes(fileExtension);
      
      if (!isValidType && !isValidExtension) {
        setFileError('Only Word documents (.doc, .docx), PDF (.pdf), and Excel files (.xls, .xlsx) are allowed.');
        e.target.value = ''; // Clear the file input
        setFormData((prev) => ({ ...prev, file: undefined }));
        return;
      }
      
      setFormData((prev) => ({ ...prev, file }));
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">
            {isEditing ? 'Edit Document' : 'Add New Document'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 cursor-pointer"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Document Name
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, name: e.target.value }))
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#107EAA]"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  description: e.target.value,
                }))
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#107EAA]"
              rows={3}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Category
            </label>
            <select
              value={formData.category}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, category: e.target.value }))
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#107EAA]"
              required
            >
              <option value="">Select a category</option>
              {categories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {isEditing ? 'New File (optional)' : 'File'}
            </label>
            <input
              type="file"
              onChange={handleFileChange}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-[#107EAA] ${
                fileError ? 'border-red-500' : 'border-gray-300'
              }`}
              required={!isEditing}
              accept=".pdf,.doc,.docx,.xls,.xlsx"
            />
            {fileError && (
              <p className="mt-1 text-sm text-red-600">{fileError}</p>
            )}
            {isEditing && formData.fileType && (
              <div className="mt-2">
                <span className="text-sm text-gray-600">
                  Current file type:
                  <span className="ml-1 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-[#107EAA]/10 text-[#107EAA]">
                    {formData.fileType.split('/')[1]?.toUpperCase() ||
                      'Unknown'}
                  </span>
                </span>
              </div>
            )}
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isUploading}
              className="px-4 py-2 bg-[#107EAA] text-white rounded-md hover:bg-[#0e6b8f] disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
            >
              {isUploading ? 'Uploading...' : isEditing ? 'Update' : 'Upload'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
