'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import ImageUploadModal from './ImageUploadModal';
import ImageViewModal from './ImageViewModal';

interface AIServiceImage {
  id: string;
  filename: string;
  original_filename: string;
  public_url: string;
  condition_name: string | null;
  file_size: number;
  content_type: string;
  uploaded_at: string;
}

interface AIServiceResponse {
  images: AIServiceImage[];
  pagination?: {
    current_page: number;
    per_page: number;
    total_images: number;
    total_pages: number;
    has_next: boolean;
    has_previous: boolean;
  };
  filters?: {
    condition_name?: string | null;
  };
}

interface Image {
  id: string;
  name: string;
  originalFilename: string;
  fileUrl: string;
  conditionName: string | null;
  uploadDate: string;
  sizeBytes: number;
  fileType: string;
}

export default function ImageRepository() {
  const [images, setImages] = useState<Image[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState<Image | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(50);
  const [pagination, setPagination] = useState<
    AIServiceResponse['pagination'] | null
  >(null);

  // Map AI service image to Image interface
  const mapAIImageToImage = (aiImage: AIServiceImage): Image => {
    return {
      id: aiImage.id,
      name: aiImage.original_filename || aiImage.filename,
      originalFilename: aiImage.original_filename,
      fileUrl: aiImage.public_url,
      conditionName: aiImage.condition_name,
      uploadDate: aiImage.uploaded_at,
      sizeBytes: aiImage.file_size,
      fileType: aiImage.content_type,
    };
  };

  // Fetch images from AI service
  const fetchImages = async (page: number = 1, limit: number = 50) => {
    try {
      setIsLoading(true);
      const response = await fetch(
        `/api/images?page=${page}&limit=${limit}`
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch images');
      }

      const data: AIServiceResponse = await response.json();

      if (data.images) {
        const mappedImages = data.images.map((img) => mapAIImageToImage(img));
        setImages(mappedImages);
        setPagination(data.pagination || null);
        setCurrentPage(data.pagination?.current_page || page);
      }
    } catch (error: any) {
      console.error('Error fetching images:', error);
      toast.error(error.message || 'Failed to fetch images from AI service');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchImages(currentPage, itemsPerPage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, itemsPerPage]);

  // Filter images based on search term (client-side filtering)
  const filteredImages = images.filter((img) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      img.name.toLowerCase().includes(searchLower) ||
      img.originalFilename.toLowerCase().includes(searchLower) ||
      (img.conditionName && img.conditionName.toLowerCase().includes(searchLower))
    );
  });

  // Reset to first page when search term changes
  useEffect(() => {
    if (!searchTerm) {
      setCurrentPage(1);
    }
  }, [searchTerm]);

  const handleViewImage = (image: Image) => {
    setSelectedImage(image);
    setIsViewModalOpen(true);
  };

  const handleUploadSuccess = () => {
    fetchImages(currentPage, itemsPerPage);
  };

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

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return 'Unknown';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const formatFileType = (fileType: string | undefined) => {
    if (!fileType) return 'Unknown';
    const normalizedType = fileType.toLowerCase().trim();
    const typeMap: Record<string, string> = {
      'image/jpeg': 'JPEG',
      'image/jpg': 'JPG',
      'image/png': 'PNG',
      'image/gif': 'GIF',
      'image/webp': 'WEBP',
    };
    return typeMap[normalizedType] || normalizedType.toUpperCase();
  };

  // Calculate summary statistics
  const totalImages = pagination?.total_images || images.length;

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Title and Actions */}
      <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className="text-4xl font-bold text-gray-800 mb-2">
            Medical Images
          </h1>
          <p className="text-gray-600">
            Manage medical images from the AI service
          </p>
        </div>

        <div className="flex items-center space-x-4">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg
                className="h-5 w-5 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>
            <input
              type="text"
              placeholder="Search images..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="block w-80 pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-[#107EAA] focus:border-[#107EAA]"
            />
          </div>
          <button
            onClick={() => setIsUploadModalOpen(true)}
            className="px-4 py-2 bg-[#107EAA] text-white rounded-md hover:bg-[#0e6b8f] cursor-pointer flex items-center space-x-2"
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
                d="M12 4v16m8-8H4"
              />
            </svg>
            <span>Upload Images</span>
          </button>
        </div>
      </div>

      {/* Summary Card */}
      <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
        <div className="text-gray-600 text-sm">Total Images</div>
        <div className="text-3xl font-bold text-gray-800 mt-2">
          {totalImages}
        </div>
      </div>

      {/* Images Grid */}
      {isLoading ? (
        <div className="bg-white rounded-lg shadow-sm p-12 text-center">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#107EAA]"></div>
            <span className="ml-3 text-gray-500">Loading images...</span>
          </div>
        </div>
      ) : filteredImages.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm p-12 text-center">
          <p className="text-gray-500">
            {searchTerm ? 'No images found matching your search' : 'No images found'}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Preview
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Condition
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    File Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Size
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Upload Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredImages.map((image) => (
                  <tr key={image.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="w-16 h-16 rounded-lg overflow-hidden border border-gray-300 bg-gray-100">
                        <img
                          src={image.fileUrl}
                          alt={image.name}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.style.display = 'none';
                            const parent = target.parentElement;
                            if (parent) {
                              parent.innerHTML = `
                                <div class="w-full h-full flex items-center justify-center">
                                  <svg class="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                  </svg>
                                </div>
                              `;
                            }
                          }}
                        />
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900 max-w-xs">
                      <div className="truncate" title={image.name}>
                        {image.name}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {image.conditionName ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {image.conditionName}
                        </span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#107EAA]/10 text-[#107EAA]">
                        {formatFileType(image.fileType)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatFileSize(image.sizeBytes)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(image.uploadDate)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex space-x-3">
                        <button
                          onClick={() => handleViewImage(image)}
                          className="text-[#107EAA] hover:text-[#0e6b8f] cursor-pointer flex items-center space-x-1"
                          title="View image"
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
                              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                            />
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                            />
                          </svg>
                          <span className="text-xs">View</span>
                        </button>
                        <a
                          href={image.fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-green-600 hover:text-green-800 cursor-pointer flex items-center space-x-1"
                          title="Download image"
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
                              d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                            />
                          </svg>
                          <span className="text-xs">Download</span>
                        </a>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pagination */}
      {pagination && pagination.total_pages > 1 && (
        <div className="flex justify-center mt-8">
          <div className="bg-white rounded-lg p-4 w-fit">
            <div className="flex justify-between items-center space-x-8">
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-700">Now Showing</span>
                <select
                  value={itemsPerPage}
                  onChange={(e) => {
                    setItemsPerPage(Number(e.target.value));
                    setCurrentPage(1);
                    fetchImages(1, Number(e.target.value));
                  }}
                  className="border border-gray-300 rounded px-2 py-1 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-[#107EAA] focus:border-[#107EAA]"
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
                <span className="text-sm text-gray-700">results per page</span>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => {
                    const newPage = Math.max(1, currentPage - 1);
                    fetchImages(newPage, itemsPerPage);
                  }}
                  disabled={!pagination?.has_previous || currentPage === 1}
                  className="w-8 h-8 rounded-full border border-gray-300 bg-white flex items-center justify-center text-gray-600 hover:text-gray-800 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
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
                      d="M15 19l-7-7 7-7"
                    />
                  </svg>
                </button>
                <span className="text-sm text-gray-700">
                  Page {currentPage} of {pagination?.total_pages || 1} (
                  {pagination?.total_images || 0} total)
                </span>
                <button
                  onClick={() => {
                    const newPage = Math.min(
                      pagination?.total_pages || 1,
                      currentPage + 1
                    );
                    fetchImages(newPage, itemsPerPage);
                  }}
                  disabled={
                    !pagination?.has_next ||
                    currentPage === (pagination?.total_pages || 1)
                  }
                  className="w-8 h-8 rounded-full border border-gray-300 bg-white flex items-center justify-center text-gray-600 hover:text-gray-800 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
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
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Upload Modal */}
      <ImageUploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onSuccess={handleUploadSuccess}
      />

      {/* View Modal */}
      <ImageViewModal
        isOpen={isViewModalOpen}
        onClose={() => {
          setIsViewModalOpen(false);
          setSelectedImage(null);
        }}
        image={selectedImage}
      />
    </main>
  );
}
