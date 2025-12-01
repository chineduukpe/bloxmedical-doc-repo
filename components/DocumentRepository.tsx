'use client';

import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import DocumentModal from './DocumentModal';
import DeleteConfirmationModal from './DeleteConfirmationModal';
import DocumentViewModal from './DocumentViewModal';
import { toast } from 'sonner';

interface Document {
  id: string;
  name: string;
  description: string;
  category: string;
  fileUrl: string;
  fileType?: string;
  uploadDate: string;
  lastEdited: string;
  embeddingStatus?: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  sizeBytes?: number;
  isIndexed?: boolean;
  lastIndexedAt?: string;
}

interface PaginationInfo {
  current_page: number;
  per_page: number;
  total_documents: number;
  total_pages: number;
  has_next: boolean;
  has_previous: boolean;
}

interface DocumentRepositoryProps {
  userRole?: 'ADMIN' | 'COLLABORATOR';
}

export default function DocumentRepository({
  userRole = 'COLLABORATOR',
}: DocumentRepositoryProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDocument, setEditingDocument] = useState<Document | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [documentToDelete, setDocumentToDelete] = useState<Document | null>(
    null
  );
  const [isPDFModalOpen, setIsPDFModalOpen] = useState(false);
  const [pdfDocument, setPdfDocument] = useState<Document | null>(null);
  const [isBulkUploading, setIsBulkUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedDocuments, setSelectedDocuments] = useState<Set<string>>(
    new Set()
  );
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(50);
  const queryClient = useQueryClient();

  // Fetch documents using TanStack Query
  const {
    data: documentsData,
    isLoading,
    error: documentsError,
  } = useQuery({
    queryKey: ['documents', currentPage, itemsPerPage],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: itemsPerPage.toString(),
      });
      const response = await fetch(`/api/documents?${params.toString()}`);
      if (!response.ok) {
        throw new Error('Failed to fetch documents');
      }
      return response.json();
    },
  });

  const documents = documentsData?.documents || [];
  const pagination = documentsData?.pagination || null;

  // Fetch users using TanStack Query
  const { data: usersData } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const response = await fetch('/api/users');
      if (!response.ok) {
        throw new Error('Failed to fetch users');
      }
      return response.json();
    },
  });

  const users = usersData || [];

  // Reset to first page when search term changes
  useEffect(() => {
    if (searchTerm) {
      setCurrentPage(1);
    }
  }, [searchTerm]);

  // Show error toast if documents fetch fails
  useEffect(() => {
    if (documentsError) {
      toast.error('Failed to fetch documents');
    }
  }, [documentsError]);

  // Filter documents based on search term
  const filteredDocuments = documents.filter(
    (doc: Document) =>
      doc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Calculate summary statistics (use pagination total if available, otherwise use filtered count)
  const totalDocuments = pagination?.total_documents || filteredDocuments.length;
  const cardiologyCount = documents.filter(
    (doc: Document) => doc.category === 'Cardiology'
  ).length;
  const gastrointestinalCount = documents.filter(
    (doc: Document) => doc.category === 'Gastrointestinal'
  ).length;
  const urgentCareCount = documents.filter(
    (doc: Document) => doc.category === 'Urgent Care'
  ).length;

  // Add document mutation
  const addDocumentMutation = useMutation({
    mutationFn: async (documentData: any) => {
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

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create document');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      setIsModalOpen(false);
      toast.success('Document uploaded successfully!');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to upload document');
    },
  });

  const handleAddDocument = async (documentData: any) => {
    addDocumentMutation.mutate(documentData);
  };

  const handleBulkUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleBulkUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) {
      return;
    }

    setIsBulkUploading(true);
    try {
      const formData = new FormData();
      for (let i = 0; i < files.length; i++) {
        formData.append('files', files[i]);
      }

      const response = await fetch('/api/documents/bulk', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        queryClient.invalidateQueries({ queryKey: ['documents'] });
        toast.success(`Successfully uploaded ${data.count} document(s)!`);
        // Reset file input
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || 'Failed to upload documents');
      }
    } catch (error) {
      console.error('Error bulk uploading documents:', error);
      toast.error('Failed to upload documents');
    } finally {
      setIsBulkUploading(false);
    }
  };

  // Edit document mutation
  const editDocumentMutation = useMutation({
    mutationFn: async ({ documentId, documentData }: { documentId: string; documentData: any }) => {
      const formData = new FormData();
      formData.append('name', documentData.name);
      formData.append('description', documentData.description);
      formData.append('category', documentData.category);
      if (documentData.file) {
        formData.append('file', documentData.file);
      }

      const response = await fetch(`/api/documents/${documentId}`, {
        method: 'PUT',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update document');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      setEditingDocument(null);
      setIsModalOpen(false);
      toast.success('Document updated successfully!');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update document');
    },
  });

  const handleEditDocument = async (documentData: any) => {
    if (!editingDocument) return;
    editDocumentMutation.mutate({ documentId: editingDocument.id, documentData });
  };

  const handleDeleteClick = (document: Document) => {
    setDocumentToDelete(document);
    setIsDeleteModalOpen(true);
  };

  // Delete document mutation
  const deleteDocumentMutation = useMutation({
    mutationFn: async ({ documentId, documentName }: { documentId: string; documentName: string }) => {
      const response = await fetch(
        `/api/documents/${documentId}?name=${encodeURIComponent(documentName)}`,
        {
          method: 'DELETE',
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete document');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      setIsDeleteModalOpen(false);
      setDocumentToDelete(null);
      toast.success('Document deleted successfully!');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete document');
    },
  });

  const isDeleting = deleteDocumentMutation.isPending;

  const handleDeleteConfirm = async () => {
    // Handle bulk delete
    if (selectedDocuments.size > 0 && !documentToDelete) {
      await handleBulkDeleteConfirm();
      return;
    }

    // Handle single delete
    if (!documentToDelete) return;

    // Remove from selection if it was selected
    setSelectedDocuments((prev) => {
      const newSet = new Set(prev);
      newSet.delete(documentToDelete.id);
      return newSet;
    });

    deleteDocumentMutation.mutate({
      documentId: documentToDelete.id,
      documentName: documentToDelete.name,
    });
  };

  const handleDeleteCancel = () => {
    setIsDeleteModalOpen(false);
    setDocumentToDelete(null);
  };

  const handleSelectDocument = (documentId: string) => {
    setSelectedDocuments((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(documentId)) {
        newSet.delete(documentId);
      } else {
        newSet.add(documentId);
      }
      return newSet;
    });
  };

  const handleSelectAll = () => {
    if (selectedDocuments.size === filteredDocuments.length) {
      setSelectedDocuments(new Set());
    } else {
      setSelectedDocuments(new Set(filteredDocuments.map((doc: Document) => doc.id)));
    }
  };

  const handleBulkDeleteClick = () => {
    if (selectedDocuments.size === 0) return;
    setIsDeleteModalOpen(true);
    setDocumentToDelete(null);
  };

  // Bulk delete mutation
  const bulkDeleteMutation = useMutation({
    mutationFn: async (documentNames: string[]) => {
      const response = await fetch('/api/documents/bulk', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ names: documentNames }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete documents');
      }

      return response.json();
    },
    onSuccess: (_, ids) => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      setSelectedDocuments(new Set());
      setIsDeleteModalOpen(false);
      toast.success(`Successfully deleted ${ids.length} document(s)!`);
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete documents');
    },
  });

  const handleBulkDeleteConfirm = async () => {
    if (selectedDocuments.size === 0) return;
    // Get document names for selected documents
    const selectedDocumentNames = documents
      .filter((doc: Document) => selectedDocuments.has(doc.id))
      .map((doc: Document) => doc.name);
    bulkDeleteMutation.mutate(selectedDocumentNames);
  };

  const isBulkDeleting = bulkDeleteMutation.isPending;

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

  const formatDateShort = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
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

    // Normalize to lowercase for comparison
    const normalizedType = fileType.toLowerCase().trim();

    // Map long MIME types to short file type names
    const mimeTypeMap: Record<string, string> = {
      // Word documents
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
        'DOCX',
      'application/msword': 'DOC',
      // PDF
      'application/pdf': 'PDF',
      // Excel spreadsheets
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':
        'XLSX',
      'application/vnd.ms-excel': 'XLS',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.template':
        'XLTX',
      'application/vnd.ms-excel.template.macroEnabled.12': 'XLTM',
      // PowerPoint presentations
      'application/vnd.openxmlformats-officedocument.presentationml.presentation':
        'PPTX',
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

  const getEmbeddingStatusBadge = (status: string | undefined) => {
    if (!status) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
          Unknown
        </span>
      );
    }

    const statusConfig: Record<
      string,
      { label: string; bgColor: string; textColor: string }
    > = {
      PENDING: {
        label: 'Pending',
        bgColor: 'bg-yellow-100',
        textColor: 'text-yellow-800',
      },
      PROCESSING: {
        label: 'Processing',
        bgColor: 'bg-blue-100',
        textColor: 'text-blue-800',
      },
      COMPLETED: {
        label: 'Completed',
        bgColor: 'bg-green-100',
        textColor: 'text-green-800',
      },
      FAILED: {
        label: 'Failed',
        bgColor: 'bg-red-100',
        textColor: 'text-red-800',
      },
    };

    const config = statusConfig[status] || statusConfig.PENDING;

    return (
      <span
        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.bgColor} ${config.textColor}`}
      >
        {config.label}
      </span>
    );
  };

  return (
    <main className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-[92px]">
      {/* Title, Collaborators, Search and Add Document */}
      <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className="text-4xl font-bold text-gray-800 mb-4">
            Database Files
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
          {/* Temporarily removed admin condition */}
          <button
            onClick={handleBulkUploadClick}
            disabled={isBulkUploading}
            className="bg-gray-600 text-white px-4 py-2 rounded-md flex items-center space-x-2 hover:bg-gray-700 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
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
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
              />
            </svg>
            <span>{isBulkUploading ? 'Uploading...' : 'Bulk Upload'}</span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".pdf,.doc,.docx,.xls,.xlsx"
            onChange={handleBulkUpload}
            className="hidden"
          />
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

      {/* Bulk Action Bar */}
      {selectedDocuments.size > 0 && (
        <div className="bg-[#107EAA] text-white px-6 py-3 rounded-lg mb-4 flex items-center justify-between">
          <span className="font-medium">
            {selectedDocuments.size} document(s) selected
          </span>
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setSelectedDocuments(new Set())}
              className="px-4 py-1.5 text-sm bg-white/20 hover:bg-white/30 rounded-md transition-colors"
            >
              Clear Selection
            </button>
            {userRole === 'ADMIN' && (
              <button
                onClick={handleBulkDeleteClick}
                className="px-4 py-1.5 text-sm bg-red-600 hover:bg-red-700 rounded-md transition-colors flex items-center space-x-2"
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
                <span>Delete Selected</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Document Table */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <style dangerouslySetInnerHTML={{ __html: `
          .table-scroll-container {
            overflow-x: auto;
            scroll-behavior: smooth;
            -webkit-overflow-scrolling: touch;
          }
          .table-scroll-container::-webkit-scrollbar {
            height: 8px;
          }
          .table-scroll-container::-webkit-scrollbar-track {
            background: #f1f1f1;
            border-radius: 4px;
          }
          .table-scroll-container::-webkit-scrollbar-thumb {
            background: #888;
            border-radius: 4px;
          }
          .table-scroll-container::-webkit-scrollbar-thumb:hover {
            background: #555;
          }
        `}} />
        <div className="table-scroll-container">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50 sticky top-0 z-10">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[50px]">
                  <input
                    type="checkbox"
                    checked={
                      filteredDocuments.length > 0 &&
                      selectedDocuments.size === filteredDocuments.length
                    }
                    onChange={handleSelectAll}
                    className="rounded border-gray-300 text-[#107EAA] focus:ring-[#107EAA] cursor-pointer"
                  />
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[150px]">
                  Name
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[200px]">
                  Description
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[120px]">
                  Category
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[100px] hidden lg:table-cell">
                  File Type
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[130px] hidden md:table-cell">
                  Upload Date
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[130px] hidden md:table-cell">
                  Last Edited
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[140px]">
                  Embedding Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[100px]">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {isLoading ? (
                <tr>
                  <td
                    colSpan={9}
                    className="px-6 py-4 text-center text-gray-500"
                  >
                    Loading documents...
                  </td>
                </tr>
              ) : filteredDocuments.length === 0 ? (
                <tr>
                  <td
                    colSpan={9}
                    className="px-6 py-4 text-center text-gray-500"
                  >
                    No documents found
                  </td>
                </tr>
              ) : (
                filteredDocuments.map((document: Document) => (
                  <tr
                    key={document.id}
                    className={
                      selectedDocuments.has(document.id)
                        ? 'bg-blue-50'
                        : ''
                    }
                  >
                    <td className="px-4 py-3 whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={selectedDocuments.has(document.id)}
                        onChange={() => handleSelectDocument(document.id)}
                        className="rounded border-gray-300 text-[#107EAA] focus:ring-[#107EAA] cursor-pointer"
                      />
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                      <div className="max-w-[150px] truncate" title={document.name}>
                        {document.name}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      <div
                        className="break-words max-w-[200px]"
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
                        {truncateDescription(document.description, 12)}
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                      <div className="max-w-[120px] truncate" title={document.category}>
                        {document.category}
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 hidden lg:table-cell">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#107EAA]/10 text-[#107EAA]">
                        {formatFileType(document.fileType)}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 hidden md:table-cell">
                      <div className="max-w-[130px]" title={formatDate(document.uploadDate)}>
                        {formatDateShort(document.uploadDate)}
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 hidden md:table-cell">
                      <div className="max-w-[130px]" title={formatDate(document.lastEdited)}>
                        {formatDateShort(document.lastEdited)}
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                      {getEmbeddingStatusBadge(document.embeddingStatus)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
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

      {/* Pagination Controls */}
      {pagination && pagination.total_pages > 1 && (
        <div className="mt-6 flex items-center justify-between bg-white px-4 py-3 rounded-lg shadow-sm">
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-700">
              Showing {((pagination.current_page - 1) * pagination.per_page) + 1} to{' '}
              {Math.min(pagination.current_page * pagination.per_page, pagination.total_documents)} of{' '}
              {pagination.total_documents} documents
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setCurrentPage(1)}
              disabled={!pagination.has_previous}
              className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              First
            </button>
            <button
              onClick={() => setCurrentPage(currentPage - 1)}
              disabled={!pagination.has_previous}
              className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <span className="px-4 py-2 text-sm text-gray-700">
              Page {pagination.current_page} of {pagination.total_pages}
            </span>
            <button
              onClick={() => setCurrentPage(currentPage + 1)}
              disabled={!pagination.has_next}
              className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
            <button
              onClick={() => setCurrentPage(pagination.total_pages)}
              disabled={!pagination.has_next}
              className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Last
            </button>
          </div>
        </div>
      )}

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
        documentName={
          selectedDocuments.size > 0 && !documentToDelete
            ? `${selectedDocuments.size} document(s)`
            : documentToDelete?.name || ''
        }
        isDeleting={isDeleting || bulkDeleteMutation.isPending}
      />

      {/* Document View Modal */}
      <DocumentViewModal
        isOpen={isPDFModalOpen}
        onClose={() => {
          setIsPDFModalOpen(false);
          setPdfDocument(null);
        }}
        fileUrl={pdfDocument?.fileUrl || ''}
        documentName={pdfDocument?.name || ''}
        fileType={pdfDocument?.fileType}
      />
    </main>
  );
}
