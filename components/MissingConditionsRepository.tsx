'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import MissingConditionViewModal from './MissingConditionViewModal';
import MissingConditionEditModal from './MissingConditionEditModal';

interface MissingCondition {
  id: string;
  condition_name: string;
  user_id: string;
  session_id: string;
  original_query: string;
  status: string;
  admin_notes: string | null;
  created_at: string;
  reviewed_at: string | null;
}

interface MissingConditionsResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: MissingCondition[];
  filters: {
    status: string | null;
  };
}

export default function MissingConditionsRepository() {
  const [conditions, setConditions] = useState<MissingCondition[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(20);
  const [totalCount, setTotalCount] = useState(0);
  const [hasNext, setHasNext] = useState(false);
  const [hasPrevious, setHasPrevious] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedCondition, setSelectedCondition] = useState<MissingCondition | null>(null);

  // Fetch missing conditions
  const fetchConditions = async (page: number = 1) => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: itemsPerPage.toString(),
      });
      
      if (statusFilter) {
        params.append('status', statusFilter);
      }

      const response = await fetch(`/api/missing-conditions?${params.toString()}`);
      
      if (response.ok) {
        const data: MissingConditionsResponse = await response.json();
        setConditions(data.results || []);
        setTotalCount(data.count || 0);
        setHasNext(data.next !== null);
        setHasPrevious(data.previous !== null);
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || 'Failed to fetch missing conditions');
      }
    } catch (error) {
      console.error('Error fetching missing conditions:', error);
      toast.error('Failed to fetch missing conditions');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchConditions(currentPage);
  }, [currentPage, statusFilter]);

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'resolved':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'reviewed':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const totalPages = Math.ceil(totalCount / itemsPerPage);

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Title and Filters */}
      <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className="text-4xl font-bold text-gray-800 mb-4">
            Missing Conditions
          </h1>
          <p className="text-gray-600">
            Review and manage conditions that were not found in the database
          </p>
        </div>

        <div className="flex items-center space-x-4">
          <div className="relative">
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="border border-gray-300 rounded-md px-4 py-2 pr-8 bg-white focus:outline-none focus:ring-1 focus:ring-[#107EAA] focus:border-[#107EAA]"
            >
              <option value="">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="resolved">Resolved</option>
              <option value="reviewed">Reviewed</option>
            </select>
          </div>
        </div>
      </div>

      {/* Summary Card */}
      <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
        <div className="text-gray-600 text-sm">Total Missing Conditions</div>
        <div className="text-3xl font-bold text-gray-800 mt-2">
          {totalCount}
        </div>
      </div>

      {/* Conditions Table */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Condition Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Original Query
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Admin Notes
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Created At
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Reviewed At
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
                    colSpan={8}
                    className="px-6 py-4 text-center text-gray-500"
                  >
                    Loading missing conditions...
                  </td>
                </tr>
              ) : conditions.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="px-6 py-4 text-center text-gray-500"
                  >
                    No missing conditions found
                  </td>
                </tr>
              ) : (
                conditions.map((condition) => (
                  <tr key={condition.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {condition.condition_name}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-500 max-w-md truncate" title={condition.original_query}>
                        {condition.original_query}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {condition.user_id}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeColor(
                          condition.status
                        )}`}
                      >
                        {condition.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-500 max-w-md truncate" title={condition.admin_notes || ''}>
                        {condition.admin_notes || 'N/A'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(condition.created_at)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(condition.reviewed_at)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => {
                            setSelectedCondition(condition);
                            setViewModalOpen(true);
                          }}
                          className="text-blue-600 hover:text-blue-900 cursor-pointer"
                          title="View details"
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
                        <button
                          onClick={() => {
                            setSelectedCondition(condition);
                            setEditModalOpen(true);
                          }}
                          className="text-yellow-600 hover:text-yellow-900 cursor-pointer"
                          title="Edit condition"
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
              <span className="text-sm text-gray-700">
                Showing {conditions.length} of {totalCount} results
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={!hasPrevious || isLoading}
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
                Page {currentPage} of {totalPages || 1}
              </span>
              <button
                onClick={() => setCurrentPage(currentPage + 1)}
                disabled={!hasNext || isLoading}
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

      {/* View Modal */}
      <MissingConditionViewModal
        isOpen={viewModalOpen}
        onClose={() => {
          setViewModalOpen(false);
          setSelectedCondition(null);
        }}
        condition={selectedCondition}
      />

      {/* Edit Modal */}
      <MissingConditionEditModal
        isOpen={editModalOpen}
        onClose={() => {
          setEditModalOpen(false);
          setSelectedCondition(null);
        }}
        condition={selectedCondition}
        onUpdate={() => {
          fetchConditions(currentPage);
          setEditModalOpen(false);
          setSelectedCondition(null);
        }}
      />
    </main>
  );
}

