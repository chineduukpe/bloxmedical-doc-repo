'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';

interface ImageUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function ImageUploadModal({
  isOpen,
  onClose,
  onSuccess,
}: ImageUploadModalProps) {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [fileError, setFileError] = useState<string>('');
  const [previews, setPreviews] = useState<string[]>([]);

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      setSelectedFiles([]);
      setFileError('');
      setPreviews([]);
    }
  }, [isOpen]);

  // Generate previews for selected files
  useEffect(() => {
    if (selectedFiles.length > 0) {
      const newPreviews: string[] = [];
      selectedFiles.forEach((file) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          newPreviews.push(reader.result as string);
          if (newPreviews.length === selectedFiles.length) {
            setPreviews([...newPreviews]);
          }
        };
        reader.readAsDataURL(file);
      });
    } else {
      setPreviews([]);
    }
  }, [selectedFiles]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setFileError('');

    if (files.length === 0) {
      return;
    }

    // Validate file types
    const allowedTypes = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif',
      'image/webp',
    ];
    const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];

    const invalidFiles: string[] = [];
    const validFiles: File[] = [];

    files.forEach((file) => {
      const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
      const isValidType = allowedTypes.includes(file.type.toLowerCase());
      const isValidExtension = allowedExtensions.includes(fileExtension);

      if (!isValidType && !isValidExtension) {
        invalidFiles.push(file.name);
      } else {
        validFiles.push(file);
      }
    });

    if (invalidFiles.length > 0) {
      setFileError(
        `Invalid file types: ${invalidFiles.join(', ')}. Only image files (JPEG, PNG, GIF, WEBP) are allowed.`
      );
    }

    if (validFiles.length > 0) {
      setSelectedFiles((prev) => [...prev, ...validFiles]);
    }
  };

  const removeFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
    setPreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (selectedFiles.length === 0) {
      setFileError('Please select at least one image');
      return;
    }

    setIsUploading(true);
    setFileError('');

    try {
      const formData = new FormData();
      selectedFiles.forEach((file) => {
        formData.append('files', file);
      });

      const response = await fetch('/api/images', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to upload images');
      }

      const data = await response.json();
      
      // Reset form
      setSelectedFiles([]);
      setPreviews([]);
      
      // Close modal
      onClose();
      
      // Show success message
      toast.success(`Successfully uploaded ${data.count || selectedFiles.length} image(s)!`);
      
      // Trigger refresh
      onSuccess();
    } catch (error: any) {
      console.error('Error uploading images:', error);
      setFileError(error.message || 'Failed to upload images');
    } finally {
      setIsUploading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 backdrop-blur-md bg-black/20 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Upload Medical Images</h2>
          <button
            onClick={onClose}
            disabled={isUploading}
            className="text-gray-500 hover:text-gray-700 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
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
              Images <span className="text-red-500">*</span>
            </label>
            <input
              type="file"
              onChange={handleFileChange}
              multiple
              accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-[#107EAA] ${
                fileError ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {fileError && (
              <p className="mt-1 text-sm text-red-600">{fileError}</p>
            )}
            <p className="mt-1 text-xs text-gray-500">
              You can select multiple images. Supported formats: JPEG, PNG, GIF, WEBP
            </p>
          </div>

          {/* Preview selected files */}
          {selectedFiles.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Selected Images ({selectedFiles.length})
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {selectedFiles.map((file, index) => (
                  <div key={index} className="relative group">
                    <div className="aspect-square rounded-lg overflow-hidden border border-gray-300 bg-gray-100">
                      {previews[index] ? (
                        <img
                          src={previews[index]}
                          alt={file.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <svg
                            className="w-8 h-8 text-gray-400"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                            />
                          </svg>
                        </div>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => removeFile(index)}
                      className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Remove image"
                    >
                      <svg
                        className="w-4 h-4"
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
                    <p className="mt-1 text-xs text-gray-600 truncate" title={file.name}>
                      {file.name}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={isUploading}
              className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isUploading || selectedFiles.length === 0}
              className="px-4 py-2 bg-[#107EAA] text-white rounded-md hover:bg-[#0e6b8f] disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
            >
              {isUploading
                ? `Uploading ${selectedFiles.length} image(s)...`
                : `Upload ${selectedFiles.length} Image(s)`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
