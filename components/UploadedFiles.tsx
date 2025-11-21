'use client';

import { useState, useEffect } from 'react';
import PDFViewModal from './PDFViewModal';
import { toast } from 'sonner';
import { aiService } from '@/lib/ai-service';

interface AIServiceDocument {
  name: string;
  size_bytes: number;
  modified: string;
  extension: string;
}

interface AIServiceResponse {
  documents: AIServiceDocument[];
  documents_folder: string;
  pagination: {
    current_page: number;
    per_page: number;
    total_documents: number;
    total_pages: number;
    has_next: boolean;
    has_previous: boolean;
  };
}

interface Document {
  id: string;
  name: string;
  description: string;
  category: string;
  fileUrl: string;
  fileType?: string;
  uploadDate: string;
  lastEdited: string;
}

export default function UploadedFiles() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isPDFModalOpen, setIsPDFModalOpen] = useState(false);
  const [pdfDocument, setPdfDocument] = useState<Document | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(50);
  const [pagination, setPagination] = useState<
    AIServiceResponse['pagination'] | null
  >(null);

  // Map AI service document to Document interface
  const mapAIDocumentToDocument = (
    aiDoc: AIServiceDocument,
    baseUrl: string
  ): Document => {
    // Extract category from filename if possible (e.g., "Cardiology- Document.docx")
    const categoryMatch = aiDoc.name.match(/^([^-]+)-/);
    const category = categoryMatch ? categoryMatch[1].trim() : 'General';

    // Generate file type from extension
    const fileType = aiDoc.extension.startsWith('.')
      ? `application/${aiDoc.extension.substring(1)}`
      : `application/${aiDoc.extension}`;

    // Generate a file URL
    const fileUrl = baseUrl
      ? `${baseUrl}/documents/${encodeURIComponent(aiDoc.name)}`
      : '';

    return {
      id: aiDoc.name, // Use name as ID since AI service doesn't provide ID
      name: aiDoc.name,
      description: `Document file: ${aiDoc.name}`,
      category: category,
      fileUrl: fileUrl,
      fileType: fileType,
      uploadDate: aiDoc.modified,
      lastEdited: aiDoc.modified,
    };
  };

  // Fetch documents from AI service
  const fetchDocuments = async (page: number = 1, limit: number = 50) => {
    try {
      setIsLoading(true);
      const response = await aiService.get<AIServiceResponse>('/documents', {
        params: {
          page,
          limit,
        },
      });

      if (response.data) {
        const baseUrl = process.env.NEXT_PUBLIC_AI_SERVICE_URL || '';
        const mappedDocuments = response.data.documents.map((doc) =>
          mapAIDocumentToDocument(doc, baseUrl)
        );
        setDocuments(mappedDocuments);
        setPagination(response.data.pagination);
        setCurrentPage(response.data.pagination.current_page);
      }
    } catch (error) {
      console.error('Error fetching documents:', error);
      toast.error('Failed to fetch documents from AI service');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments(currentPage, itemsPerPage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, itemsPerPage]);

  // Filter documents based on search term and category (client-side filtering on fetched documents)
  const filteredDocuments = documents.filter((doc) => {
    const matchesSearch =
      doc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.category.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory =
      selectedCategory === 'all' || doc.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Get unique categories for filter
  const categories = Array.from(
    new Set(documents.map((doc) => doc.category))
  ).sort();

  // Reset to first page when search term changes
  useEffect(() => {
    if (!searchTerm) {
      setCurrentPage(1);
    }
  }, [searchTerm]);

  const handleViewDocument = (document: Document) => {
    setPdfDocument(document);
    setIsPDFModalOpen(true);
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

  const formatFileType = (fileType: string | undefined) => {
    if (!fileType) return 'Unknown';
    
    // Normalize to lowercase for comparison
    const normalizedType = fileType.toLowerCase().trim();
    
    // Map long MIME types to short file type names
    const mimeTypeMap: Record<string, string> = {
      // Word documents
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'DOCX',
      'application/msword': 'DOC',
      // PDF
      'application/pdf': 'PDF',
      // Excel spreadsheets
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'XLSX',
      'application/vnd.ms-excel': 'XLS',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.template': 'XLTX',
      'application/vnd.ms-excel.template.macroEnabled.12': 'XLTM',
      // PowerPoint presentations
      'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'PPTX',
      'application/vnd.ms-powerpoint': 'PPT',
      // Text files
      'text/plain': 'TXT',
      'text/csv': 'CSV',
      // Images
      'image/jpeg': 'JPG',
      'image/png': 'PNG',
      'image/gif': 'GIF',
    };
    
    // Check if we have a mapping for this MIME type
    if (mimeTypeMap[normalizedType]) {
      return mimeTypeMap[normalizedType];
    }
    
    // Fallback: try to extract extension from MIME type
    const parts = fileType.split('/');
    if (parts.length > 1) {
      const subtype = parts[1].toUpperCase();
      // If it's a simple type like "pdf", return it as is
      if (subtype.length <= 5 && !subtype.includes('.')) {
        return subtype;
      }
      // Otherwise try to extract meaningful part
      const lastPart = subtype.split('.').pop();
      return lastPart || 'Unknown';
    }
    
    return 'Unknown';
  };

  // Calculate summary statistics
  const totalDocuments = pagination?.total_documents || documents.length;
  const categoryCounts = documents.reduce((acc, doc) => {
    acc[doc.category] = (acc[doc.category] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Title and Search */}
      <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className="text-4xl font-bold text-gray-800 mb-2">
            API Documents
          </h1>
          <p className="text-gray-600">
            View documents from the external AI service API
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
              placeholder="Search files..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="block w-80 pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-[#107EAA] focus:border-[#107EAA]"
            />
          </div>
        </div>
      </div>

      {/* Category Filter */}
      <div className="mb-6">
        <div className="flex items-center space-x-4">
          <span className="text-sm font-medium text-gray-700">Category:</span>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                selectedCategory === 'all'
                  ? 'bg-[#107EAA] text-white'
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              All ({totalDocuments})
            </button>
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  selectedCategory === category
                    ? 'bg-[#107EAA] text-white'
                    : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                }`}
              >
                {category} ({categoryCounts[category] || 0})
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="text-gray-600 text-sm">Total Documents</div>
          <div className="text-3xl font-bold text-gray-800 mt-2">
            {totalDocuments}
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="text-gray-600 text-sm">Cardiology</div>
          <div className="text-3xl font-bold text-gray-800 mt-2">
            {categoryCounts['Cardiology'] || 0}
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="text-gray-600 text-sm">Gastrointestinal</div>
          <div className="text-3xl font-bold text-gray-800 mt-2">
            {categoryCounts['Gastrointestinal'] || 0}
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="text-gray-600 text-sm">Urgent Care</div>
          <div className="text-3xl font-bold text-gray-800 mt-2">
            {categoryCounts['Urgent Care'] || 0}
          </div>
        </div>
      </div>

      {/* Files Table */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Description
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Category
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  File Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Upload Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Last Edited
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {isLoading ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-6 py-4 text-center text-gray-500"
                  >
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#107EAA]"></div>
                      <span className="ml-3">Loading documents...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredDocuments.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-6 py-4 text-center text-gray-500"
                  >
                    No documents found
                  </td>
                </tr>
              ) : (
                filteredDocuments.map((document) => (
                  <tr key={document.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {document.name}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 max-w-xs">
                      <div
                        className="break-words"
                        style={{
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                          lineHeight: '1.4',
                          maxHeight: '2.8em',
                        }}
                        title={document.description}
                      >
                        {document.description}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {document.category}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#107EAA]/10 text-[#107EAA]">
                        {formatFileType(document.fileType)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(document.uploadDate)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(document.lastEdited)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex space-x-3">
                        <button
                          onClick={() => handleViewDocument(document)}
                          className="text-[#107EAA] hover:text-[#0e6b8f] cursor-pointer flex items-center space-x-1"
                          title="View file"
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
                          href={document.fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-green-600 hover:text-green-800 cursor-pointer flex items-center space-x-1"
                          title="Download file"
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
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
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
                  fetchDocuments(1, Number(e.target.value));
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
                  fetchDocuments(newPage, itemsPerPage);
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
                {pagination?.total_documents || 0} total)
              </span>
              <button
                onClick={() => {
                  const newPage = Math.min(
                    pagination?.total_pages || 1,
                    currentPage + 1
                  );
                  fetchDocuments(newPage, itemsPerPage);
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

      {/* PDF View Modal */}
      <PDFViewModal
        isOpen={isPDFModalOpen}
        onClose={() => {
          setIsPDFModalOpen(false);
          setPdfDocument(null);
        }}
        fileUrl={pdfDocument?.fileUrl || ''}
        documentName={pdfDocument?.name || ''}
      />
    </main>
  );
}

