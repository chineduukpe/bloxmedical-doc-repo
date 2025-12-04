'use client';

import { useState, useEffect } from 'react';

interface DocumentViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  fileUrl: string;
  documentName: string;
  fileType?: string;
}

export default function DocumentViewModal({
  isOpen,
  onClose,
  fileUrl,
  documentName,
  fileType,
}: DocumentViewModalProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewerUrl, setViewerUrl] = useState<string>('');

  useEffect(() => {
    if (isOpen && fileUrl) {
      setIsLoading(true);
      setError(null);

      // Determine file type and set appropriate viewer URL
      const normalizedType = fileType?.toLowerCase().trim() || '';

      if (
        normalizedType.includes('pdf') ||
        documentName.toLowerCase().endsWith('.pdf')
      ) {
        // PDF - use direct URL
        setViewerUrl(fileUrl);
      } else if (
        normalizedType.includes('wordprocessingml') ||
        normalizedType.includes('msword') ||
        documentName.toLowerCase().endsWith('.docx') ||
        documentName.toLowerCase().endsWith('.doc')
      ) {
        // DOCX/DOC - use Microsoft Office Online viewer
        const encodedUrl = encodeURIComponent(fileUrl);
        setViewerUrl(
          `https://view.officeapps.live.com/op/embed.aspx?src=${encodedUrl}`
        );
      } else if (
        normalizedType.includes('spreadsheetml') ||
        normalizedType.includes('ms-excel') ||
        documentName.toLowerCase().endsWith('.xlsx') ||
        documentName.toLowerCase().endsWith('.xls')
      ) {
        // Excel - use Microsoft Office Online viewer
        const encodedUrl = encodeURIComponent(fileUrl);
        setViewerUrl(
          `https://view.officeapps.live.com/op/embed.aspx?src=${encodedUrl}`
        );
      } else {
        // Default to direct URL
        setViewerUrl(fileUrl);
      }
    } else {
      // Reset viewerUrl when modal closes or fileUrl is empty
      setViewerUrl('');
      setIsLoading(false);
      setError(null);
    }
  }, [isOpen, fileUrl, fileType, documentName]);

  const handleLoad = () => {
    setIsLoading(false);
  };

  const handleError = () => {
    setIsLoading(false);
    const normalizedType = fileType?.toLowerCase().trim() || '';

    if (
      normalizedType.includes('pdf') ||
      documentName.toLowerCase().endsWith('.pdf')
    ) {
      setError('Failed to load PDF. Please try again.');
    } else if (
      normalizedType.includes('wordprocessingml') ||
      normalizedType.includes('msword') ||
      documentName.toLowerCase().endsWith('.docx') ||
      documentName.toLowerCase().endsWith('.doc')
    ) {
      setError(
        'Failed to load Word document. The file may be too large or the viewer service may be unavailable.'
      );
    } else if (
      normalizedType.includes('spreadsheetml') ||
      normalizedType.includes('ms-excel') ||
      documentName.toLowerCase().endsWith('.xlsx') ||
      documentName.toLowerCase().endsWith('.xls')
    ) {
      setError(
        'Failed to load Excel spreadsheet. The file may be too large or the viewer service may be unavailable.'
      );
    } else {
      setError('Failed to load document. Please try again.');
    }
  };

  if (!isOpen) return null;

  const isPDF =
    fileType?.toLowerCase().includes('pdf') ||
    documentName.toLowerCase().endsWith('.pdf');

  const isWord =
    fileType?.toLowerCase().includes('wordprocessingml') ||
    fileType?.toLowerCase().includes('msword') ||
    documentName.toLowerCase().endsWith('.docx') ||
    documentName.toLowerCase().endsWith('.doc');

  const isExcel =
    fileType?.toLowerCase().includes('spreadsheetml') ||
    fileType?.toLowerCase().includes('ms-excel') ||
    documentName.toLowerCase().endsWith('.xlsx') ||
    documentName.toLowerCase().endsWith('.xls');

  return (
    <div className="fixed inset-0 backdrop-blur-md bg-black/20 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-6xl h-[90vh] mx-4 flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2">
              {isPDF && (
                <svg
                  className="w-6 h-6 text-red-600"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z"
                    clipRule="evenodd"
                  />
                </svg>
              )}
              {isWord && (
                <svg
                  className="w-6 h-6 text-blue-600"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z"
                    clipRule="evenodd"
                  />
                </svg>
              )}
              {isExcel && (
                <svg
                  className="w-6 h-6 text-green-600"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z"
                    clipRule="evenodd"
                  />
                </svg>
              )}
            </div>
            <h2 className="text-xl font-semibold text-gray-800 truncate">
              {documentName}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 cursor-pointer p-2 hover:bg-gray-100 rounded-md transition-colors"
            title="Close preview"
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

        {/* Document Content */}
        <div className="flex-1 relative">
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-50">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#107EAA] mx-auto mb-4"></div>
                <p className="text-gray-600">
                  {isPDF && 'Loading PDF...'}
                  {isWord && 'Loading Word document...'}
                  {isExcel && 'Loading Excel spreadsheet...'}
                  {!isPDF && !isWord && !isExcel && 'Loading document...'}
                </p>
              </div>
            </div>
          )}

          {error ? (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-50">
              <div className="text-center max-w-md">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg
                    className="w-8 h-8 text-red-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
                    />
                  </svg>
                </div>
                <p className="text-red-600 font-medium mb-2">
                  Error Loading Document
                </p>
                <p className="text-gray-600 mb-4">{error}</p>
                <div className="flex space-x-3 justify-center">
                  <button
                    onClick={() => window.open(fileUrl, '_blank')}
                    className="px-6 py-3 bg-[#107EAA] text-white rounded-xl hover:bg-[#0e6b8f] cursor-pointer font-medium"
                  >
                    Open in New Tab
                  </button>
                  {(isWord || isExcel) && (
                    <button
                      onClick={() => {
                        const link = document.createElement('a');
                        link.href = fileUrl;
                        link.download = documentName;
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                      }}
                      className="px-6 py-3 bg-white border border-[#107EAA]/30 text-gray-700 rounded-xl hover:bg-gray-50 cursor-pointer font-medium"
                    >
                      Download
                    </button>
                  )}
                </div>
              </div>
            </div>
          ) : viewerUrl ? (
            <iframe
              src={viewerUrl}
              className="w-full h-full border-0"
              onLoad={handleLoad}
              onError={handleError}
              title={`Document Preview: ${documentName}`}
              allow="fullscreen"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-50">
              <div className="text-center">
                <p className="text-gray-600">No document URL available</p>
              </div>
            </div>
          )}
        </div>

        {/* Footer with actions */}
        <div className="flex justify-end items-center p-6 border-t border-gray-200 bg-gray-50">
          <div className="flex space-x-3">
            <button
              onClick={() => window.open(fileUrl, '_blank')}
              className="px-12 py-3 bg-white border border-[#107EAA]/30 text-gray-700 rounded-xl hover:bg-gray-50 cursor-pointer flex items-center space-x-3 font-medium transition-colors"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                />
              </svg>
              <span>Open in New Tab</span>
            </button>
            <button
              onClick={() => {
                const link = document.createElement('a');
                link.href = fileUrl;
                link.download = documentName;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
              }}
              className="px-12 py-3 bg-[#107EAA] text-white rounded-xl hover:bg-[#0e6b8f] cursor-pointer flex items-center space-x-3 font-medium transition-colors"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              <span>Download Document</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
