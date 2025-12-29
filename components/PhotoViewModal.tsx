'use client';

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';

interface Photo {
  id: string;
  documentId: string;
  description: string;
  fileUrl: string;
  fileType?: string;
  uploadDate: string;
  user?: {
    id: string;
    name: string | null;
    email: string;
  };
}

interface PhotoViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  documentId: string;
  documentName?: string;
}

export default function PhotoViewModal({
  isOpen,
  onClose,
  documentId,
  documentName,
}: PhotoViewModalProps) {
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);

  // Fetch photos for this document
  const {
    data: photosData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['photos', documentId],
    queryFn: async () => {
      const response = await fetch(`/api/photos?documentId=${encodeURIComponent(documentId)}`);
      if (!response.ok) {
        throw new Error('Failed to fetch photos');
      }
      return response.json();
    },
    enabled: isOpen && !!documentId,
  });

  const photos: Photo[] = photosData?.photos || [];

  useEffect(() => {
    if (error) {
      toast.error('Failed to load photos');
    }
  }, [error]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 backdrop-blur-md bg-black/20 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 w-full max-w-6xl mx-4 max-h-[90vh] overflow-y-auto">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">
              Photos{documentName && ` for ${documentName}`}
              {photos.length > 0 && (
                <span className="ml-2 text-gray-500 text-base font-normal">
                  ({photos.length})
                </span>
              )}
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

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-gray-500">Loading photos...</div>
            </div>
          ) : photos.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <svg
                className="w-16 h-16 text-gray-400 mb-4"
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
              <p className="text-gray-500 text-lg">No photos uploaded yet</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Photo Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {photos.map((photo) => (
                  <div
                    key={photo.id}
                    className="group relative cursor-pointer"
                    onClick={() => setSelectedPhoto(photo)}
                  >
                    <div className="aspect-square rounded-lg overflow-hidden border border-gray-300 bg-gray-100 hover:border-[#107EAA] transition-colors">
                      <img
                        src={photo.fileUrl}
                        alt={photo.description}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100"%3E%3Crect width="100" height="100" fill="%23ddd"/%3E%3Ctext x="50" y="50" text-anchor="middle" dy=".3em" fill="%23999"%3EImage%3C/text%3E%3C/svg%3E';
                        }}
                      />
                    </div>
                    <div className="mt-2">
                      <p className="text-sm text-gray-600 truncate" title={photo.description}>
                        {photo.description}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        {formatDate(photo.uploadDate)}
                      </p>
                      {photo.user && (
                        <p className="text-xs text-gray-400">
                          by {photo.user.name || photo.user.email}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Full-size Photo Modal */}
      {selectedPhoto && (
        <div
          className="fixed inset-0 bg-black/90 flex items-center justify-center z-[60]"
          onClick={() => setSelectedPhoto(null)}
        >
          <div className="relative max-w-7xl max-h-[90vh] p-4">
            <button
              onClick={() => setSelectedPhoto(null)}
              className="absolute top-4 right-4 text-white hover:text-gray-300 z-10 bg-black/50 rounded-full p-2"
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
            <img
              src={selectedPhoto.fileUrl}
              alt={selectedPhoto.description}
              className="max-w-full max-h-[90vh] object-contain rounded-lg"
              onClick={(e) => e.stopPropagation()}
            />
            <div className="mt-4 text-white text-center">
              <p className="text-lg font-medium">{selectedPhoto.description}</p>
              <p className="text-sm text-gray-300 mt-1">
                Uploaded {formatDate(selectedPhoto.uploadDate)}
                {selectedPhoto.user && (
                  <span> by {selectedPhoto.user.name || selectedPhoto.user.email}</span>
                )}
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

