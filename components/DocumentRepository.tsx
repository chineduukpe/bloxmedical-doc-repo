'use client';

import { useState, useEffect } from 'react';
import DocumentModal from './DocumentModal';
import DeleteConfirmationModal from './DeleteConfirmationModal';
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

interface DocumentRepositoryProps {
  userRole?: 'ADMIN' | 'COLLABORATOR';
}

export default function DocumentRepository({
  userRole = 'COLLABORATOR',
}: DocumentRepositoryProps) {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDocument, setEditingDocument] = useState<Document | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [documentToDelete, setDocumentToDelete] = useState<Document | null>(
    null
  );
  const [isDeleting, setIsDeleting] = useState(false);
  const [isPDFModalOpen, setIsPDFModalOpen] = useState(false);
  const [pdfDocument, setPdfDocument] = useState<Document | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [users, setUsers] = useState<any[]>([]);
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

    // Generate a file URL (you may need to adjust this based on your actual file serving setup)
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

  // Fetch users
  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/users');
      if (response.ok) {
        const data = await response.json();
        setUsers(data);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  useEffect(() => {
    fetchDocuments(currentPage, itemsPerPage);
    fetchUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, itemsPerPage]);

  // Filter documents based on search term (client-side filtering on fetched documents)
  const filteredDocuments = documents.filter(
    (doc) =>
      doc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Use server-side pagination from API response
  const totalPages = pagination?.total_pages || 1;
  const paginatedDocuments = filteredDocuments; // Documents are already paginated from server

  // Reset to first page when search term changes
  useEffect(() => {
    if (searchTerm) {
      // For search, we might want to fetch all documents or implement server-side search
      // For now, we'll just filter client-side on the current page
    } else {
      setCurrentPage(1);
    }
  }, [searchTerm]);

  // Calculate summary statistics
  const totalDocuments = pagination?.total_documents || documents.length;
  const cardiologyCount = documents.filter(
    (doc) => doc.category === 'Cardiology'
  ).length;
  const gastrointestinalCount = documents.filter(
    (doc) => doc.category === 'Gastrointestinal'
  ).length;
  const urgentCareCount = documents.filter(
    (doc) => doc.category === 'Urgent Care'
  ).length;

  const handleAddDocument = async (documentData: any) => {
    try {
      const formData = new FormData();
      formData.append('name', documentData.name);
      formData.append('description', documentData.description);
      formData.append('category', documentData.category);
      if (documentData.file) {
        formData.append('file', documentData.file);
      }

      const response = await fetch('/api/documents', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        await fetchDocuments(currentPage, itemsPerPage);
        setIsModalOpen(false);
        toast.success('Document uploaded successfully!');
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || 'Failed to create document');
      }
    } catch (error) {
      console.error('Error creating document:', error);
      toast.error('Failed to upload document');
    }
  };

  const handleEditDocument = async (documentData: any) => {
    if (!editingDocument) return;

    try {
      const formData = new FormData();
      formData.append('name', documentData.name);
      formData.append('description', documentData.description);
      formData.append('category', documentData.category);
      if (documentData.file) {
        formData.append('file', documentData.file);
      }

      const response = await fetch(`/api/documents/${editingDocument.id}`, {
        method: 'PUT',
        body: formData,
      });

      if (response.ok) {
        await fetchDocuments(currentPage, itemsPerPage);
        setEditingDocument(null);
        setIsModalOpen(false);
        toast.success('Document updated successfully!');
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || 'Failed to update document');
      }
    } catch (error) {
      console.error('Error updating document:', error);
      toast.error('Failed to update document');
    }
  };

  const handleDeleteClick = (document: Document) => {
    setDocumentToDelete(document);
    setIsDeleteModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!documentToDelete) return;

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/documents/${documentToDelete.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        await fetchDocuments(currentPage, itemsPerPage);
        setIsDeleteModalOpen(false);
        setDocumentToDelete(null);
        toast.success('Document deleted successfully!');
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || 'Failed to delete document');
      }
    } catch (error) {
      console.error('Error deleting document:', error);
      toast.error('Failed to delete document');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteCancel = () => {
    setIsDeleteModalOpen(false);
    setDocumentToDelete(null);
  };

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

  const truncateDescription = (description: string, maxWords: number = 15) => {
    const words = description.split(' ');
    if (words.length <= maxWords) {
      return description;
    }
    return words.slice(0, maxWords).join(' ') + '...';
  };

  const formatUserDisplay = () => {
    if (users.length === 0) {
      return 'No users';
    }

    if (users.length === 1) {
      return users[0].name || users[0].email;
    }

    if (users.length === 2) {
      return `${users[0].name || users[0].email}, ${
        users[1].name || users[1].email
      }`;
    }

    // More than 2 users
    const firstTwo = users.slice(0, 2);
    const othersCount = users.length - 2;
    return `${firstTwo[0].name || firstTwo[0].email}, ${
      firstTwo[1].name || firstTwo[1].email
    } +${othersCount} others`;
  };

  const formatFileType = (fileType: string | undefined) => {
    if (!fileType) return 'Unknown';
    const extension = fileType.split('/')[1]?.toUpperCase();
    return extension || 'Unknown';
  };

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Title, Collaborators, Search and Add Document */}
      <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className="text-4xl font-bold text-gray-800 mb-4">
            Document Repository
          </h1>
          <div className="flex items-center space-x-2">
            <div className="flex -space-x-2">
              <div className="w-8 h-8 bg-blue-200 rounded-full border-2 border-white"></div>
              <div className="w-8 h-8 bg-green-200 rounded-full border-2 border-white"></div>
              <div className="w-8 h-8 bg-purple-200 rounded-full border-2 border-white"></div>
              <div className="w-8 h-8 bg-yellow-200 rounded-full border-2 border-white"></div>
            </div>
            <span className="text-gray-600 text-sm">{formatUserDisplay()}</span>
          </div>
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
              placeholder="Search"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="block w-80 pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-[#107EAA] focus:border-[#107EAA]"
            />
          </div>
          {userRole === 'ADMIN' && (
            <button
              onClick={() => setIsModalOpen(true)}
              className="bg-[#107EAA] text-white px-4 py-2 rounded-md flex items-center space-x-2 hover:bg-[#0e6b8f] cursor-pointer"
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
                  d="M12 4v16m8-8H4"
                />
              </svg>
              <span>Add New Document</span>
            </button>
          )}
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
            {cardiologyCount}
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="text-gray-600 text-sm">Gastrointestinal</div>
          <div className="text-3xl font-bold text-gray-800 mt-2">
            {gastrointestinalCount}
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="text-gray-600 text-sm">Urgent Care</div>
          <div className="text-3xl font-bold text-gray-800 mt-2">
            {urgentCareCount}
          </div>
        </div>
      </div>

      {/* Document Table */}
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
                    Loading documents...
                  </td>
                </tr>
              ) : paginatedDocuments.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-6 py-4 text-center text-gray-500"
                  >
                    No documents found
                  </td>
                </tr>
              ) : (
                paginatedDocuments.map((document) => (
                  <tr key={document.id}>
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
                        {truncateDescription(document.description)}
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
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleViewDocument(document)}
                          className="text-[#107EAA] hover:text-[#0e6b8f] cursor-pointer"
                          title="View document"
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
                        </button>
                        {userRole === 'ADMIN' && (
                          <>
                            <button
                              onClick={() => {
                                setEditingDocument(document);
                                setIsModalOpen(true);
                              }}
                              className="text-yellow-600 hover:text-yellow-900 cursor-pointer"
                              title="Edit document"
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
                                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                                />
                              </svg>
                            </button>
                            <button
                              onClick={() => handleDeleteClick(document)}
                              className="text-red-600 hover:text-red-900 cursor-pointer"
                              title="Delete document"
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
                                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                />
                              </svg>
                            </button>
                          </>
                        )}
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
                Page {currentPage} of {totalPages} (
                {pagination?.total_documents || 0} total)
              </span>
              <button
                onClick={() => {
                  const newPage = Math.min(totalPages, currentPage + 1);
                  fetchDocuments(newPage, itemsPerPage);
                }}
                disabled={!pagination?.has_next || currentPage === totalPages}
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

      {/* Document Modal */}
      <DocumentModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingDocument(null);
        }}
        onSubmit={editingDocument ? handleEditDocument : handleAddDocument}
        document={editingDocument}
        isEditing={!!editingDocument}
      />

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={handleDeleteCancel}
        onConfirm={handleDeleteConfirm}
        documentName={documentToDelete?.name || ''}
        isDeleting={isDeleting}
      />

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
